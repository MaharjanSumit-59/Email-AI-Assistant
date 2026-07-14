from apps.ai.prompts import translate_email

from apps.ai.services import (
    GeminiService,
    AIAnalysisService,
)


class EmailTranslator:

    def __init__(self):

        self.ai = GeminiService()

    def translate(self, email_metadata, email_body):

        cached = AIAnalysisService.get_translation(
            email_metadata
        )

        if cached:
            return cached

        prompt = translate_email(email_body)

        result = self.ai.generate(
            prompt,
            response_type="json",
        )

        detected_language = result.get("detected_language", "") or "Unknown"
        translated_text = result.get("translated_text", "")

        AIAnalysisService.save_translation(
            email_metadata,
            detected_language,
            translated_text,
        )

        return {
            "detected_language": detected_language,
            "translated_text": translated_text,
        }