from .prompts import extract_tasks
from .services import (
    GeminiService,
    AIAnalysisService,
)


class TaskExtractor:
    """
    Extracts action items from an email and stores them.
    """

    def __init__(self):
        self.ai = GeminiService()

    def extract(self, email_metadata, email_body):

        # Check cache first
        tasks = AIAnalysisService.get_tasks(
            email_metadata
        )

        if tasks:
            return tasks

        prompt = extract_tasks(email_body)

        tasks = self.ai.generate(
            prompt=prompt,
            response_type="json",
        )

        if not isinstance(tasks, list):
            tasks = []

        AIAnalysisService.save_tasks(
            email_metadata,
            tasks,
        )

        return tasks