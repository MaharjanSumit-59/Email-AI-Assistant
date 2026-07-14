from rest_framework import serializers
from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reminder

        fields = (
            "id",
            "reminder_type",
            "source",
            "source_email",
            "ai_confidence",
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
            "source",
            "source_email",
            "ai_confidence",
            "status",
            "sent_at",
            "calendar_event_id",
            "created_at",
            "updated_at",
        )