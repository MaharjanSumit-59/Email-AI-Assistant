import logging

from django.utils.dateparse import parse_datetime
from django.utils import timezone as dj_timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Reminder
from .serializers import ReminderSerializer
from .calendar_service import CalendarService
from .services import ReminderService, EVENT_DURATION_MINUTES

logger = logging.getLogger(__name__)


class ReminderListCreateView(generics.ListCreateAPIView):

    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(
            user=self.request.user
        ).order_by("-scheduled_time")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        override_conflict = bool(request.data.get("override_conflict", False))

        # Check conflicts BEFORE saving anything — a hard block means
        # nothing gets written to the DB or Calendar if we're going
        # to refuse it anyway.
        probe = Reminder(
            user=request.user,
            scheduled_time=serializer.validated_data["scheduled_time"],
        )
        conflicts = ReminderService.check_conflicts(probe)

        if conflicts and not override_conflict:
            return Response(
                {
                    "detail": (
                        "This time conflicts with an existing calendar "
                        "event. Pass \"override_conflict\": true to "
                        "schedule it anyway."
                    ),
                    "has_conflict": True,
                    "conflicts": conflicts,
                },
                status=status.HTTP_409_CONFLICT,
            )

        reminder = serializer.save(user=self.request.user)
        ReminderService.create_calendar_event(reminder)

        data = serializer.data
        data["has_conflict"] = len(conflicts) > 0
        data["conflicts"] = conflicts

        headers = self.get_success_headers(data)
        return Response(
            data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


class ReminderDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(
            user=self.request.user
        )

    def perform_destroy(self, instance):
        if instance.calendar_event_id:
            try:
                CalendarService(instance.user).delete_event(
                    instance.calendar_event_id
                )
            except Exception:
                logger.exception(
                    "Failed to delete calendar event %s for reminder %s",
                    instance.calendar_event_id,
                    instance.id,
                )

        instance.delete()


class ConfirmReminderView(APIView):
    """
    Confirms a NEEDS_CONFIRMATION reminder (typically an AI-detected
    meeting with a vague or low-confidence time), optionally
    correcting the scheduled_time first, then creates the Google
    Calendar event.

    POST /api/reminders/<id>/confirm/
    Body (optional): {"scheduled_time": "<ISO 8601>"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        try:
            reminder = Reminder.objects.get(pk=pk, user=request.user)
        except Reminder.DoesNotExist:
            return Response(
                {"detail": "Reminder not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        scheduled_time = None
        raw_time = request.data.get("scheduled_time")

        if raw_time:
            scheduled_time = parse_datetime(raw_time)

            if scheduled_time is None:
                return Response(
                    {"detail": "scheduled_time must be a valid ISO 8601 datetime."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if dj_timezone.is_naive(scheduled_time):
                scheduled_time = dj_timezone.make_aware(
                    scheduled_time, dj_timezone.get_default_timezone()
                )

        probe = Reminder(
            user=request.user,
            scheduled_time=scheduled_time or reminder.scheduled_time,
        )

        conflicts = ReminderService.check_conflicts(probe)
        override_conflict = bool(request.data.get("override_conflict", False))

        if conflicts and not override_conflict:
            return Response(
                {
                    "detail": (
                        "This time conflicts with an existing calendar "
                        "event. Pass \"override_conflict\": true to "
                        "confirm it anyway."
                    ),
                    "has_conflict": True,
                    "conflicts": conflicts,
                },
                status=status.HTTP_409_CONFLICT,
            )

        reminder = ReminderService.confirm(reminder, scheduled_time=scheduled_time)

        serializer = ReminderSerializer(reminder)
        data = serializer.data
        data["has_conflict"] = len(conflicts) > 0
        data["conflicts"] = conflicts

        return Response(data)


class CheckConflictsView(APIView):
    """
    Pre-flight conflict check — lets a future UI ask "is this time
    free?" before the user commits to creating a reminder.

    GET /api/reminders/check-conflicts/?scheduled_time=<ISO8601>&duration_minutes=30
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        raw_time = request.query_params.get("scheduled_time")

        if not raw_time:
            return Response(
                {"detail": "scheduled_time query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scheduled_time = parse_datetime(raw_time)

        if scheduled_time is None:
            return Response(
                {"detail": "scheduled_time must be a valid ISO 8601 datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if dj_timezone.is_naive(scheduled_time):
            scheduled_time = dj_timezone.make_aware(
                scheduled_time, dj_timezone.get_default_timezone()
            )

        try:
            duration_minutes = int(
                request.query_params.get(
                    "duration_minutes", EVENT_DURATION_MINUTES
                )
            )
        except ValueError:
            return Response(
                {"detail": "duration_minutes must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        probe = Reminder(
            user=request.user,
            scheduled_time=scheduled_time,
        )

        conflicts = ReminderService.check_conflicts(
            probe, duration_minutes=duration_minutes
        )

        return Response({
            "scheduled_time": scheduled_time,
            "duration_minutes": duration_minutes,
            "has_conflict": len(conflicts) > 0,
            "conflicts": conflicts,
        })