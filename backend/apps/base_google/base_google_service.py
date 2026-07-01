from django.conf import settings

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
        self.credentials = Credentials(
            token=self.google_token.access_token,
            refresh_token=self.google_token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=scopes,
            expiry=self.google_token.expires_at,
        )

        # Refresh if needed
        self.refresh_access_token()

    def refresh_access_token(self):
        """
        Refresh Google access token if expired.
        """

        if self.credentials.expired and self.credentials.refresh_token:
            self.credentials.refresh(Request())

            # Update DB values
            self.google_token.access_token = self.credentials.token
            self.google_token.expires_at = self.credentials.expiry

            self.google_token.save(
                update_fields=["access_token", "expires_at"]
            )