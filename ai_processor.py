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
        print(f"AI Processor initialized with {len(self.questions)} questions in knowledge base")
    
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
                # Clean and process the data
                cleaned_results = []
                for r in results:
                    # Split on pipe character and clean
                    question = r[1].strip().replace('|', '')
                    answer = r[2].strip().replace('|', '')
                    if question and answer:  # Only include non-empty QA pairs
                        cleaned_results.append((r[0], question, answer))
                
                if cleaned_results:
                    self.questions = [r[1] for r in cleaned_results]
                    self.answers = [r[2] for r in cleaned_results]
                    self.ids = [r[0] for r in cleaned_results]
                    print(f"Loaded {len(cleaned_results)} questions from database")
                    for i, (q, a) in enumerate(zip(self.questions[:5], self.answers[:5])):
                        print(f"Sample Question {i+1}: {q}")
                        print(f"Sample Answer {i+1}: {a}\n")
                else:
                    print("No valid questions found after cleaning")
            else:
                print("No questions found in database")
            
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
            # First check for exact match (case-insensitive)
            if a.lower() == b.lower():
                return 1.0
                
            # Remove punctuation and convert to lowercase
            a_clean = re.sub(r'[^\w\s]', '', a.lower())
            b_clean = re.sub(r'[^\w\s]', '', b.lower())
            
            # Check for exact match after cleaning
            if a_clean == b_clean:
                return 1.0
            
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
            
            # Combine similarities with adjusted weights (removed keyword importance)
            combined = (
                jaccard * 0.3 +          # Word overlap importance
                sequence * 0.3 +         # Exact sequence matching
                word_order * 0.2 +       # Word order importance
                word_sim * 0.2           # Word similarity
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
            print(f"\nProcessing question: {question}")
            
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
            print(f"Best match confidence: {confidence:.2%}")
            
            # For exact matches or very high confidence
            if confidence >= 0.95:
                return {
                    'question': question,
                    'answer': best_match['answer'],
                    'confidence': confidence,
                    'is_ai_generated': False,
                    'similar_questions': similar_qa
                }
            
            # Always try to generate a synthesized answer for other cases
            print("Attempting to synthesize answer from multiple sources")
            # Get all answers with similarity > 0.2
            relevant_answers = [qa for qa in similar_qa if qa['similarity'] > 0.2]
            
            if relevant_answers:
                print(f"Found {len(relevant_answers)} relevant answers for synthesis")
                synthesized_answer = self._synthesize_answer(question, relevant_answers)
                
                if synthesized_answer:
                    confidence_note = ""
                    if confidence < 0.5:
                        confidence_note = " (Based on multiple similar questions)"
                    elif confidence < 0.8:
                        confidence_note = " (Based on closely related questions)"
                    
                    final_answer = synthesized_answer
                    if confidence_note:
                        if final_answer[-1] in '.!?':
                            final_answer = final_answer[:-1] + confidence_note + final_answer[-1]
                        else:
                            final_answer += confidence_note + '.'
                    
                    return {
                        'question': question,
                        'answer': final_answer,
                        'confidence': confidence,
                        'is_ai_generated': True,
                        'similar_questions': similar_qa
                    }
            
            # If synthesis failed, return best match
            return {
                'question': question,
                'answer': best_match['answer'],
                'confidence': confidence,
                'is_ai_generated': confidence < 0.95,  # Consider it AI-generated if not a very close match
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

    def _synthesize_answer(self, question: str, similar_qa: List[Dict]) -> str:
        """Synthesize an answer from multiple similar questions."""
        try:
            print(f"Synthesizing answer from {len(similar_qa)} similar questions")
            
            # Extract key terms from the question
            question_words = set(re.findall(r'\b\w+\b', question.lower()))
            
            # Group similar answers
            answer_groups = {}
            for qa in similar_qa:
                answer = qa['answer'].strip()
                if answer.lower() == 'yes':
                    answer_groups['yes'] = answer_groups.get('yes', 0) + qa['similarity']
                elif answer.lower() == 'no':
                    answer_groups['no'] = answer_groups.get('no', 0) + qa['similarity']
                else:
                    # For non-yes/no answers, use the answer as the key
                    answer_groups[answer] = answer_groups.get(answer, 0) + qa['similarity']
            
            # If we have mostly yes/no answers
            if 'yes' in answer_groups or 'no' in answer_groups:
                total_weight = sum(answer_groups.values())
                yes_weight = answer_groups.get('yes', 0)
                no_weight = answer_groups.get('no', 0)
                
                if total_weight > 0:
                    yes_ratio = yes_weight / total_weight
                    no_ratio = no_weight / total_weight
                    
                    if yes_ratio > 0.6:
                        return "Yes"
                    elif no_ratio > 0.6:
                        return "No"
                    else:
                        # If no clear majority, provide a nuanced answer
                        return "Partially - depends on specific requirements and context"
            
            # For non-yes/no answers or mixed responses
            # Sort answers by their combined similarity scores
            sorted_answers = sorted(answer_groups.items(), key=lambda x: x[1], reverse=True)
            
            if sorted_answers:
                # Return the answer with the highest combined similarity score
                return sorted_answers[0][0]
            
            return None
            
        except Exception as e:
            print(f"Error synthesizing answer: {e}")
            return None 