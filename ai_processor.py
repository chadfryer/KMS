import sqlite3
from typing import List, Dict
from difflib import SequenceMatcher
import re

class AIProcessor:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.questions = []
        self.answers = []
        self.ids = []
        self._load_knowledge_base()
    
    def _load_knowledge_base(self):
        """Load the knowledge base."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if the questions table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'")
            if not cursor.fetchone():
                print("Questions table does not exist. Creating it...")
                cursor.execute("""
                    CREATE TABLE questions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        question TEXT NOT NULL,
                        answer_key TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
                return
            
            cursor.execute("SELECT id, question, answer_key FROM questions")
            results = cursor.fetchall()
            
            if results:
                self.questions = [r[1] for r in results]
                self.answers = [r[2] for r in results]
                self.ids = [r[0] for r in results]
            
        except sqlite3.Error as e:
            print(f"Database error: {e}")
            # Don't raise the exception, just log it
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
            # Don't raise the exception, just log it
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def _calculate_similarity(self, a: str, b: str) -> float:
        """Calculate similarity between two strings."""
        try:
            # Remove punctuation and convert to lowercase
            a = re.sub(r'[^\w\s]', '', a.lower())
            b = re.sub(r'[^\w\s]', '', b.lower())
            return SequenceMatcher(None, a, b).ratio()
        except:
            return 0.0
    
    def find_similar_questions(self, query: str, k: int = 5) -> List[Dict]:
        """Find similar questions in the knowledge base."""
        try:
            if not self.questions:
                return []
                
            # Calculate similarities
            similarities = [(i, self._calculate_similarity(query, q)) 
                          for i, q in enumerate(self.questions)]
            
            # Sort by similarity
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Get top k results
            results = []
            for i, similarity in similarities[:k]:
                if similarity > 0.3:  # Only include if similarity > 30%
                    results.append({
                        'id': self.ids[i],
                        'question': self.questions[i],
                        'answer': self.answers[i],
                        'similarity': float(similarity)
                    })
            
            return results
        except Exception as e:
            print(f"Error finding similar questions: {e}")
            return []
    
    def generate_answer(self, question: str, similar_qa: List[Dict]) -> str:
        """Generate an answer based on similar questions and answers."""
        if not similar_qa:
            return "No similar questions found in the knowledge base."
        
        try:
            # Get the most similar answer
            best_match = max(similar_qa, key=lambda x: x['similarity'])
            return best_match['answer']
        except Exception as e:
            print(f"Error generating answer: {e}")
            return "Error generating answer. Please try again."

    def process_question(self, question: str) -> Dict:
        """Process a new question and generate an answer."""
        try:
            # Find similar questions
            similar_qa = self.find_similar_questions(question)
            
            if not similar_qa:
                return {
                    'question': question,
                    'answer': "No similar questions found in the knowledge base.",
                    'confidence': 0.0,
                    'is_ai_generated': False,
                    'similar_questions': []
                }
            
            # Calculate confidence based on similarity scores
            confidence = sum(qa['similarity'] for qa in similar_qa) / len(similar_qa)
            
            # If confidence is high enough, use the most similar answer
            if confidence >= 0.8:
                best_match = max(similar_qa, key=lambda x: x['similarity'])
                return {
                    'question': question,
                    'answer': best_match['answer'],
                    'confidence': confidence,
                    'is_ai_generated': False,
                    'similar_questions': similar_qa
                }
            
            # If confidence is low, generate a synthesized answer
            answer = self.generate_answer(question, similar_qa)
            return {
                'question': question,
                'answer': answer,
                'confidence': confidence,
                'is_ai_generated': True,
                'similar_questions': similar_qa
            }
        except Exception as e:
            print(f"Error processing question: {e}")
            return {
                'question': question,
                'answer': "Error processing question. Please try again.",
                'confidence': 0.0,
                'is_ai_generated': False,
                'similar_questions': []
            } 