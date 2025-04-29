"""
Main FastAPI application for the Questionnaire Management System.

This application provides endpoints for:
- Managing a database of questions and answers
- Processing questionnaire CSV files
- Searching the knowledge base
- Uploading and validating CSV files
"""

from fastapi import FastAPI, Request, Form, UploadFile, File, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, func, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import csv
import io
import codecs
from difflib import SequenceMatcher
import json
from datetime import datetime
from ai_processor import AIProcessor
import re
import pandas as pd
import asyncio
from asyncio import Queue
import threading

# Global progress tracking
progress_queues = {}

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./questionnaire.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Questionnaire(Base):
    """
    SQLAlchemy model representing a questionnaire entry in the database.
    
    Attributes:
        id (int): Primary key
        question (str): The question text
        answer_key (str): The answer to the question
        entity (str): The entity or system the question relates to
        comment (str, optional): Additional comments or context
        created_at (datetime): Timestamp of when the entry was created
    """
    __tablename__ = "questionnaires"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer_key = Column(Text, nullable=False)
    entity = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """
        Convert the questionnaire entry to a dictionary.
        
        Returns:
            dict: Dictionary representation of the questionnaire entry
        """
        return {
            "id": self.id,
            "question": self.question,
            "answer_key": self.answer_key,
            "entity": self.entity,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

def init_db():
    """
    Initialize the database with the updated schema.
    This will create the database file and tables if they don't exist.
    """
    try:
        # Only create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        raise

# Initialize the database when the application starts
init_db()

app = FastAPI()

# Configure CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006"],  # Allow all development ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI processor
ai_processor = AIProcessor('questionnaire.db')

def similar(a: str, b: str) -> float:
    """
    Calculate similarity ratio between two strings.
    
    Args:
        a (str): First string to compare
        b (str): Second string to compare
        
    Returns:
        float: Similarity ratio between 0 and 1
    """
    # Convert to lowercase and remove punctuation
    a = re.sub(r'[^\w\s]', '', a.lower())
    b = re.sub(r'[^\w\s]', '', b.lower())
    
    # Split into words
    a_words = set(a.split())
    b_words = set(b.split())
    
    # Calculate word overlap
    overlap = len(a_words.intersection(b_words))
    total = len(a_words.union(b_words))
    
    if total == 0:
        return 0.0
    
    # Calculate sequence similarity
    sequence_similarity = SequenceMatcher(None, a, b).ratio()
    
    # Combine word overlap and sequence similarity
    return (overlap / total + sequence_similarity) / 2

def find_similar_question(db, question: str, entity: str = None, threshold: float = 0.6):
    """
    Find similar questions in the database with a similarity threshold.
    Only considers questions as similar if they have both similar text AND the same entity (if entity is provided).
    
    Args:
        db: Database session
        question (str): Question to find similar matches for
        entity (str, optional): Entity to match against
        threshold (float): Minimum similarity ratio (default: 0.6)
        
    Returns:
        Questionnaire or None: Matching question if found, None otherwise
    """
    all_questions = db.query(Questionnaire).all()
    best_match = None
    best_similarity = threshold
    
    for q in all_questions:
        # If entity is provided, only check questions with matching entity
        if entity and q.entity != entity:
            continue
            
        similarity = similar(question, q.question)
        if similarity > best_similarity:
            best_similarity = similarity
            best_match = q
    
    return best_match

@app.get("/questions")
async def get_questions():
    """
    Retrieve all questions from the database.
    
    Returns:
        dict: Dictionary containing list of all questions
    """
    db = SessionLocal()
    try:
        questionnaires = db.query(Questionnaire).all()
        return {"questions": [q.to_dict() for q in questionnaires]}
    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error fetching questions from database: {str(e)}"}
        )
    finally:
        db.close()

@app.post("/add")
async def add_questionnaire(question: str = Form(...), answer_key: str = Form(...), entity: str = Form(None)):
    """
    Add a new question-answer pair to the database.
    
    Args:
        question (str): The question text
        answer_key (str): The answer to the question
        entity (str, optional): The entity or system the question relates to
        
    Returns:
        dict: Success response or error message
    """
    db = SessionLocal()
    try:
        # Check for similar questions (only within same entity)
        similar_q = find_similar_question(db, question, entity)
        if similar_q:
            return JSONResponse(
                status_code=400,
                content={
                    "message": "A similar question already exists for this entity",
                    "similar_question": similar_q.to_dict()
                }
            )
        
        new_questionnaire = Questionnaire(
            question=question,
            answer_key=answer_key,
            entity=entity
        )
        db.add(new_questionnaire)
        db.commit()
        db.refresh(new_questionnaire)
        return new_questionnaire.to_dict()
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"message": f"Error adding questionnaire: {str(e)}"}
        )
    finally:
        db.close()

async def progress_event_generator(client_id: str):
    """
    Generator for SSE events to track upload progress for a specific client
    """
    if client_id not in progress_queues:
        progress_queues[client_id] = Queue()
    
    try:
        while True:
            try:
                # Get progress update from queue with timeout
                progress = await asyncio.wait_for(progress_queues[client_id].get(), timeout=1.0)
                if progress is None:  # None is our signal to stop
                    break
                # Format the event data properly
                event_data = json.dumps(progress)
                yield f"data: {event_data}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive comment every second
                yield ": keepalive\n\n"
            except Exception as e:
                print(f"Error in progress_event_generator: {str(e)}")
                break
    finally:
        # Cleanup when client disconnects
        if client_id in progress_queues:
            del progress_queues[client_id]

@app.get("/upload-progress")
async def upload_progress_endpoint(request: Request, client_id: str = None):
    """
    SSE endpoint for tracking upload progress
    """
    if not client_id:
        client_id = request.headers.get('x-client-id') or request.query_params.get('client_id') or str(id(request))
    
    return StreamingResponse(
        progress_event_generator(client_id),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )

async def send_progress_update(client_id: str, current: int, total: int, phase: str, processed_result=None):
    """Send a progress update to the client."""
    if client_id in progress_queues:
        data = {
            "current_entry": current,
            "total_entries": total,
            "phase": phase,
            "processed_result": processed_result
        }
        await progress_queues[client_id].put(data)

@app.post("/upload-csv")
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: list[UploadFile] = File(description="Multiple files as UploadFile"),
    request: Request = None
):
    """
    Upload and process CSV files containing questions and answers.
    Tracks progress of processing each entry.
    """
    client_id = request.headers.get('x-client-id') or str(id(request))
    if client_id not in progress_queues:
        progress_queues[client_id] = Queue()
    
    if not file:
        return JSONResponse(
            status_code=400,
            content={"message": "No file uploaded"}
        )
    
    total_imported = 0
    total_duplicates = 0
    results = []
    
    for uploaded_file in file:
        if not uploaded_file.filename.endswith('.csv'):
            return JSONResponse(
                status_code=400,
                content={"message": f"File {uploaded_file.filename} is not a CSV file"}
            )
        
        try:
            content = await uploaded_file.read()
            content_str = None
            
            # Try different encodings
            for encoding in ['utf-8-sig', 'utf-8', 'latin1']:
                try:
                    content_str = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if not content_str:
                return JSONResponse(
                    status_code=400,
                    content={"message": f"Could not decode file {uploaded_file.filename}"}
                )
            
            # Parse CSV
            csv_file = io.StringIO(content_str)
            reader = csv.DictReader(csv_file)
            
            # Get field mapping
            headers = reader.fieldnames
            if not headers:
                return JSONResponse(
                    status_code=400,
                    content={"message": "CSV file has no headers"}
                )
            
            field_mapping = {}
            for header in headers:
                header_lower = header.lower()
                if 'question' in header_lower:
                    field_mapping['question'] = header
                elif any(key in header_lower for key in ['answer', 'response']):
                    field_mapping['answer_key'] = header
                elif 'entity' in header_lower:
                    field_mapping['entity'] = header
                elif 'comment' in header_lower:
                    field_mapping['comment'] = header
            
            if 'question' not in field_mapping:
                return JSONResponse(
                    status_code=400,
                    content={"message": "CSV must contain a question column"}
                )
            
            # Count total entries
            csv_file.seek(0)
            total_entries = sum(1 for _ in csv.DictReader(io.StringIO(content_str)))
            
            # Send initial progress
            await send_progress_update(client_id, 0, total_entries, "Preparing")
            
            # Reset file pointer and skip header
            csv_file.seek(0)
            reader = csv.DictReader(csv_file)
            
            db = SessionLocal()
            questionnaires = []
            duplicates = []
            
            try:
                for i, row in enumerate(reader, 1):
                    # Update progress
                    await send_progress_update(client_id, i, total_entries, "Reading File")
                    
                    # Create a new dict with normalized keys
                    normalized_row = {}
                    for norm_key, orig_key in field_mapping.items():
                        if orig_key in row:
                            normalized_row[norm_key] = row[orig_key].strip() if isinstance(row[orig_key], str) else row[orig_key]
                    
                    question = normalized_row.get('question', '')
                    answer_key = normalized_row.get('answer_key', '')
                    entity = normalized_row.get('entity', '')
                    comment = normalized_row.get('comment', '')
                    
                    if not question or not answer_key:
                        continue
                    
                    # Check for duplicates
                    similar_q = find_similar_question(db, question, entity)
                    if similar_q:
                        duplicates.append({
                            "question": question,
                            "similar_to": similar_q.to_dict()
                        })
                        total_duplicates += 1
                        continue
                    
                    new_questionnaire = Questionnaire(
                        question=question,
                        answer_key=answer_key,
                        entity=entity if entity else None,
                        comment=comment if comment else None
                    )
                    db.add(new_questionnaire)
                    questionnaires.append(new_questionnaire)
                    
                    # Small delay to prevent overwhelming the event stream
                    await asyncio.sleep(0.01)
                
                db.commit()
                for q in questionnaires:
                    db.refresh(q)
                
                imported_count = len(questionnaires)
                total_imported += imported_count
                
                result = {
                    "filename": uploaded_file.filename,
                    "imported": imported_count,
                    "duplicates": duplicates
                }
                results.append(result)
                
            finally:
                db.close()
                
        except Exception as e:
            # Signal end of progress updates
            await send_progress_update(client_id, 0, 0, "Error")
            return JSONResponse(
                status_code=500,
                content={"message": f"Error processing file {uploaded_file.filename}: {str(e)}"}
            )
    
    # Signal end of progress updates
    await send_progress_update(client_id, 0, 0, "Complete")
    
    return {
        "message": f"Successfully imported {total_imported} questions. Found {total_duplicates} duplicates.",
        "results": results
    }

@app.post("/process-questionnaire")
async def process_questionnaire(
    file: UploadFile = File(...),
    threshold: float = 0.6,
    entity: str = None,
    request: Request = None
):
    """
    Process a questionnaire CSV file and find matching answers from the knowledge base.
    """
    client_id = request.headers.get('x-client-id', str(id(request)))
    if client_id not in progress_queues:
        progress_queues[client_id] = Queue()

    if not file.filename.endswith('.csv'):
        return JSONResponse(
            status_code=400,
            content={"message": "Only CSV files are allowed"}
        )
    
    try:
        # Initial progress update
        await send_progress_update(client_id, 0, 0, "Preparing")
        
        # Read and process the file
        content = await file.read()
        
        # Try different encodings
        content_str = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin1', 'cp1252']:
            try:
                content_str = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if content_str is None:
            return JSONResponse(
                status_code=400,
                content={"message": "Could not decode the CSV file"}
            )
        
        # Process CSV headers and setup
        csv_file = io.StringIO(content_str)
        reader = csv.reader(csv_file)
        
        try:
            headers = next(reader)
            headers = [h.strip() for h in headers]
        except StopIteration:
            return JSONResponse(
                status_code=400,
                content={"message": "CSV file is empty"}
            )
        
        # Find column indices
        question_idx = next((i for i, h in enumerate(headers) if 'question' in h.lower()), None)
        answer_idx = next((i for i, h in enumerate(headers) if 'answer' in h.lower()), None)
        comment_idx = next((i for i, h in enumerate(headers) if 'comment' in h.lower()), None)
        
        if question_idx is None:
            return JSONResponse(
                status_code=400,
                content={"message": "CSV must contain a question column"}
            )
        
        # Add missing columns if needed
        if answer_idx is None:
            headers.append('answer')
            answer_idx = len(headers) - 1
        if comment_idx is None:
            headers.append('comment')
            comment_idx = len(headers) - 1
        
        # Count total questions first
        csv_file.seek(0)
        next(reader)  # Skip header
        total_questions = sum(1 for row in reader if row and row[question_idx].strip())
        
        # Send initial count
        await send_progress_update(client_id, 0, total_questions, "Reading Questions")
        
        # Read all questions
        questions = []
        rows = []
        csv_file.seek(0)
        next(reader)  # Skip header
        current_question = 0
        
        # First phase: Read all questions
        for row in reader:
            if not row:  # Skip empty rows
                continue
            
            # Ensure row has enough columns
            row.extend([''] * (len(headers) - len(row)))
            
            question = row[question_idx].strip()
            if question:
                current_question += 1
                questions.append({
                    'question': question,
                    'answer': row[answer_idx].strip() if answer_idx < len(row) else '',
                    'comment': row[comment_idx].strip() if comment_idx < len(row) else ''
                })
                rows.append(row)
                
                # Send progress update for reading phase
                await send_progress_update(client_id, current_question, total_questions, "Reading Questions")
                await asyncio.sleep(0.01)  # Small delay to prevent overwhelming
        
        if not questions:
            return JSONResponse(
                status_code=400,
                content={"message": "No questions found in the CSV file"}
            )
        
        # Second phase: Process questions with AI
        results = []
        
        for i, q in enumerate(questions, 1):
            try:
                # Send progress update before processing each question
                await send_progress_update(client_id, i, total_questions, "AI Processing")
                
                # Process the question
                if q['answer']:
                    best_match = {
                        "question": q['question'],
                        "answer_key": q['answer'],
                        "comment": q['comment'],
                        "similarity": 1.0,
                        "is_ai_generated": False
                    }
                else:
                    ai_result = ai_processor.process_question(q['question'])
                    if ai_result.get('answer') and ai_result.get('answer') != "No similar questions found in the knowledge base.":
                        best_match = {
                            "question": q['question'],
                            "answer_key": ai_result['answer'],
                            "comment": f"Confidence: {ai_result['confidence']:.2%}",
                            "similarity": ai_result['confidence'],
                            "is_ai_generated": True
                        }
                    else:
                        best_match = None

                result = {
                    "input_question": q['question'],
                    "best_match": best_match
                }
                results.append(result)
                
                # Send the individual result after processing
                await send_progress_update(
                    client_id, 
                    i, 
                    total_questions, 
                    "AI Processing",
                    processed_result=result
                )
                
                # Small delay to prevent overwhelming the event stream
                await asyncio.sleep(0.01)
            except Exception as e:
                print(f"Error processing question {i}: {str(e)}")
                # Continue processing other questions even if one fails
                continue
        
        # Send progress update for output generation phase
        await send_progress_update(client_id, total_questions, total_questions, "Generating Output")
        
        # Create output CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        
        # Send completion progress update
        await send_progress_update(client_id, total_questions, total_questions, "Complete")
        
        # Signal end of progress updates
        if client_id in progress_queues:
            await progress_queues[client_id].put(None)
            del progress_queues[client_id]  # Clean up the queue
        
        return {
            "results": results,
            "csv_content": output.getvalue(),
            "filename": f"processed_{file.filename}"
        }
        
    except Exception as e:
        # Signal end of progress updates on error
        if client_id in progress_queues:
            await progress_queues[client_id].put(None)
            del progress_queues[client_id]  # Clean up the queue
        print(f"Error processing questionnaire: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error processing questionnaire: {str(e)}"}
        )

@app.get("/search")
async def search_questions(query: str, entity: str = None):
    """
    Search for questions in the knowledge base.
    
    Args:
        query (str): Search terms to look for
        entity (str, optional): Entity to filter results by
        
    Returns:
        dict: List of matching questions and answers
    """
    if not query:
        return JSONResponse(
            status_code=400,
            content={"message": "Search query is required"}
        )
    
    try:
        db = SessionLocal()
        search_terms = query.lower().split()
        
        # Start with base query
        questions_query = db.query(Questionnaire)
        
        # Apply entity filter if specified
        if entity and entity.strip():
            questions_query = questions_query.filter(Questionnaire.entity == entity)
        
        all_questions = questions_query.all()
        
        results = []
        for q in all_questions:
            question_text = q.question.lower()
            answer_text = q.answer_key.lower() if q.answer_key else ""
            comment_text = q.comment.lower() if q.comment else ""
            
            if any(term in question_text or term in answer_text or term in comment_text 
                  for term in search_terms):
                results.append({
                    "question": q.question,
                    "answer_key": q.answer_key,
                    "entity": q.entity,
                    "comment": q.comment,
                    "created_at": q.created_at.isoformat() if q.created_at else None
                })
        
        return {"results": results}
    except Exception as e:
        print(f"Error searching questions: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error searching questions: {str(e)}"}
        )
    finally:
        db.close()

@app.post("/api/generate-answer")
async def generate_answer(request: Request):
    """
    Generate an answer for a given question using AI processing.
    
    Args:
        request (Request): The request object containing the question
        
    Returns:
        dict: Generated answer and related information
    """
    try:
        data = await request.json()
        question = data.get('question')
        
        if not question:
            return JSONResponse(
                status_code=400,
                content={"error": "Question is required"}
            )
        
        # Process the question using AI
        result = ai_processor.process_question(question)
        return result
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/questionnaire-progress")
async def questionnaire_progress(request: Request, client_id: str):
    """
    Server-Sent Events endpoint for progress updates.
    """
    if client_id not in progress_queues:
        progress_queues[client_id] = Queue()

    async def event_generator():
        try:
            while True:
                if client_id in progress_queues:
                    data = await progress_queues[client_id].get()
                    if data is None:  # End of processing signal
                        break
                    yield f"data: {json.dumps(data)}\n\n"
                else:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            if client_id in progress_queues:
                del progress_queues[client_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 