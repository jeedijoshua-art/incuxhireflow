import os
import json
from typing import Type, TypeVar
from pydantic import BaseModel
import google.generativeai as genai
from groq import Groq
from dotenv import load_dotenv

T = TypeVar('T', bound=BaseModel)

class AIHelper:
    """
    Utility helper to route AI requests to Gemini or Groq dynamically.
    Provides robust fallback handling when API keys or models are not working.
    """
    def __init__(self):
        # Search for .env in common locations so the key is found regardless of
        # which module is imported first.
        candidate_paths = [
            os.path.join(os.path.dirname(__file__), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "api", ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        ]
        for env_path in candidate_paths:
            if os.path.isfile(env_path):
                load_dotenv(env_path)
                if os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY"):
                    break

        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        
        print("Gemini Loaded:", bool(self.gemini_key))
        print("Groq Loaded:", bool(self.groq_key))
        
        # Configure Gemini
        self.gemini_available = False
        if self.gemini_key:
            try:
                genai.configure(api_key=self.gemini_key)
                self.gemini_available = True
            except Exception as e:
                print(f"[AIHelper] Failed to configure Gemini: {e}")
        
        # Configure Groq
        self.groq_client = None
        if self.groq_key:
            try:
                self.groq_client = Groq(api_key=self.groq_key)
            except Exception as e:
                print(f"[AIHelper] Failed to configure Groq: {e}")

    def generate_structured_output(
        self, 
        prompt: str, 
        schema_class: Type[T], 
        system_prompt: str = "You are a helpful assistant."
    ) -> T:
        """
        Generates structured JSON output validating against the provided schema class.
        Tries Gemini first, falls back to Groq Llama 3.3.
        """
        # Try Gemini first if it is available and not known to fail
        if self.gemini_available:
            try:
                # Use gemini-1.5-flash
                model = genai.GenerativeModel(
                    "gemini-1.5-flash",
                    system_instruction=system_prompt
                )
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=schema_class
                    )
                )
                if response.text:
                    return schema_class.model_validate_json(response.text)
            except Exception as e:
                print(f"[AIHelper] Gemini failed, falling back to Groq: {e}")
                # We can mark Gemini as unavailable for this session to save time on subsequent calls
                self.gemini_available = False

        # Fallback to Groq
        if self.groq_client:
            try:
                schema_json = json.dumps(schema_class.model_json_schema(), indent=2)
                groq_prompt = f"""
                {prompt}
                
                You must output raw JSON conforming to this schema:
                {schema_json}
                
                Do not include any markdown formatting, code block markers (like ```json), or preamble. Return ONLY valid JSON.
                """
                
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": groq_prompt}
                ]
                
                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                
                content = response.choices[0].message.content.strip()
                return schema_class.model_validate_json(content)
            except Exception as e:
                print(f"[AIHelper] Groq fallback failed: {e}")
                raise e
        
        raise ValueError("Neither Gemini nor Groq API is available or functional.")

    def generate_text(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        """
        Generates raw text. Tries Gemini first, falls back to Groq Llama 3.3.
        """
        if self.gemini_available:
            try:
                model = genai.GenerativeModel(
                    "gemini-1.5-flash",
                    system_instruction=system_prompt
                )
                response = model.generate_content(prompt)
                if response.text:
                    return response.text.strip()
            except Exception as e:
                print(f"[AIHelper] Gemini text generation failed, falling back to Groq: {e}")
                self.gemini_available = False

        if self.groq_client:
            try:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"[AIHelper] Groq text fallback failed: {e}")
                raise e
                
        raise ValueError("Neither Gemini nor Groq API is available or functional.")
