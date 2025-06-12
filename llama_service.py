import subprocess
import json
from typing import Dict, Optional
import requests

class LlamaService:
    def __init__(self, host: str = "localhost", port: int = 11434):
        """
        Initialize the Llama service using Ollama API.
        
        Args:
            host (str): Ollama server host
            port (int): Ollama server port
        """
        self.base_url = f"http://{host}:{port}"
        
    def generate_answer(self, question: str, context: Dict = None) -> Dict:
        """
        Generate an answer using the Llama model via Ollama API.
        
        Args:
            question (str): The question to answer
            context (Dict, optional): Additional context like similar questions/answers
            
        Returns:
            Dict: Contains the generated answer and metadata
        """
        try:
            # Construct the prompt with context if available
            prompt = self._construct_prompt(question, context)
            
            # Prepare the request
            url = f"{self.base_url}/api/generate"
            data = {
                "model": "llama2",
                "prompt": prompt,
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 50,
                "num_predict": 500,
                "repeat_penalty": 1.1
            }
            
            # Make the API request
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            # Parse the response
            response_data = response.json()
            answer = response_data.get('response', '')
            
            return {
                'answer': answer,
                'is_ai_generated': True,
                'confidence': 0.8 if context and context.get('similar_questions') else 0.6,
                'source': 'llama2'
            }
            
        except requests.RequestException as e:
            print(f"Error calling Ollama API: {str(e)}")
            return {
                'answer': "Error generating answer with AI. Please try again.",
                'is_ai_generated': True,
                'confidence': 0.0,
                'source': 'error'
            }
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return {
                'answer': "Error generating answer with AI. Please try again.",
                'is_ai_generated': True,
                'confidence': 0.0,
                'source': 'error'
            }
            
    def _construct_prompt(self, question: str, context: Dict = None) -> str:
        """
        Construct a prompt for Llama using the question and available context.
        Uses Llama 2's instruction format.
        """
        system_prompt = "You are a helpful assistant that answers questions based on provided context and your knowledge. Always provide accurate and relevant information."
        
        if context and context.get('similar_questions'):
            context_str = "\nRelevant context:\n"
            for i, qa in enumerate(context['similar_questions'][:3], 1):
                context_str += f"Q{i}: {qa['question']}\nA{i}: {qa['answer']}\n\n"
            
            prompt = f"""[INST] <<SYS>>{system_prompt}<</SYS>>

{context_str}

{question} [/INST]"""
        else:
            prompt = f"""[INST] <<SYS>>{system_prompt}<</SYS>>

{question} [/INST]"""
        
        return prompt 