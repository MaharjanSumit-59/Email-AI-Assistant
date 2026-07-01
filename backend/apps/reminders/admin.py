from django.contrib import admin
from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "recipient",
        "subject",
        "scheduled_time",
        "status",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "recipient",
        "subject",
    )

    ordering = (
        "-scheduled_time",
    )