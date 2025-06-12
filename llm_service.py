from typing import Dict, Optional
import os
from openai import OpenAI

class LLMService:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the LLM service with an API key."""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key must be provided either directly or via OPENAI_API_KEY environment variable")
        self.client = OpenAI(api_key=self.api_key)
        
    def generate_answer(self, question: str, context: Dict = None) -> Dict:
        """
        Generate an answer using the LLM service.
        
        Args:
            question (str): The question to answer
            context (Dict, optional): Additional context like similar questions/answers
            
        Returns:
            Dict: Contains the generated answer and metadata
        """
        try:
            # Construct the prompt with context if available
            prompt = self._construct_prompt(question, context)
            
            # Call the LLM API
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Using GPT-4 for better reasoning
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context and your general knowledge. If the context contains relevant information, use it to inform your answer. If not, use your general knowledge but indicate that the answer is based on general knowledge rather than specific context."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            # Extract the answer from the response
            answer = response.choices[0].message.content
            
            return {
                'answer': answer,
                'is_ai_generated': True,
                'confidence': 0.8 if context and context.get('similar_questions') else 0.6,
                'source': 'llm'
            }
            
        except Exception as e:
            print(f"Error generating answer with LLM: {str(e)}")
            return {
                'answer': "Error generating answer with AI. Please try again.",
                'is_ai_generated': True,
                'confidence': 0.0,
                'source': 'error'
            }
            
    def _construct_prompt(self, question: str, context: Dict = None) -> str:
        """
        Construct a prompt for the LLM using the question and available context.
        """
        prompt_parts = [f"Question: {question}\n\n"]
        
        if context and context.get('similar_questions'):
            prompt_parts.append("Here are some similar questions and their answers from our knowledge base:\n")
            for i, qa in enumerate(context['similar_questions'][:3], 1):
                prompt_parts.append(f"Similar Q{i}: {qa['question']}")
                prompt_parts.append(f"Answer {i}: {qa['answer']}\n")
            prompt_parts.append("\nBased on these similar questions and answers, as well as your general knowledge, please provide a comprehensive answer to the original question.")
        else:
            prompt_parts.append("\nPlease provide a comprehensive answer to this question based on your general knowledge.")
            
        return "\n".join(prompt_parts) 