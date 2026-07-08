import logging
from datetime import datetime, timedelta

from django.utils import timezone

from .models import Reminder
from apps.emails.services.gmail_service import GmailService

logger = logging.getLogger(__name__)

EVENT_DURATION_MINUTES = 30
REMINDER_LEAD_MINUTES = 30
# Below this confidence, or when the email didn't give an explicit
# date+time, a detected meeting is parked as NEEDS_CONFIRMATION
# instead of being put straight on the calendar.
MEETING_AUTO_CONFIRM_THRESHOLD = 0.7


class ReminderService:

    @staticmethod
    def process_due_reminder(reminder: Reminder):
        """
        Executes what happens when a reminder becomes due.
        """

        if reminder.reminder_type == Reminder.ReminderType.SCHEDULE_EMAIL:
            gmail = GmailService(reminder.user)

            gmail.send_email(
                to=reminder.recipient,
                subject=reminder.subject,
                body=reminder.body,
            )

        reminder.status = "SENT"
        reminder.sent_at = timezone.now()

        reminder.save(
            update_fields=[
                "status",
                "sent_at",
            ]
        )

    @staticmethod
    def create_calendar_event(reminder: Reminder):
        """
        Create the Google Calendar event for a reminder at the time
        it's scheduled.
        """

        from .calendar_service import CalendarService

        try:
            calendar = CalendarService(reminder.user)

            end_time = reminder.scheduled_time + timedelta(
                minutes=EVENT_DURATION_MINUTES
            )

            event = calendar.create_event(
                title=reminder.subject,
                description=reminder.body,
                start_time=reminder.scheduled_time,
                end_time=end_time,
                reminder_minutes_before=REMINDER_LEAD_MINUTES,
            )

            reminder.calendar_event_id = event.get("id")
            reminder.save(update_fields=["calendar_event_id"])

        except Exception:
            import traceback
            print(f"Failed to create calendar event for reminder {reminder.id}:")
            traceback.print_exc()
            logger.exception(
                "Failed to create calendar event at scheduling time "
                "for reminder %s",
                reminder.id,
            )

    @staticmethod
    def check_conflicts(reminder: Reminder, duration_minutes=EVENT_DURATION_MINUTES):
        """
        Check the user's Google Calendar for any existing events that
        overlap this reminder's proposed time window. Returns a list
        of conflict dicts (empty list if none, or if the check itself
        fails).
        """

        from .calendar_service import CalendarService

        end_time = reminder.scheduled_time + timedelta(minutes=duration_minutes)

        try:
            calendar = CalendarService(reminder.user)
            events = calendar.list_events_in_range(
                reminder.scheduled_time,
                end_time,
            )

            conflicts = []
            for event in events:
                if event.get("id") == reminder.calendar_event_id:
                    continue

                start = event.get("start", {})
                end = event.get("end", {})

                conflicts.append({
                    "event_id": event.get("id"),
                    "title": event.get("summary") or "(no title)",
                    "start": start.get("dateTime") or start.get("date"),
                    "end": end.get("dateTime") or end.get("date"),
                })

            return conflicts

        except Exception:
            import traceback
            print(f"Conflict check failed for reminder {reminder.id}:")
            traceback.print_exc()
            return []

    @staticmethod
    def mark_as_failed(reminder: Reminder):

        reminder.status = "FAILED"

        reminder.save(
            update_fields=[
                "status",
            ]
        )

    # ------------------------------------------------------------
    # AI MEETING DETECTION
    # ------------------------------------------------------------
    @staticmethod
    def create_from_meeting(user, email_metadata, meeting):
        """
        Turn a validated MeetingExtractor result into a Reminder.

        If Gemini gave us an explicit date + time and is reasonably
        confident, the reminder goes straight to Google Calendar. If
        it's vague (no time, or low confidence), it's saved as
        NEEDS_CONFIRMATION so the user can review/adjust the time in
        the Reminders page before anything touches their calendar.
        """

        scheduled_time = ReminderService._resolve_meeting_time(meeting)

        if scheduled_time is None:
            return None

        # Never silently duplicate: if we already made a reminder
        # from this exact email, don't make another one.
        existing = Reminder.objects.filter(
            source_email=email_metadata,
            source=Reminder.Source.AI_DETECTED,
        ).first()

        if existing:
            return existing

        is_confident = (
            meeting["is_time_explicit"]
            and meeting["confidence"] >= MEETING_AUTO_CONFIRM_THRESHOLD
            and scheduled_time > timezone.now()
        )

        reminder = Reminder.objects.create(
            user=user,
            reminder_type=Reminder.ReminderType.MEETING,
            source=Reminder.Source.AI_DETECTED,
            source_email=email_metadata,
            ai_confidence=meeting["confidence"],
            recipient=user.email or "",
            subject=meeting["title"] or (email_metadata.subject or "Meeting"),
            body=(
                f"Detected automatically from an email: \"{email_metadata.subject}\"."
            ),
            scheduled_time=scheduled_time,
            status="PENDING" if is_confident else "NEEDS_CONFIRMATION",
        )

        if is_confident:
            ReminderService.create_calendar_event(reminder)

        return reminder

    @staticmethod
    def confirm(reminder: Reminder, scheduled_time=None):
        """
        User has reviewed a NEEDS_CONFIRMATION reminder (optionally
        correcting the time) and wants it on the calendar now.
        """

        if scheduled_time is not None:
            reminder.scheduled_time = scheduled_time

        reminder.status = "PENDING"
        reminder.save(update_fields=["scheduled_time", "status"])

        if not reminder.calendar_event_id:
            ReminderService.create_calendar_event(reminder)

        return reminder

    @staticmethod
    def _resolve_meeting_time(meeting):
        """
        Combine the extracted date (+ optional time) into an
        aware datetime. Meetings without a time default to 9:00 AM
        local time, which also forces is_confident to False upstream
        via is_time_explicit.
        """

        date_str = meeting.get("date")

        if not date_str:
            return None

        time_str = meeting.get("time") or "09:00"

        try:
            naive = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            return None

        current_tz = timezone.get_current_timezone()

        return timezone.make_aware(naive, current_tz)