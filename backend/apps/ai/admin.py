from django.contrib import admin

from .models import AIAnalysis


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):

    list_display = (
        "email",
        "category",
        "priority",
        "importance",
        "confidence",
        "suggested_action",
        "updated_at",
    )

    search_fields = (
        "email__subject",
        "email__sender",
    )

    list_filter = (
        "category",
        "priority",
        "importance",
    )

    readonly_fields = (
        "analyzed_at",
        "updated_at",
    )