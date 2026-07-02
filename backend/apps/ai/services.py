import json

from django.conf import settings

from google import genai
from google.genai import types

from rest_framework.exceptions import APIException

from .models import AIAnalysis
from apps.emails.models import EmailMetadata


class GeminiService:

    def __init__(self):

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    def generate(
        self,
        prompt,
        response_type="text",
        system_instruction=None,
    ):

        try:

            if system_instruction:
                prompt = (
                    system_instruction
                    + "\n\n"
                    + prompt
                )

            config = None

            if response_type == "json":

                config = types.GenerateContentConfig(
                    response_mime_type="application/json"
                )

            response = self.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )

            text = (response.text or "").strip()

            if response_type == "json":

                try:
                    return json.loads(text)

                except json.JSONDecodeError:

                    raise APIException(
                        "Gemini returned invalid JSON."
                    )

            return text

        except Exception as e:

            raise APIException(str(e))


class AIAnalysisService:
    """
    Handles all database operations for AIAnalysis.
    """

    @staticmethod
    def get_or_create(email):

        analysis, created = AIAnalysis.objects.get_or_create(
            email=email
        )

        return analysis

    # --------------------------------------------------
    # GET METHODS
    # --------------------------------------------------

    @staticmethod
    def get_summary(email):

        analysis = AIAnalysisService.get_or_create(email)

        return analysis.summary

    @staticmethod
    def get_reply(email):

        analysis = AIAnalysisService.get_or_create(email)

        return analysis.generated_reply

    @staticmethod
    def get_decision(email):

        analysis = AIAnalysisService.get_or_create(email)

        if (
            analysis.category
            and analysis.priority
            and analysis.importance
        ):

            return {
                "category": analysis.category,
                "priority": analysis.priority,
                "importance": analysis.importance,
                "confidence": analysis.confidence,
                "action": analysis.suggested_action,
            }

        return None

    @staticmethod
    def get_tasks(email):

        analysis = AIAnalysisService.get_or_create(
            email
        )

        if analysis.extracted_tasks:
            return analysis.extracted_tasks

        return None

    # --------------------------------------------------
    # SAVE METHODS
    # --------------------------------------------------

    @staticmethod
    def save_summary(email, summary):

        analysis = AIAnalysisService.get_or_create(email)

        analysis.summary = summary

        analysis.save()

        return analysis

    @staticmethod
    def save_reply(email, reply):

        analysis = AIAnalysisService.get_or_create(email)

        analysis.generated_reply = reply

        analysis.save()

        return analysis

    @staticmethod
    def save_decision(email, decision):

        analysis = AIAnalysisService.get_or_create(email)

        analysis.category = decision["category"]

        analysis.priority = decision["priority"]

        analysis.importance = decision["importance"]

        analysis.confidence = decision["confidence"]

        analysis.suggested_action = decision["action"]

        analysis.save()

        return analysis

    @staticmethod
    def save_tasks(email, tasks):

        analysis = AIAnalysisService.get_or_create(email)

        analysis.extracted_tasks = tasks

        analysis.save()

        return analysis