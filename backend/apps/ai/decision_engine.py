import json

from apps.ai.prompts import analyze_email
from apps.ai.services import GeminiService


class DecisionEngine:

    def __init__(self):
        self.ai = GeminiService()

    def analyze(self, email_body):

        prompt = analyze_email(email_body)

        response = self.ai.generate(prompt).strip()
        
         # Remove markdown code fences if present
        if response.startswith("```"):
            response = response.removeprefix("```json").removeprefix("```")
            response = response.removesuffix("```")
            response = response.strip()

        print("=" * 80)
        print("RAW GEMINI RESPONSE:")
        print(response)
        print("=" * 80)

        return self.ai.generate(
            prompt=prompt,
            response_type="json",
        )