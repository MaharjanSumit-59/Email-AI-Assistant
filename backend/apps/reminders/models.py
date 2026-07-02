from django.conf import settings
from django.db import models


class Reminder(models.Model):

    calendar_event_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SENT", "Sent"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
    ]

    class ReminderType(models.TextChoices):
        SCHEDULE_EMAIL = "SCHEDULE_EMAIL", "Schedule an Email"
        REMIND_ME = "REMIND_ME", "Remind Me"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders"
    )

    # SCHEDULE_EMAIL: the drafted email below is actually sent to
    #   `recipient` at scheduled_time, via Gmail.
    # REMIND_ME: no email is ever sent — this exists purely as a
    #   personal reminder. subject/body still get used as the title
    #   and description of the Calendar event.
    reminder_type = models.CharField(
        max_length=20,
        choices=ReminderType.choices,
        default=ReminderType.SCHEDULE_EMAIL,
    )

    recipient = models.EmailField()

    subject = models.CharField(max_length=255)

    body = models.TextField()

    scheduled_time = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.subject} ({self.status})"