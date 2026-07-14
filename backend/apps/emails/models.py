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

    # whether this email currently sits in the Trash (Gmail's TRASH
    # label). Kept locally so we can time the auto-clear countdown
    # without an extra Gmail round trip on every page load.
    is_trashed = models.BooleanField(
        default=False
    )

    # when the email was first noticed in Trash. Gmail's API doesn't
    # expose a "trashed at" timestamp, so this is set the moment our
    # app trashes the message (or first sees it trashed). Used to
    # calculate when auto-clear should permanently delete it.
    trashed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return self.subject or self.gmail_message_id