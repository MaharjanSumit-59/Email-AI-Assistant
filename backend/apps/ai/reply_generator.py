from apps.ai.prompts import generate_reply

from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class EmailReplyGenerator:

    def __init__(self):

        self.ai = GeminiService()

    def generate(self, email_metadata, email_body):

        reply = AIAnalysisService.get_reply(
            email_metadata
        )

        if reply:
            return reply

        prompt = generate_reply(email_body)

        reply = self.ai.generate(
            prompt,
            response_type="text",
        )

        AIAnalysisService.save_reply(
            email_metadata,
            reply,
        )

        return reply