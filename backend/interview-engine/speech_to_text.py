import os
# pyrefly: ignore [missing-import]
from groq import Groq
from dotenv import load_dotenv

class SpeechToText:
    """
    Transcribes candidate spoken audio to text using Groq Whisper Large v3 API.
    """
    def __init__(self):
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        if not self.client:
            print("[!] Warning: GROQ_API_KEY is not set. Whisper STT transcription will not work.")

    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe the audio file at the given path.
        """
        if not self.client:
            raise ValueError("Groq client not initialized. Ensure GROQ_API_KEY is configured in .env.")
        
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        try:
            filename = os.path.basename(audio_file_path)
            with open(audio_file_path, "rb") as file:
                # Call Groq Whisper API
                transcription = self.client.audio.transcriptions.create(
                    file=(filename, file.read()),
                    model="whisper-large-v3",
                    response_format="json"
                )
                return transcription.text.strip()
        except Exception as e:
            print(f"Error during audio transcription via Groq: {e}")
            raise e
