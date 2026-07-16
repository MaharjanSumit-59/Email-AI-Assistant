from apps.ai.prompts import generate_reply

from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class EmailReplyGenerator:

    def __init__(self):

        self.ai = GeminiService()

    def generate(self, email_metadata, email_body, parts=None, attachment_context=""):

        has_attachments = bool(parts) or bool(attachment_context)

        # Same reasoning as EmailSummarizer: an attachment-aware draft
        # shouldn't be served from (or overwrite) the plain-text cache.
        if not has_attachments:
            reply = AIAnalysisService.get_reply(
                email_metadata
            )

            if reply:
                return reply

        prompt = generate_reply(
            email_body,
            attachment_context=attachment_context,
            has_binary_attachments=bool(parts),
        )

        reply = self.ai.generate(
            prompt,
            response_type="text",
            parts=parts,
        )

        if not has_attachments:
            AIAnalysisService.save_reply(
                email_metadata,
                reply,
            )

        return reply    