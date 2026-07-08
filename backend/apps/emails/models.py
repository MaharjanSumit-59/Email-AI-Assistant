from django.conf import settings
from django.db import models


class EmailMetadata(models.Model):
    """
    Stores lightweight metadata about Gmail messages.
    The full email body remains in Gmail.
    """
    # owner of the email metadata, linked to the user model
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="emails"
    )

    # gmail's unique message ID for the email, used to fetch the full email body from Gmail
    gmail_message_id = models.CharField(
        max_length=255,
        unique=True
    )

    #used when replying to the same conversation
    thread_id = models.CharField(
        max_length=255
    )

    # email subject
    subject = models.CharField(
        max_length=255,
        blank=True
    )

    # sender's email address
    sender = models.EmailField()

    # recipient's email address
    receiver = models.EmailField()

    # short preview shown in inbox
    snippet = models.TextField(
        blank=True
    )

    # Reserved for ai app
    category = models.CharField(
        max_length=50,
        blank=True
    )

    priority = models.CharField(
        max_length=20,
        blank=True
    )

    # whether the email is starred
    starred = models.BooleanField(
        default=False
    )

    # original receive time
    received_at = models.DateTimeField()

    # time the metadata was stored locally
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    # set once the AI automation pipeline has classified/replied to
    # this email, so the same message is never processed twice
    ai_processed = models.BooleanField(
        default=False
    )

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return self.subject or self.gmail_message_id