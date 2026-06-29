from apps.ai.services import GeminiService
from apps.ai.prompts import summarize_email


class EmailSummarizer:
    """
    Handles email summarization using Gemini.
    """

    def __init__(self):
        self.ai = GeminiService()

    def summarize(self, email_body: str) -> str:
        prompt = summarize_email(email_body)
        
        summary = self.ai.generate(
            prompt,
            response_type="text",
        )

        return summary