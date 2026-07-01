import logging

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Reminder
from .serializers import ReminderSerializer
from .calendar_service import CalendarService

logger = logging.getLogger(__name__)


class ReminderListCreateView(generics.ListCreateAPIView):

    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(
            user=self.request.user
        ).order_by("-scheduled_time")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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
                # Don't block reminder deletion if the calendar
                # event is already gone or Google is unreachable.
                logger.exception(
                    "Failed to delete calendar event %s for reminder %s",
                    instance.calendar_event_id,
                    instance.id,
                )

        instance.delete()