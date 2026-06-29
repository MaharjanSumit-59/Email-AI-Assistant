from apps.ai.services import GeminiService
from apps.ai.prompts import generate_reply


class EmailReplyGenerator:
    """
    Generates professional replies using Gemini.
    """

    def __init__(self):
        self.ai = GeminiService()

    def generate(self, email_body: str) -> str:
        prompt = generate_reply(email_body)

        reply = self.ai.generate(
            prompt,
            response_type="text",
        )
        return reply