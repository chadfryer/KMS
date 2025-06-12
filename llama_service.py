import subprocess
import json
from typing import Dict, Optional
import requests

class LlamaService:
    def __init__(self, model_variant: str = "latest"):
        """
        Initialize the Llama service using Docker Model Runner.
        
        Args:
            model_variant (str): Which model variant to use:
                - "latest": Latest optimized version
                - "7B-Q4_K_M": 4-bit quantized (smaller, faster)
                - "7B-Q8_0": 8-bit quantized (better quality)
        """
        self.model_variant = model_variant
        # Ensure model is pulled
        subprocess.run(["docker", "model", "pull", f"ai/llama3.3:{model_variant}"], check=True)
        
    def generate_answer(self, question: str, context: Dict = None) -> Dict:
        """
        Generate an answer using the Llama model via Docker Model Runner.
        
        Args:
            question (str): The question to answer
            context (Dict, optional): Additional context like similar questions/answers
            
        Returns:
            Dict: Contains the generated answer and metadata
        """
        try:
            # Construct the prompt with context if available
            prompt = self._construct_prompt(question, context)
            
            # Prepare the command with model parameters
            cmd = [
                "docker", "model", "run",
                f"ai/llama3.3:{self.model_variant}",
                "--temperature", "0.7",
                "--top-p", "0.95",
                "--top-k", "50",
                "--max-tokens", "500",
                "--repeat-penalty", "1.1",
                "--prompt", prompt
            ]
            
            # Run the model and capture output
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            response = result.stdout.strip()
            
            # Parse the response if it's JSON
            try:
                response_data = json.loads(response)
                answer = response_data.get('text', response)
            except json.JSONDecodeError:
                answer = response
            
            return {
                'answer': answer,
                'is_ai_generated': True,
                'confidence': 0.8 if context and context.get('similar_questions') else 0.6,
                'source': 'llama3.3'
            }
            
        except subprocess.CalledProcessError as e:
            print(f"Error running Llama model: {e.stderr}")
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
        Uses Llama 3.3's instruction format.
        """
        system_prompt = "You are a helpful assistant that answers questions based on provided context and your knowledge. Always provide accurate and relevant information."
        
        if context and context.get('similar_questions'):
            context_str = "\nRelevant context:\n"
            for i, qa in enumerate(context['similar_questions'][:3], 1):
                context_str += f"Q{i}: {qa['question']}\nA{i}: {qa['answer']}\n\n"
            
            prompt = f"""<|system|>{system_prompt}</|system|>
<|context|>{context_str}</|context|>
<|user|>{question}</|user|>
<|assistant|>"""
        else:
            prompt = f"""<|system|>{system_prompt}</|system|>
<|user|>{question}</|user|>
<|assistant|>"""
        
        return prompt 