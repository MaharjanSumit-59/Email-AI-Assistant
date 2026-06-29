import json

from django.conf import settings
from google import genai
from google.genai import types


class GeminiService:

    def __init__(self):
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    def generate(
        self,
        prompt: str,
        response_type: str = "text",
        system_instruction: str | None = None,
    ):
        """
        response_type:
            text -> returns string
            json -> returns parsed dict/list
        """

        if system_instruction:
            prompt = f"{system_instruction}\n\n{prompt}"

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
            return json.loads(text)

        return text