from apps.ai.prompts import summarize_email

from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class EmailSummarizer:

    def __init__(self):

        self.ai = GeminiService()

    def summarize(self, email_metadata, email_body, parts=None, attachment_context=""):

        has_attachments = bool(parts) or bool(attachment_context)

        # Cached summaries were generated from the email body alone.
        # Skip the cache whenever attachments are involved, so an
        # attachment-aware summary is never silently swapped out for
        # a stale "body only" one (and vice versa).
        if not has_attachments:
            summary = AIAnalysisService.get_summary(
                email_metadata
            )

            if summary:
                return summary

        prompt = summarize_email(
            email_body,
            attachment_context=attachment_context,
            has_binary_attachments=bool(parts),
        )

        summary = self.ai.generate(
            prompt,
            response_type="text",
            parts=parts,
        )

        if not has_attachments:
            AIAnalysisService.save_summary(
                email_metadata,
                summary,
            )

        return summary