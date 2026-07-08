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
        ("NEEDS_CONFIRMATION", "Needs Confirmation"),
        ("SENT", "Sent"),
        ("FAILED", "Failed"),
        ("CANCELLED", "Cancelled"),
    ]

    class ReminderType(models.TextChoices):
        SCHEDULE_EMAIL = "SCHEDULE_EMAIL", "Schedule an Email"
        REMIND_ME = "REMIND_ME", "Remind Me"
        MEETING = "MEETING", "Meeting"

    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AI_DETECTED = "AI_DETECTED", "AI Detected"

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
    # MEETING: same as REMIND_ME (no email sent), but created
    #   automatically by the AI pipeline after it noticed a meeting
    #   mentioned in an incoming email.
    reminder_type = models.CharField(
        max_length=20,
        choices=ReminderType.choices,
        default=ReminderType.SCHEDULE_EMAIL,
    )

    # Where this reminder came from. AI_DETECTED reminders were
    # created by the automation pipeline, not typed in by the user.
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )

    # The email this reminder was extracted from, if any. Kept so the
    # UI can link back to "why was this created".
    source_email = models.ForeignKey(
        "emails.EmailMetadata",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_reminders",
    )

    # Gemini's confidence (0-1) that this meeting time is correct.
    # Only meaningful for AI_DETECTED reminders.
    ai_confidence = models.FloatField(
        default=0.0,
        blank=True,
    )

    recipient = models.EmailField(blank=True)

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