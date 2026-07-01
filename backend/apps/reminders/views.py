from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Reminder
from .serializers import ReminderSerializer


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