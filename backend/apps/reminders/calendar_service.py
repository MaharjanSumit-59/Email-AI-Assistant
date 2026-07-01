import logging

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from rest_framework.exceptions import APIException

from apps.base_google.base_google_service import BaseGoogleService


logger = logging.getLogger(__name__)


class CalendarService(BaseGoogleService):
    """
    Service for interacting with Google Calendar API.

    Features:
    - Create events
    - Fetch events
    - Delete events
    """

    def __init__(self, user):
        super().__init__(user)

        self.service = build(
            "calendar",
            "v3",
            credentials=self.credentials
        )

    # -------------------------
    # CREATE EVENT
    # -------------------------
    def create_event(
        self,
        title,
        description,
        start_time,
        end_time,
        timezone="Asia/Kathmandu",
        attendees=None,
    ):
        """
        Create a Google Calendar event.
        """

        attendees = attendees or []

        event = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": timezone,
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": timezone,
            },
            "attendees": [
                {"email": email} for email in attendees
            ],
        }

        try:
            created = (
                self.service.events()
                .insert(
                    calendarId="primary",
                    body=event
                )
                .execute()
            )

            return {
                "id": created.get("id"),
                "html_link": created.get("htmlLink"),
                "status": created.get("status"),
            }

        except HttpError as error:
            logger.exception("Failed to create calendar event.")
            raise APIException(str(error))

    # -------------------------
    # GET EVENT
    # -------------------------
    def get_event(self, event_id):
        """
        Retrieve a calendar event by ID.
        """

        try:
            return (
                self.service.events()
                .get(
                    calendarId="primary",
                    eventId=event_id,
                )
                .execute()
            )

        except HttpError as error:
            logger.exception("Failed to fetch calendar event.")
            raise APIException(str(error))

    # -------------------------
    # DELETE EVENT
    # -------------------------
    def delete_event(self, event_id):
        """
        Delete a calendar event.
        """

        try:
            self.service.events().delete(
                calendarId="primary",
                eventId=event_id,
            ).execute()

            return {
                "status": "deleted",
                "event_id": event_id
            }

        except HttpError as error:
            logger.exception("Failed to delete calendar event.")
            raise APIException(str(error))