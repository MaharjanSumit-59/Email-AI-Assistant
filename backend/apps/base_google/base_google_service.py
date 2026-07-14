from datetime import timezone as py_timezone

from django.conf import settings
from django.utils import timezone as dj_timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from rest_framework.exceptions import APIException

from apps.authentication.models import GoogleToken


class BaseGoogleService:
    """
    Base class for all Google API services.

    Responsibilities:
    - Load stored OAuth tokens
    - Build Google Credentials object
    - Refresh expired access tokens
    - Persist refreshed tokens
    """

    def __init__(self, user):
        self.user = user

        try:
            self.google_token = GoogleToken.objects.get(user=user)
        except GoogleToken.DoesNotExist:
            raise APIException("Google account is not connected.")

        # ---- SCOPES ----
        scopes = (
            self.google_token.scope.split()
            if self.google_token.scope
            else getattr(settings, "GOOGLE_SCOPES", [])
        )

        # ---- BUILD CREDENTIALS ----
        # google-auth's Credentials.expired property compares its
        # `expiry` against a naive UTC datetime internally. Django
        # stores expires_at as timezone-aware (USE_TZ=True), so it
        # must be converted to naive here or `.expired` raises
        # TypeError: can't compare offset-naive and offset-aware
        # datetimes.
        expiry = self.google_token.expires_at
        if expiry is not None and dj_timezone.is_aware(expiry):
            expiry = dj_timezone.make_naive(expiry, py_timezone.utc)

        self.credentials = Credentials(
            token=self.google_token.access_token,
            refresh_token=self.google_token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=scopes,
            expiry=expiry,
        )

        # Refresh if needed
        self.refresh_access_token()

    def refresh_access_token(self):
        """
        Refresh Google access token if expired.
        """

        if self.credentials.expired and self.credentials.refresh_token:
            self.credentials.refresh(Request())

            # google-auth returns a naive UTC expiry after refresh.
            # Re-attach UTC tzinfo before saving, since Django expects
            # aware datetimes when USE_TZ=True.
            new_expiry = self.credentials.expiry
            if new_expiry is not None and dj_timezone.is_naive(new_expiry):
                new_expiry = dj_timezone.make_aware(
                    new_expiry, py_timezone.utc
                )

            # Update DB values
            self.google_token.access_token = self.credentials.token
            self.google_token.expires_at = new_expiry

            self.google_token.save(
                update_fields=["access_token", "expires_at"]
            )