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
from sqlalchemy import create_engine, Column, Integer, String, Text, func, DateTime, desc, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import csv
import io
import codecs
from difflib import SequenceMatcher
import json
from datetime import datetime, timedelta
from ai_processor import AIProcessor
import re
import pandas as pd
import asyncio
from asyncio import Queue
import threading
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global progress tracking
progress_queues = {}

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://kmsuser:kmspassword@db:5432/kmsdb"
)

engine = create_engine(DATABASE_URL)
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

class ProcessedQuestionnaire(Base):
    """
    SQLAlchemy model representing a processed questionnaire entry in the backlog.
    
    Attributes:
        id (int): Primary key
        filename (str): Original filename of the questionnaire
        status (str): Status of processing (processing, completed, failed)
        questions_count (int): Total number of questions in the file
        processed_count (int): Number of questions processed
        success_rate (float): Percentage of questions successfully processed
        unaccepted_answers_count (int): Number of answers that need review
        entity (str): The entity the questionnaire was processed against
        error_message (str): Error message if processing failed
        created_at (datetime): When the questionnaire was uploaded
        downloaded (bool): Whether the processed file has been downloaded
        can_download (bool): Whether the file is ready for download
        csv_content (str): The processed CSV file content
        low_confidence_answers (Text): JSON string containing low confidence answers and their status
        edited_answers (Text): JSON string containing edited answers before download
    """
    __tablename__ = "processed_questionnaires"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    status = Column(String, nullable=False)
    questions_count = Column(Integer, default=0)
    processed_count = Column(Integer, default=0)
    success_rate = Column(Integer, default=0)
    unaccepted_answers_count = Column(Integer, default=0)
    entity = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    downloaded = Column(Boolean, default=False)
    can_download = Column(Boolean, default=False)
    csv_content = Column(Text, nullable=True)
    low_confidence_answers = Column(Text, nullable=True)  # JSON string
    edited_answers = Column(Text, nullable=True)  # JSON string

    def to_dict(self):
        """Convert the processed questionnaire entry to a dictionary."""
        low_confidence_answers = json.loads(self.low_confidence_answers) if self.low_confidence_answers else []
        # Count answers that have confidence < 50% and haven't been accepted
        unaccepted_low_conf_count = len([
            answer for answer in low_confidence_answers 
            if answer['confidence'] < 0.5 and not answer.get('accepted', False)
        ])
        
        return {
            "id": self.id,
            "filename": self.filename,
            "status": self.status,
            "questions_count": self.questions_count,
            "processed_count": self.processed_count,
            "success_rate": self.success_rate,
            "unaccepted_answers_count": unaccepted_low_conf_count,
            "entity": self.entity,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "downloaded": self.downloaded,
            "can_download": self.can_download,
            "low_confidence_answers": low_confidence_answers,
            "edited_answers": json.loads(self.edited_answers) if self.edited_answers else {}
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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006"],  # Allow all development ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the frontend static files at the root path
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="static")

# Serve index.html for the root path
templates = Jinja2Templates(directory="frontend/dist")

@app.get("/")
async def serve_frontend(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Initialize AI processor with Llama service configuration
ai_processor = AIProcessor(
    'questionnaire.db',
    llm_host='llama',  # Use the service name from docker-compose
    llm_port=11434     # Use the internal port from the Llama container
)

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
    file: list[UploadFile] = File(..., description="Multiple files as UploadFile"),
    request: Request = None
):
    """
    Upload and process CSV files containing questions and answers.
    Tracks progress of processing each entry.
    Returns similar questions when similarity > 80% for user choice.
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
    similar_questions = []
    
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
                    
                    # Check for similar questions
                    similar_q = find_similar_question(db, question, entity, threshold=0.8)
                    if similar_q:
                        similar_questions.append({
                            "new_question": question,
                            "new_answer": answer_key,
                            "new_entity": entity,
                            "similar_to": similar_q.to_dict(),
                            "similarity": similar(question, similar_q.question)
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
                    "similar_questions": similar_questions
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
        "message": f"Successfully imported {total_imported} questions. Found {total_duplicates} similar questions.",
        "results": results
    }

@app.post("/resolve-similar")
async def resolve_similar(
    question: str = Form(...),
    answer_key: str = Form(...),
    entity: str = Form(None),
    comment: str = Form(None),
    replace_id: int = Form(None)
):
    """
    Resolve a similar question by either:
    1. Adding the new question if replace_id is not provided
    2. Replacing the existing question if replace_id is provided
    """
    db = SessionLocal()
    try:
        if replace_id:
            # Replace existing question
            existing = db.query(Questionnaire).filter(Questionnaire.id == replace_id).first()
            if existing:
                existing.question = question
                existing.answer_key = answer_key
                existing.entity = entity
                existing.comment = comment
                db.commit()
                return existing.to_dict()
        
        # Add new question
        new_questionnaire = Questionnaire(
            question=question,
            answer_key=answer_key,
            entity=entity,
            comment=comment
        )
        db.add(new_questionnaire)
        db.commit()
        db.refresh(new_questionnaire)
        return new_questionnaire.to_dict()
    
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"message": f"Error resolving similar question: {str(e)}"}
        )
    finally:
        db.close()

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
        
        # Create backlog entry
        db = SessionLocal()
        try:
            backlog_entry = ProcessedQuestionnaire(
                filename=file.filename,
                status="processing",
                entity=entity
            )
            db.add(backlog_entry)
            db.commit()
            db.refresh(backlog_entry)

            # Update backlog entry with results
            backlog_entry = db.query(ProcessedQuestionnaire).filter(ProcessedQuestionnaire.id == backlog_entry.id).first()
            if backlog_entry:
                # Track all low confidence answers
                low_confidence_answers = []
                for i, result in enumerate(results):
                    if result.get('best_match'):
                        confidence = result['best_match'].get('similarity', 0)
                        if confidence < 0.5:  # Track all answers with less than 50% confidence
                            low_confidence_answers.append({
                                'index': i,
                                'question': result['input_question'],
                                'answer': result['best_match']['answer_key'],
                                'confidence': confidence,
                                'accepted': False,
                                'edited_answer': None,
                                'is_ai_generated': result['best_match'].get('is_ai_generated', False)
                            })

                backlog_entry.status = "completed"
                backlog_entry.questions_count = len(questions)
                backlog_entry.processed_count = len(results)
                backlog_entry.success_rate = int((len([r for r in results if r.get('best_match')]) / len(questions)) * 100)
                backlog_entry.unaccepted_answers_count = len(low_confidence_answers)
                backlog_entry.can_download = True
                backlog_entry.csv_content = output.getvalue()
                backlog_entry.low_confidence_answers = json.dumps(low_confidence_answers)
                backlog_entry.edited_answers = json.dumps({})
                db.commit()

        except Exception as e:
            db.rollback()
            print(f"Error creating backlog entry: {str(e)}")
        finally:
            db.close()

        return {
            "results": results,
            "csv_content": output.getvalue(),
            "filename": f"processed_{file.filename}"
        }
        
    except Exception as e:
        # Update backlog entry with error
        db = SessionLocal()
        try:
            backlog_entry = db.query(ProcessedQuestionnaire).filter(ProcessedQuestionnaire.id == backlog_entry.id).first()
            if backlog_entry:
                backlog_entry.status = "failed"
                backlog_entry.error_message = str(e)
                db.commit()
        except Exception as update_error:
            db.rollback()
            print(f"Error updating backlog entry: {str(update_error)}")
        finally:
            db.close()

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

@app.get("/metrics/monthly-entries")
async def get_monthly_entries():
    """
    Get the count of entries added to the knowledge base per month.
    
    Returns:
        dict: Monthly entry counts with timestamps
    """
    try:
        db = SessionLocal()
        
        # Query to get counts by month
        monthly_counts = (
            db.query(
                func.strftime('%Y-%m', Questionnaire.created_at).label('month'),
                func.count().label('count')
            )
            .group_by(func.strftime('%Y-%m', Questionnaire.created_at))
            .order_by(func.strftime('%Y-%m', Questionnaire.created_at))
            .all()
        )
        
        # Format the results
        results = [
            {
                "month": entry.month,
                "count": entry.count
            }
            for entry in monthly_counts
        ]
        
        return {"monthly_counts": results}
    except Exception as e:
        print(f"Error getting monthly metrics: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting monthly metrics: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/metrics/entity-distribution")
async def get_entity_distribution():
    """
    Get the distribution of questions across different entities.
    
    Returns:
        dict: Count of questions per entity and percentage distribution
    """
    try:
        db = SessionLocal()
        
        # Get total count
        total_count = db.query(func.count(Questionnaire.id)).scalar()
        
        # Query to get counts by entity
        entity_counts = (
            db.query(
                Questionnaire.entity,
                func.count(Questionnaire.id).label('count')
            )
            .group_by(Questionnaire.entity)
            .order_by(desc('count'))
            .all()
        )
        
        # Format the results with percentages
        results = [
            {
                "entity": entry.entity or "Unspecified",
                "count": entry.count,
                "percentage": round((entry.count / total_count) * 100, 2) if total_count > 0 else 0
            }
            for entry in entity_counts
        ]
        
        return {"entity_distribution": results, "total_questions": total_count}
    except Exception as e:
        print(f"Error getting entity distribution: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting entity distribution: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/metrics/daily-trends")
async def get_daily_trends(days: int = 30):
    """
    Get daily submission trends for the specified number of days.
    
    Args:
        days (int): Number of past days to analyze (default: 30)
        
    Returns:
        dict: Daily submission counts and trend analysis
    """
    try:
        db = SessionLocal()
        
        # Calculate the date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Query to get daily counts
        daily_counts = (
            db.query(
                func.date(Questionnaire.created_at).label('date'),
                func.count().label('count')
            )
            .filter(Questionnaire.created_at >= start_date)
            .group_by(func.date(Questionnaire.created_at))
            .order_by(func.date(Questionnaire.created_at))
            .all()
        )
        
        # Calculate statistics
        counts = [entry.count for entry in daily_counts]
        avg_daily = sum(counts) / len(counts) if counts else 0
        max_daily = max(counts) if counts else 0
        min_daily = min(counts) if counts else 0
        
        # Format the results
        results = [
            {
                "date": entry.date.isoformat(),
                "count": entry.count
            }
            for entry in daily_counts
        ]
        
        return {
            "daily_counts": results,
            "statistics": {
                "average_daily": round(avg_daily, 2),
                "maximum_daily": max_daily,
                "minimum_daily": min_daily,
                "total_days": len(counts),
                "total_submissions": sum(counts)
            }
        }
    except Exception as e:
        print(f"Error getting daily trends: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting daily trends: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/metrics/complexity-analysis")
async def get_complexity_analysis():
    """
    Analyze question complexity based on length and provide distribution metrics.
    
    Returns:
        dict: Question complexity distribution and statistics
    """
    try:
        db = SessionLocal()
        
        # Get all questions with their lengths
        questions = db.query(
            Questionnaire.id,
            Questionnaire.question,
            func.length(Questionnaire.question).label('length')
        ).all()
        
        # Calculate length statistics
        lengths = [q.length for q in questions]
        avg_length = sum(lengths) / len(lengths) if lengths else 0
        
        # Define complexity categories
        def get_complexity(length):
            if length < 50:
                return "Simple"
            elif length < 150:
                return "Moderate"
            else:
                return "Complex"
        
        # Group questions by complexity
        complexity_dist = {"Simple": 0, "Moderate": 0, "Complex": 0}
        for q in questions:
            complexity_dist[get_complexity(q.length)] += 1
        
        # Calculate percentages
        total = len(questions)
        complexity_percentages = {
            category: round((count / total) * 100, 2) if total > 0 else 0
            for category, count in complexity_dist.items()
        }
        
        return {
            "complexity_distribution": {
                "counts": complexity_dist,
                "percentages": complexity_percentages
            },
            "statistics": {
                "average_length": round(avg_length, 2),
                "max_length": max(lengths) if lengths else 0,
                "min_length": min(lengths) if lengths else 0,
                "total_questions": total
            }
        }
    except Exception as e:
        print(f"Error getting complexity analysis: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting complexity analysis: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/metrics/system-summary")
async def get_system_summary():
    """
    Get a comprehensive summary of the system's statistics.
    
    Returns:
        dict: Overall system statistics and health metrics
    """
    try:
        db = SessionLocal()
        
        # Get basic counts
        total_questions = db.query(func.count(Questionnaire.id)).scalar()
        total_entities = db.query(func.count(func.distinct(Questionnaire.entity))).scalar()
        
        # Get recent activity
        last_24h = datetime.utcnow() - timedelta(hours=24)
        last_week = datetime.utcnow() - timedelta(days=7)
        
        recent_counts = {
            "last_24h": db.query(func.count(Questionnaire.id))
                         .filter(Questionnaire.created_at >= last_24h)
                         .scalar(),
            "last_7d": db.query(func.count(Questionnaire.id))
                        .filter(Questionnaire.created_at >= last_week)
                        .scalar()
        }
        
        # Get oldest and newest entries
        oldest_entry = db.query(func.min(Questionnaire.created_at)).scalar()
        newest_entry = db.query(func.max(Questionnaire.created_at)).scalar()
        
        # Calculate average entries per day
        if oldest_entry and newest_entry:
            days_active = (newest_entry - oldest_entry).days + 1
            avg_per_day = total_questions / days_active if days_active > 0 else 0
        else:
            days_active = 0
            avg_per_day = 0
        
        return {
            "total_metrics": {
                "total_questions": total_questions,
                "total_entities": total_entities,
                "days_active": days_active
            },
            "activity_metrics": {
                "last_24h_submissions": recent_counts["last_24h"],
                "last_7d_submissions": recent_counts["last_7d"],
                "average_daily_submissions": round(avg_per_day, 2)
            },
            "timeline_metrics": {
                "first_entry": oldest_entry.isoformat() if oldest_entry else None,
                "latest_entry": newest_entry.isoformat() if newest_entry else None
            }
        }
    except Exception as e:
        print(f"Error getting system summary: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting system summary: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/metrics/confidence-distribution")
async def get_confidence_distribution():
    """
    Get the distribution of confidence levels for processed questionnaire answers.
    Groups answers into confidence bands and provides statistics.
    
    Returns:
        dict: Confidence level distribution and statistics
    """
    try:
        db = SessionLocal()
        
        # Get all questions with comments containing confidence information
        questions = db.query(Questionnaire).filter(
            Questionnaire.comment.like('%Confidence:%')
        ).all()
        
        # Extract confidence values and categorize them
        confidence_data = []
        for q in questions:
            try:
                # Extract confidence value from comment
                confidence_str = re.search(r'Confidence: (\d+\.?\d*)%', q.comment)
                if confidence_str:
                    confidence = float(confidence_str.group(1)) / 100
                    confidence_data.append(confidence)
            except (ValueError, AttributeError):
                continue
        
        # Define confidence bands
        def get_confidence_band(confidence):
            if confidence >= 0.9:
                return "Very High (90-100%)"
            elif confidence >= 0.7:
                return "High (70-90%)"
            elif confidence >= 0.5:
                return "Moderate (50-70%)"
            else:
                return "Low (<50%)"
        
        # Group by confidence bands
        confidence_dist = {
            "Very High (90-100%)": 0,
            "High (70-90%)": 0,
            "Moderate (50-70%)": 0,
            "Low (<50%)": 0
        }
        
        for confidence in confidence_data:
            band = get_confidence_band(confidence)
            confidence_dist[band] += 1
        
        # Calculate statistics
        total_processed = len(confidence_data)
        avg_confidence = sum(confidence_data) / total_processed if confidence_data else 0
        
        # Calculate percentages
        confidence_percentages = {
            band: round((count / total_processed) * 100, 2) if total_processed > 0 else 0
            for band, count in confidence_dist.items()
        }
        
        return {
            "confidence_distribution": {
                "counts": confidence_dist,
                "percentages": confidence_percentages
            },
            "statistics": {
                "total_processed": total_processed,
                "average_confidence": round(avg_confidence * 100, 2),
                "highest_confidence": round(max(confidence_data) * 100, 2) if confidence_data else 0,
                "lowest_confidence": round(min(confidence_data) * 100, 2) if confidence_data else 0
            }
        }
    except Exception as e:
        print(f"Error getting confidence distribution: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting confidence distribution: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/questionnaire-backlog")
async def get_questionnaire_backlog():
    """
    Get the list of processed questionnaires.
    
    Returns:
        dict: List of processed questionnaire entries
    """
    try:
        db = SessionLocal()
        entries = (
            db.query(ProcessedQuestionnaire)
            .order_by(ProcessedQuestionnaire.created_at.desc())
            .all()
        )
        return {"entries": [entry.to_dict() for entry in entries]}
    except Exception as e:
        print(f"Error fetching questionnaire backlog: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error fetching questionnaire backlog: {str(e)}"}
        )
    finally:
        db.close()

@app.get("/questionnaire-backlog/{entry_id}/download")
async def download_processed_questionnaire(entry_id: int):
    """
    Download a processed questionnaire file.
    
    Args:
        entry_id (int): ID of the processed questionnaire entry
        
    Returns:
        StreamingResponse: The processed CSV file
    """
    try:
        db = SessionLocal()
        entry = db.query(ProcessedQuestionnaire).filter(ProcessedQuestionnaire.id == entry_id).first()
        
        if not entry:
            return JSONResponse(
                status_code=404,
                content={"message": "Processed questionnaire not found"}
            )
            
        if not entry.can_download:
            return JSONResponse(
                status_code=400,
                content={"message": "Questionnaire is not ready for download"}
            )
            
        if not entry.csv_content:
            return JSONResponse(
                status_code=404,
                content={"message": "CSV content not found"}
            )
            
        return StreamingResponse(
            io.StringIO(entry.csv_content),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=processed_{entry.filename}"
            }
        )
    except Exception as e:
        print(f"Error downloading processed questionnaire: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error downloading processed questionnaire: {str(e)}"}
        )
    finally:
        db.close()

@app.post("/questionnaire-backlog/{entry_id}/mark-downloaded")
async def mark_questionnaire_downloaded(entry_id: int):
    """
    Mark a processed questionnaire as downloaded.
    
    Args:
        entry_id (int): ID of the processed questionnaire entry
    """
    try:
        db = SessionLocal()
        entry = db.query(ProcessedQuestionnaire).filter(ProcessedQuestionnaire.id == entry_id).first()
        
        if not entry:
            return JSONResponse(
                status_code=404,
                content={"message": "Processed questionnaire not found"}
            )
            
        entry.downloaded = True
        db.commit()
        return {"success": True}
    except Exception as e:
        print(f"Error marking questionnaire as downloaded: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error marking questionnaire as downloaded: {str(e)}"}
        )
    finally:
        db.close()

@app.post("/questionnaire-backlog/{entry_id}/update-answers")
async def update_questionnaire_answers(entry_id: int, request: Request):
    """
    Update edited answers for a processed questionnaire.
    
    Args:
        entry_id (int): ID of the processed questionnaire entry
        request (Request): Request containing edited answers
    """
    try:
        data = await request.json()
        edited_answers = data.get('edited_answers', {})
        accepted_answers = data.get('accepted_answers', [])
        
        db = SessionLocal()
        entry = db.query(ProcessedQuestionnaire).filter(ProcessedQuestionnaire.id == entry_id).first()
        
        if not entry:
            return JSONResponse(
                status_code=404,
                content={"message": "Processed questionnaire not found"}
            )
        
        # Update low confidence answers with acceptance status
        low_confidence_answers = json.loads(entry.low_confidence_answers) if entry.low_confidence_answers else []
        
        # Update acceptance status and edited answers
        for answer in low_confidence_answers:
            answer_index = answer['index']
            # Update any answer with confidence < 50%
            if answer['confidence'] < 0.5:
                if answer_index in accepted_answers:
                    answer['accepted'] = True
                else:
                    answer['accepted'] = False
                
                if str(answer_index) in edited_answers:
                    answer['edited_answer'] = edited_answers[str(answer_index)]
        
        # Count unaccepted low confidence answers
        unaccepted_count = len([
            answer for answer in low_confidence_answers 
            if answer['confidence'] < 0.5 and not answer.get('accepted', False)
        ])
        
        entry.low_confidence_answers = json.dumps(low_confidence_answers)
        entry.edited_answers = json.dumps(edited_answers)
        entry.unaccepted_answers_count = unaccepted_count
        
        # Update CSV content with edited answers
        if entry.csv_content:
            csv_data = list(csv.reader(io.StringIO(entry.csv_content)))
            headers = csv_data[0]
            
            # Find answer column index
            answer_idx = next((i for i, h in enumerate(headers) if 'answer' in h.lower()), None)
            if answer_idx is not None:
                for answer_index, new_answer in edited_answers.items():
                    try:
                        row_idx = int(answer_index) + 1  # +1 to skip header row
                        if row_idx < len(csv_data):
                            csv_data[row_idx][answer_idx] = new_answer
                    except (ValueError, IndexError):
                        continue
            
            # Write updated CSV content
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerows(csv_data)
            entry.csv_content = output.getvalue()
        
        db.commit()
        return entry.to_dict()
    except Exception as e:
        print(f"Error updating questionnaire answers: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error updating questionnaire answers: {str(e)}"}
        )
    finally:
        db.close()

@app.delete("/questionnaire-backlog/clear")
async def clear_questionnaire_backlog():
    """
    Clear all entries from the questionnaire backlog.
    This does not affect the knowledge base Q&A entries.
    
    Returns:
        dict: Success message or error
    """
    try:
        db = SessionLocal()
        try:
            # Delete all entries from the processed_questionnaires table
            db.query(ProcessedQuestionnaire).delete()
            db.commit()
            return {"message": "Successfully cleared questionnaire backlog"}
        except Exception as e:
            db.rollback()
            return JSONResponse(
                status_code=500,
                content={"message": f"Error clearing questionnaire backlog: {str(e)}"}
            )
        finally:
            db.close()
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Database connection error: {str(e)}"}
        )

@app.get("/metrics/review-status")
async def get_review_status_metrics():
    """
    Get metrics about questionnaire review status.
    
    Returns:
        dict: Counts of questionnaires in review and completed
    """
    try:
        db = SessionLocal()
        
        # Get total count
        total_count = db.query(func.count(ProcessedQuestionnaire.id)).scalar()
        
        # Get count of questionnaires in review (not downloaded and completed)
        in_review_count = (
            db.query(func.count(ProcessedQuestionnaire.id))
            .filter(
                ProcessedQuestionnaire.status == 'completed',
                ProcessedQuestionnaire.downloaded == False
            )
            .scalar()
        )
        
        # Get count of completed questionnaires (downloaded)
        completed_count = (
            db.query(func.count(ProcessedQuestionnaire.id))
            .filter(
                ProcessedQuestionnaire.status == 'completed',
                ProcessedQuestionnaire.downloaded == True
            )
            .scalar()
        )
        
        # Get count of failed questionnaires
        failed_count = (
            db.query(func.count(ProcessedQuestionnaire.id))
            .filter(ProcessedQuestionnaire.status == 'failed')
            .scalar()
        )
        
        # Get count of processing questionnaires
        processing_count = (
            db.query(func.count(ProcessedQuestionnaire.id))
            .filter(ProcessedQuestionnaire.status == 'processing')
            .scalar()
        )
        
        return {
            "total_questionnaires": total_count,
            "in_review": in_review_count,
            "completed": completed_count,
            "failed": failed_count,
            "processing": processing_count,
            "percentages": {
                "in_review": round((in_review_count / total_count) * 100, 2) if total_count > 0 else 0,
                "completed": round((completed_count / total_count) * 100, 2) if total_count > 0 else 0,
                "failed": round((failed_count / total_count) * 100, 2) if total_count > 0 else 0,
                "processing": round((processing_count / total_count) * 100, 2) if total_count > 0 else 0
            }
        }
    except Exception as e:
        print(f"Error getting review status metrics: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error getting review status metrics: {str(e)}"}
        )
    finally:
        db.close()

@app.delete("/clear-knowledge-base")
async def clear_knowledge_base():
    """Clear all entries from the questionnaires table."""
    try:
        db = SessionLocal()
        db.query(Questionnaire).delete()
        db.commit()
        return {"message": "Knowledge base cleared successfully"}
    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"message": f"Error clearing knowledge base: {str(e)}"}
        )
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 