from rest_framework import serializers

from .models import AIAnalysis


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