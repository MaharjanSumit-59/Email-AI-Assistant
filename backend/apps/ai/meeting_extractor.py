from datetime import datetime

from .prompts import extract_meeting
from .services import GeminiService


class MeetingExtractor:
    """
    Reads an email and asks Gemini whether it describes a meeting,
    and if so, resolves a concrete date/time for it.

    Unlike TaskExtractor / EmailClassifier, this isn't cached on
    AIAnalysis - it's only ever called once per email from the
    automation pipeline right after the email is first seen.
    """

    def __init__(self):
        self.ai = GeminiService()

    def extract(self, email_body, reference_datetime=None):

        reference_datetime = reference_datetime or datetime.now()

        prompt = extract_meeting(
            email_body,
            reference_date=reference_datetime.strftime("%Y-%m-%d"),
            reference_weekday=reference_datetime.strftime("%A"),
        )

        result = self.ai.generate(
            prompt=prompt,
            response_type="json",
        )

        return self.validate(result)

    def validate(self, result):

        if not isinstance(result, dict):
            result = {}

        has_meeting = bool(result.get("has_meeting", False))

        title = result.get("title") or ""
        date = result.get("date") or None
        time = result.get("time") or None

        try:
            duration_minutes = int(result.get("duration_minutes") or 30)
        except (TypeError, ValueError):
            duration_minutes = 30

        duration_minutes = max(5, min(duration_minutes, 8 * 60))

        is_time_explicit = bool(result.get("is_time_explicit", False)) and bool(date) and bool(time)

        attendees = result.get("attendees")
        if not isinstance(attendees, list):
            attendees = []
        attendees = [a for a in attendees if isinstance(a, str) and "@" in a]

        try:
            confidence = float(result.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0

        confidence = max(0.0, min(1.0, confidence))

        if not date:
            has_meeting = False

        return {
            "has_meeting": has_meeting,
            "title": title.strip()[:200],
            "date": date,
            "time": time,
            "duration_minutes": duration_minutes,
            "is_time_explicit": is_time_explicit,
            "attendees": attendees,
            "confidence": confidence,
        }