from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    email = models.EmailField(unique=True)

    google_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    profile_picture = models.URLField(
        blank=True,
        null=True,
    )

    gmail_connected = models.BooleanField(
        default=False,
    )

    # master switch for the AI automation pipeline (auto-reply / draft
    # generation). Off by default risk is avoided by defaulting True,
    # matching the existing migration; user can flip it off in Settings.
    automation_enabled = models.BooleanField(
        default=True,
    )

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email