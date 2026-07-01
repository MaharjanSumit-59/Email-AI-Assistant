from rest_framework import serializers
from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reminder

        fields = (
            "id",
            "reminder_type",
            "recipient",
            "subject",
            "body",
            "scheduled_time",
            "status",
            "sent_at",
            "calendar_event_id",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "status",
            "sent_at",
            "calendar_event_id",
            "created_at",
            "updated_at",
        )