import logging
from datetime import timedelta

from django.utils import timezone

from .models import Reminder
from apps.emails.services.gmail_service import GmailService

logger = logging.getLogger(__name__)

# Calendar event length. Reminders don't have a natural "duration" —
# we just need something visible on the calendar rather than a
# zero-length sliver, and 30 minutes is a sane default block.
EVENT_DURATION_MINUTES = 30

# How far in advance Google Calendar should notify the user.
REMINDER_LEAD_MINUTES = 30


class ReminderService:

    @staticmethod
    def process_due_reminder(reminder: Reminder):
        """
        Executes what happens when a reminder becomes due.

        - SCHEDULE_EMAIL: actually sends the drafted email via Gmail.
        - REMIND_ME: no email is sent. The user is notified purely
          via the Calendar popup reminder that was already attached
          when the reminder was created.
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
        it's scheduled (not when it's sent/triggered).

        Failure here should not block reminder creation. There's a
        fallback in the Celery task that retries this at trigger
        time if calendar_event_id is still empty.
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
            print(
                f"Failed to create calendar event for reminder "
                f"{reminder.id}:"
            )
            traceback.print_exc()
            logger.exception(
                "Failed to create calendar event at scheduling time "
                "for reminder %s",
                reminder.id,
            )

    @staticmethod
    def mark_as_failed(reminder: Reminder):

        reminder.status = "FAILED"

        reminder.save(
            update_fields=[
                "status",
            ]
        )