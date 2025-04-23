"""
Main FastAPI application for the Questionnaire Management System.

This application provides endpoints for:
- Managing a database of questions and answers
- Processing questionnaire CSV files
- Searching the knowledge base
- Uploading and validating CSV files
"""

from fastapi import FastAPI, Request, Form, UploadFile, File
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
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
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Allow both Vite ports
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

def find_similar_question(db, question: str, threshold: float = 0.6):
    """
    Find similar questions in the database with a similarity threshold.
    
    Args:
        db: Database session
        question (str): Question to find similar matches for
        threshold (float): Minimum similarity ratio (default: 0.6)
        
    Returns:
        Questionnaire or None: Matching question if found, None otherwise
    """
    all_questions = db.query(Questionnaire).all()
    best_match = None
    best_similarity = threshold
    
    for q in all_questions:
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
        # Check for similar questions
        similar_q = find_similar_question(db, question)
        if similar_q:
            return JSONResponse(
                status_code=400,
                content={
                    "message": "A similar question already exists in the database",
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

@app.post("/upload-csv")
async def upload_csv(file: list[UploadFile] = File(description="Multiple files as UploadFile")):
    """
    Handle multiple CSV file uploads and import questions into the database.
    
    Args:
        file (list[UploadFile]): List of CSV files to upload
        
    Returns:
        dict: Summary of import results including success/failure counts
    """
    if not file:
        return JSONResponse(
            status_code=400,
            content={"message": "No files were uploaded"}
        )
    
    if not all(f.filename.endswith('.csv') for f in file):
        return JSONResponse(
            status_code=400,
            content={"message": "Only CSV files are allowed"}
        )
    
    total_imported = 0
    total_duplicates = 0
    results = []
    
    for f in file:
        try:
            # Read and decode file content with multiple encodings
            content = await f.read()
            encodings = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
            content_str = None
            
            for encoding in encodings:
                try:
                    content_str = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if content_str is None:
                results.append({
                    "file": f.filename,
                    "status": "error",
                    "message": "Could not decode the CSV file. Please ensure it's a valid CSV file."
                })
                continue
            
            # Clean up line endings
            content_str = content_str.replace('\r\n', '\n').replace('\r', '\n')
            
            # Process CSV content
            csv_file = io.StringIO(content_str)
            reader = csv.DictReader(csv_file)
            
            # Normalize column names and remove BOM
            fieldnames = [name.strip().lower().replace('\ufeff', '') for name in reader.fieldnames] if reader.fieldnames else []
            
            # Create a mapping of normalized field names to original field names
            field_mapping = {}
            for original_name in reader.fieldnames:
                normalized_name = original_name.strip().lower().replace('\ufeff', '')
                field_mapping[normalized_name] = original_name
            
            # Validate required columns
            if 'question' not in fieldnames or 'answer_key' not in fieldnames:
                results.append({
                    "file": f.filename,
                    "status": "error",
                    "message": f"CSV must contain 'question' and 'answer_key' columns. 'entity' and 'comment' are optional. Found columns: {fieldnames}"
                })
                continue
            
            db = SessionLocal()
            questionnaires = []
            duplicates = []
            
            try:
                for row in reader:
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
                    similar_q = find_similar_question(db, question)
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
                
                db.commit()
                for q in questionnaires:
                    db.refresh(q)
                
                imported_count = len(questionnaires)
                total_imported += imported_count
                results.append({
                    "file": f.filename,
                    "status": "success",
                    "message": f"Successfully imported {imported_count} questionnaires",
                    "duplicates": duplicates
                })
            except Exception as e:
                db.rollback()
                print(f"Error processing CSV: {str(e)}")
                results.append({
                    "file": f.filename,
                    "status": "error",
                    "message": f"Error processing CSV: {str(e)}"
                })
            finally:
                db.close()
        except Exception as e:
            print(f"Error reading file: {str(e)}")
            results.append({
                "file": f.filename,
                "status": "error",
                "message": f"Error reading file: {str(e)}"
            })
    
    return {
        "message": f"Processed {len(file)} files. Total imported: {total_imported}, Total duplicates: {total_duplicates}",
        "results": results
    }

@app.post("/process-questionnaire")
async def process_questionnaire(file: UploadFile = File(...), threshold: float = 0.6, entity: str = None):
    """
    Process a questionnaire CSV file and find matching answers from the knowledge base.
    
    Args:
        file (UploadFile): CSV file containing questions
        threshold (float): Similarity threshold for matching questions (default: 0.6)
        entity (str): Optional entity to filter matches by
        
    Returns:
        dict: Processing results and updated CSV content
    """
    if not file.filename.endswith('.csv'):
        return JSONResponse(
            status_code=400,
            content={"message": "Only CSV files are allowed"}
        )
    
    try:
        # Read and decode file content
        content = await file.read()
        content_str = None
        
        # Try different encodings, prioritizing utf-8-sig for BOM handling
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
        
        # Process CSV content
        content_str = content_str.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove BOM if present
        if content_str.startswith('\ufeff'):
            content_str = content_str[1:]
        
        csv_file = io.StringIO(content_str)
        reader = csv.reader(csv_file)
        
        # Get headers and normalize them
        headers = next(reader, None)
        if not headers:
            return JSONResponse(
                status_code=400,
                content={"message": "CSV file is empty or has no headers"}
            )
        
        # Normalize headers and create mapping
        normalized_headers = [h.strip().lower().replace('\ufeff', '') for h in headers]
        header_mapping = dict(zip(normalized_headers, headers))
        
        # Find required column indices
        question_idx = None
        answer_idx = None
        comment_idx = None
        
        for idx, header in enumerate(normalized_headers):
            if 'question' in header:
                question_idx = idx
            elif 'answer' in header:
                answer_idx = idx
            elif 'comment' in header:
                comment_idx = idx
        
        if question_idx is None:
            return JSONResponse(
                status_code=400,
                content={"message": "CSV must contain a 'question' column"}
            )
        
        # Process rows
        questions = []
        rows = []
        for row in reader:
            if not row:  # Skip empty rows
                continue
            
            # Create a dict for the row
            row_dict = {}
            for idx, value in enumerate(row):
                if idx < len(headers):
                    row_dict[headers[idx]] = value.strip() if isinstance(value, str) else value
            
            rows.append(row_dict)
            
            question = row[question_idx].strip() if question_idx < len(row) else ''
            answer = row[answer_idx].strip() if answer_idx is not None and answer_idx < len(row) else ''
            comment = row[comment_idx].strip() if comment_idx is not None and comment_idx < len(row) else ''
            
            if question:
                questions.append({
                    'question': question,
                    'answer': answer,
                    'comment': comment
                })
        
        if not questions:
            return JSONResponse(
                status_code=400,
                content={"message": "No questions found in the CSV file"}
            )
        
        # Find matches in database using AI processor
        db = SessionLocal()
        try:
            results = []
            updated_rows = []
            
            for i, q in enumerate(questions):
                # First check if there's an existing answer
                if q['answer']:
                    best_match = {
                        "question": q['question'],
                        "answer_key": q['answer'],
                        "comment": q['comment'] if q['comment'] else None,
                        "similarity": 1.0
                    }
                else:
                    # Use AI processor to find matches and generate answer
                    ai_result = ai_processor.process_question(q['question'])
                    print(f"AI Result for question '{q['question']}': {ai_result}")  # Debug print
                    
                    if ai_result.get('answer') and ai_result.get('answer') != "No similar questions found in the knowledge base.":
                        best_match = {
                            "question": q['question'],
                            "answer_key": ai_result['answer'],
                            "comment": f"Confidence: {ai_result['confidence']:.2%}",
                            "similarity": ai_result['confidence'],
                            "similar_questions": ai_result.get('similar_questions', [])
                        }
                    else:
                        best_match = None
                        print(f"No valid answer found for question: {q['question']}")  # Debug print
                
                results.append({
                    "input_question": q['question'],
                    "best_match": best_match
                })
                
                # Update row with match
                updated_row = rows[i].copy()
                if best_match:
                    # Find the answer key column in the original headers
                    answer_key_header = next((h for h in headers if 'answer' in h.lower()), None)
                    comment_header = next((h for h in headers if 'comment' in h.lower()), None)
                    
                    if answer_key_header:
                        updated_row[answer_key_header] = best_match['answer_key']
                    if comment_header and best_match['comment']:
                        updated_row[comment_header] = best_match['comment']
                updated_rows.append(updated_row)
            
            # Create updated CSV
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            writer.writerows(updated_rows)
            
            csv_content = output.getvalue()
            
            return {
                "results": results,
                "csv_content": csv_content,
                "filename": f"processed_{file.filename}"
            }
        finally:
            db.close()
            
    except Exception as e:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 