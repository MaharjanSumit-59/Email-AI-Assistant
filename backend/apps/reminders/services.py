from django.utils import timezone

from .models import Reminder
from apps.emails.services.gmail_service import GmailService


class ReminderService:

    @staticmethod
    def send_scheduled_email(reminder: Reminder):
        """
        Send the scheduled email using the Emails app.
        """

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
    def mark_as_failed(reminder: Reminder):

        reminder.status = "FAILED"

        reminder.save(
            update_fields=[
                "status",
            ]
        )