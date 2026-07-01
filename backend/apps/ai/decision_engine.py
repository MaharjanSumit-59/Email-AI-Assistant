from apps.ai.prompts import analyze_email
from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class DecisionEngine:

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

    def validate(self, result: dict) -> dict:
        """
        Validates and fixes Gemini JSON output.
        """

        # ---------- Category ----------
        category = result.get("category", "Updates")

        if category not in self.VALID_CATEGORIES:
            category = "Updates"

        # ---------- Priority ----------
        priority = result.get("priority", "Medium")

        if priority not in self.VALID_PRIORITIES:
            priority = "Medium"

        # ---------- Importance ----------
        importance = result.get("importance", "Routine")

        if importance not in self.VALID_IMPORTANCE:
            importance = "Routine"

        # ---------- Action ----------
        action = result.get("action", "draft")

        if action not in self.VALID_ACTIONS:
            action = "draft"

        # ---------- Confidence ----------
        confidence = result.get("confidence", 0.5)

        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.5

        if confidence < 0:
            confidence = 0.0

        if confidence > 1:
            confidence = 1.0

        return {
            "category": category,
            "priority": priority,
            "importance": importance,
            "confidence": confidence,
            "action": action,
        }

    def analyze(self, email_metadata, email_body):

        decision = AIAnalysisService.get_decision(
            email_metadata
        )

        if decision:

            return decision

        prompt = analyze_email(email_body)

        result = self.ai.generate(
            prompt=prompt,
            response_type="json",
        )

        # Validate Gemini output
        result = self.validate(result)

        # Save validated result
        AIAnalysisService.save_decision(
            email_metadata,
            result,
        )

        return result