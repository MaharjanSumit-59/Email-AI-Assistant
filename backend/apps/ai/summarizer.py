from apps.ai.prompts import summarize_email

from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class EmailSummarizer:

    def __init__(self):

        self.ai = GeminiService()

    def summarize(self, email_metadata, email_body):

        summary = AIAnalysisService.get_summary(
            email_metadata
        )

        if summary:
            return summary
        
        prompt = summarize_email(email_body)

        summary = self.ai.generate(
            prompt,
            response_type="text",
        )

        AIAnalysisService.save_summary(
            email_metadata,
            summary,
        )

        return summary