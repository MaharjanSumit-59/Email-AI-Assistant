from django.contrib import admin

from .models import AIAnalysis, EmailActionLog


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


@admin.register(EmailActionLog)
class EmailActionLogAdmin(admin.ModelAdmin):

    list_display = (
        "email",
        "action",
        "category",
        "priority",
        "importance",
        "confidence",
        "created_at",
    )

    search_fields = (
        "email__subject",
        "email__sender",
    )

    list_filter = (
        "action",
        "category",
        "priority",
        "importance",
    )

    readonly_fields = (
        "created_at",
    )