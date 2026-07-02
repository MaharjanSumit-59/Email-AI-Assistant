import logging
from datetime import timedelta

from django.utils import timezone

from .models import Reminder
from apps.emails.services.gmail_service import GmailService

logger = logging.getLogger(__name__)

EVENT_DURATION_MINUTES = 30
REMINDER_LEAD_MINUTES = 30


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