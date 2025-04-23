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
            
            # Calculate word embedding similarity (using word overlap as a simple approximation)
            common_words = a_words.intersection(b_words)
            total_words = len(a_words) + len(b_words)
            word_sim = len(common_words) * 2 / total_words if total_words > 0 else 0
            
            # Combine similarities with adjusted weights
            combined = (
                jaccard * 0.3 +          # Word overlap importance
                sequence * 0.2 +         # Exact sequence matching
                word_order * 0.2 +       # Word order importance
                word_sim * 0.3           # Word similarity
            )
            
            return combined
            
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0
    
    def find_similar_questions(self, query: str, k: int = 5) -> List[Dict]:
        """Find similar questions in the knowledge base."""
        try:
            if not self.questions:
                print("Warning: No questions loaded in knowledge base")
                return []
                
            print(f"\nProcessing query: {query}")
            print(f"Total questions in knowledge base: {len(self.questions)}")
            
            # Calculate similarities
            similarities = []
            for i, q in enumerate(self.questions):
                similarity = self._calculate_similarity(query, q)
                similarities.append((i, similarity))
                if similarity > 0.2:  # Debug print for potentially relevant matches
                    print(f"Potential match found:")
                    print(f"Q: {q}")
                    print(f"Similarity: {similarity:.2%}")
            
            # Sort by similarity
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Get top k results with any similarity (removed minimum threshold)
            results = []
            for i, similarity in similarities[:k]:
                # Include all matches for analysis
                results.append({
                    'id': self.ids[i],
                    'question': self.questions[i],
                    'answer': self.answers[i],
                    'similarity': float(similarity)
                })
                
            print(f"\nFound {len(results)} matches:")
            for r in results:
                print(f"Match (similarity: {r['similarity']:.2%}):")
                print(f"Q: {r['question']}")
                print(f"A: {r['answer']}\n")
            
            return results
            
        except Exception as e:
            print(f"Error finding similar questions: {e}")
            return []
    
    def generate_answer(self, question: str, similar_qa: List[Dict]) -> str:
        """Generate an answer based on similar questions and answers."""
        if not similar_qa:
            return "No similar questions found in the knowledge base."
        
        try:
            print(f"\nGenerating answer for: {question}")
            print(f"Working with {len(similar_qa)} similar questions")
            
            # Sort by similarity
            similar_qa.sort(key=lambda x: x['similarity'], reverse=True)
            best_match = similar_qa[0]
            
            print(f"Best match similarity: {best_match['similarity']:.2%}")
            
            # If we have a high confidence match, use it directly
            if best_match['similarity'] > 0.8:
                print("Using high confidence match directly")
                return best_match['answer']
            
            # For medium confidence, combine information from top matches
            elif best_match['similarity'] > 0.5:
                print("Using medium confidence synthesis")
                # Get top 3 most similar answers
                top_answers = [qa['answer'] for qa in similar_qa[:3] if qa['similarity'] > 0.3]
                
                if not top_answers:
                    print("No suitable answers found for medium confidence synthesis")
                    return best_match['answer']
                
                print(f"Synthesizing from {len(top_answers)} answers")
                
                # Extract key information from answers
                key_phrases = []
                for answer in top_answers:
                    # Split into sentences and clean
                    sentences = [s.strip() for s in answer.split('.') if s.strip()]
                    key_phrases.extend(sentences)
                
                # Remove duplicates while preserving order
                seen = set()
                unique_phrases = []
                for phrase in key_phrases:
                    if phrase.lower() not in seen:
                        seen.add(phrase.lower())
                        unique_phrases.append(phrase)
                
                # Combine unique phrases into a coherent answer
                synthesized_answer = '. '.join(unique_phrases)
                if not synthesized_answer.endswith('.'):
                    synthesized_answer += '.'
                
                print(f"Synthesized answer: {synthesized_answer}")
                return synthesized_answer
            
            # For low confidence matches, try to extract relevant information
            else:
                print("Using low confidence synthesis")
                # Get all answers with similarity > 0.2
                relevant_answers = [qa['answer'] for qa in similar_qa if qa['similarity'] > 0.2]
                
                if not relevant_answers:
                    print("No relevant answers found for low confidence synthesis")
                    return best_match['answer']
                
                print(f"Found {len(relevant_answers)} relevant answers for synthesis")
                
                # Extract common words/phrases (excluding stop words)
                stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
                word_freq = Counter()
                
                for answer in relevant_answers:
                    # Split into words and clean
                    words = re.findall(r'\b\w+\b', answer.lower())
                    # Add non-stop words to frequency counter
                    word_freq.update([w for w in words if w not in stop_words])
                
                # Get most common terms
                common_terms = [word for word, _ in word_freq.most_common(10)]
                print(f"Common terms identified: {common_terms}")
                
                # Extract sentences containing common terms
                relevant_sentences = []
                for answer in relevant_answers:
                    sentences = [s.strip() for s in answer.split('.') if s.strip()]
                    for sentence in sentences:
                        # Check if sentence contains any common terms
                        if any(term in sentence.lower() for term in common_terms):
                            relevant_sentences.append(sentence)
                
                # Remove duplicates while preserving order
                seen = set()
                unique_sentences = []
                for sentence in relevant_sentences:
                    if sentence.lower() not in seen:
                        seen.add(sentence.lower())
                        unique_sentences.append(sentence)
                
                print(f"Found {len(unique_sentences)} unique relevant sentences")
                
                # Combine relevant sentences
                if unique_sentences:
                    synthesized_answer = '. '.join(unique_sentences)
                    if not synthesized_answer.endswith('.'):
                        synthesized_answer += '.'
                    print(f"Synthesized answer: {synthesized_answer}")
                    return synthesized_answer
                
                print("Falling back to best match answer")
                return best_match['answer']
            
        except Exception as e:
            print(f"Error generating answer: {e}")
            return best_match['answer'] if best_match else "Error generating answer. Please try again."

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
            
            # Sort by similarity
            similar_qa.sort(key=lambda x: x['similarity'], reverse=True)
            best_match = similar_qa[0]
            
            # Generate answer based on confidence level
            confidence = best_match['similarity']
            answer = self.generate_answer(question, similar_qa)
            
            # Add confidence indicator without disrupting the answer
            confidence_note = ""
            if confidence < 0.5:
                confidence_note = " (Based on multiple similar questions with partial matches)"
            elif confidence < 0.8:
                confidence_note = " (Based on similar questions with good confidence)"
            
            # Only add confidence note if it's not a direct match
            if confidence < 0.8:
                # Check if answer ends with punctuation
                if answer[-1] in '.!?':
                    answer = answer[:-1] + confidence_note + answer[-1]
                else:
                    answer = answer + confidence_note + '.'
            
            return {
                'question': question,
                'answer': answer,
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