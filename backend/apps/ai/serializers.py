from rest_framework import serializers

from .models import AIAnalysis, EmailActionLog


class EmailActionLogSerializer(serializers.ModelSerializer):

    subject = serializers.CharField(
        source="email.subject",
        read_only=True,
    )

    sender = serializers.CharField(
        source="email.sender",
        read_only=True,
    )

    gmail_message_id = serializers.CharField(
        source="email.gmail_message_id",
        read_only=True,
    )

    class Meta:
        model = EmailActionLog
        fields = (
            "id",
            "gmail_message_id",
            "subject",
            "sender",
            "action",
            "category",
            "priority",
            "importance",
            "confidence",
            "reply_content",
            "reasoning",
            "error_message",
            "created_at",
        )


class AIAnalysisSerializer(serializers.ModelSerializer):

    class Meta:
        model = AIAnalysis
        fields = (
            "category",
            "priority",
            "importance",
            "confidence",
            "suggested_action",
            "summary",
            "generated_reply",
            "extracted_tasks",
            "analyzed_at",
            "updated_at",
        )


class MessageIDSerializer(serializers.Serializer):
    message_id = serializers.CharField()

    # When the email has readable attachments (images, PDFs, .docx),
    # the AI actions read and factor them in by default. Callers can
    # pass include_attachments: false to analyze the email text only.
    include_attachments = serializers.BooleanField(
        required=False,
        default=True,
    )