from .prompts import extract_tasks
from .services import (
    GeminiService,
    AIAnalysisService,
)


class TaskExtractor:
    """
    Extracts action items from an email (and its attachments) and
    stores them.
    """

    def __init__(self):
        self.ai = GeminiService()

    def extract(self, email_metadata, email_body, parts=None, attachment_context=""):

        has_attachments = bool(parts) or bool(attachment_context)

        # Skip the cache when attachments are involved, same reasoning
        # as EmailSummarizer/EmailReplyGenerator.
        if not has_attachments:
            tasks = AIAnalysisService.get_tasks(
                email_metadata
            )

            if tasks:
                return tasks

        prompt = extract_tasks(
            email_body,
            attachment_context=attachment_context,
            has_binary_attachments=bool(parts),
        )

        tasks = self.ai.generate(
            prompt=prompt,
            response_type="json",
            parts=parts,
        )

        if not isinstance(tasks, list):
            tasks = []

        if not has_attachments:
            AIAnalysisService.save_tasks(
                email_metadata,
                tasks,
            )

        return tasks