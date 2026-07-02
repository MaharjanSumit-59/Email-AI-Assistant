from django.conf import settings
from django.db import models


class GoogleToken(models.Model):
    """
    Stores OAuth credentials for a user's connected Google account.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="google_token",
    )

    access_token = models.TextField()

    refresh_token = models.TextField(
        blank=True,
        null=True,
    )

    # Time when the current access token expires.
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    scope = models.TextField()

    token_type = models.CharField(
        max_length=50,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.user.email} Google Token"