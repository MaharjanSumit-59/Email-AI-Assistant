from .prompts import analyze_email
from .services import GeminiService


class EmailClassifier:
    """
    Handles email classification using Gemini.
    Responsible only for generating and validating
    classification results.
    """

    VALID_CATEGORIES = {
        "Work",
        "Personal",
        "Finance",
        "Promotion",
        "Shopping",
        "Travel",
        "Updates",
        "Social",
        "Spam",
    }

    VALID_PRIORITIES = {
        "High",
        "Medium",
        "Low",
    }

    VALID_IMPORTANCE = {
        "Important",
        "Routine",
    }

    VALID_ACTIONS = {
        "draft",
        "auto_send",
    }

    def __init__(self):
        self.ai = GeminiService()

    def classify(self, email_body):

        prompt = analyze_email(email_body)

        result = self.ai.generate(
            prompt=prompt,
            response_type="json",
        )

        return self.validate(result)

    def validate(self, result):

        category = result.get("category", "Updates")
        priority = result.get("priority", "Medium")
        importance = result.get("importance", "Routine")
        action = result.get("action", "draft")
        confidence = result.get("confidence", 0.5)

        if category not in self.VALID_CATEGORIES:
            category = "Updates"

        if priority not in self.VALID_PRIORITIES:
            priority = "Medium"

        if importance not in self.VALID_IMPORTANCE:
            importance = "Routine"

        if action not in self.VALID_ACTIONS:
            action = "draft"

        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.5

        confidence = max(0.0, min(1.0, confidence))

        return {
            "category": category,
            "priority": priority,
            "importance": importance,
            "confidence": confidence,
            "action": action,
        }