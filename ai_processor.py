import sqlite3
from typing import List, Dict
from difflib import SequenceMatcher
import re
from collections import Counter

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
            
            # Check if the questionnaires table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='questionnaires'")
            if not cursor.fetchone():
                print("Questionnaires table does not exist. Creating it...")
                cursor.execute("""
                    CREATE TABLE questionnaires (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        question TEXT NOT NULL,
                        answer_key TEXT NOT NULL,
                        entity TEXT,
                        comment TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
                return
            
            cursor.execute("SELECT id, question, answer_key FROM questionnaires")
            results = cursor.fetchall()
            
            if results:
                self.questions = [r[1] for r in results]
                self.answers = [r[2] for r in results]
                self.ids = [r[0] for r in results]
            
        except sqlite3.Error as e:
            print(f"Database error: {e}")
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
        finally:
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def _calculate_similarity(self, a: str, b: str) -> float:
        """Calculate similarity between two strings using a combination of methods."""
        try:
            # Remove punctuation and convert to lowercase
            a_clean = re.sub(r'[^\w\s]', '', a.lower())
            b_clean = re.sub(r'[^\w\s]', '', b.lower())
            
            # Get word sets
            a_words = set(a_clean.split())
            b_words = set(b_clean.split())
            
            # Calculate word overlap (Jaccard similarity)
            overlap = len(a_words.intersection(b_words))
            total = len(a_words.union(b_words))
            jaccard = overlap / total if total > 0 else 0
            
            # Calculate sequence similarity
            sequence = SequenceMatcher(None, a_clean, b_clean).ratio()
            
            # Calculate word order similarity
            a_word_list = a_clean.split()
            b_word_list = b_clean.split()
            word_order = SequenceMatcher(None, a_word_list, b_word_list).ratio()
            
            # Combine similarities with weights
            combined = (jaccard * 0.4) + (sequence * 0.3) + (word_order * 0.3)
            return combined
            
        except Exception as e:
            print(f"Error calculating similarity: {e}")
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
                if similarity > 0.15:  # Lower threshold to 15% for more matches
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
            # If we have a high confidence match, use it directly
            best_match = max(similar_qa, key=lambda x: x['similarity'])
            if best_match['similarity'] > 0.6:
                return best_match['answer']
            
            # For lower confidence matches, try to synthesize an answer
            # Extract key phrases from similar answers
            answer_words = []
            for qa in similar_qa:
                answer_words.extend(re.findall(r'\b\w+\b', qa['answer'].lower()))
            
            # Count word frequencies
            word_freq = Counter(answer_words)
            
            # Get the most common words/phrases (excluding stop words)
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
            key_terms = [word for word, _ in word_freq.most_common(10) if word not in stop_words]
            
            # Use the best match as a template but indicate lower confidence
            answer = best_match['answer']
            confidence_note = "\n\nNote: This answer is based on similar questions with moderate confidence."
            
            return answer + confidence_note
            
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
            
            # Get the best match
            best_match = max(similar_qa, key=lambda x: x['similarity'])
            
            # Calculate overall confidence
            confidence = best_match['similarity']
            
            # Always return the best matching answer, but indicate confidence level
            confidence_note = ""
            if confidence < 0.5:
                confidence_note = "\n\nNote: This answer is based on similar questions with low confidence."
            elif confidence < 0.8:
                confidence_note = "\n\nNote: This answer is based on similar questions with moderate confidence."
            
            return {
                'question': question,
                'answer': best_match['answer'] + confidence_note,
                'confidence': confidence,
                'is_ai_generated': confidence < 0.8,
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