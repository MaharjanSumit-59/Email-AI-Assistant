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

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders"
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