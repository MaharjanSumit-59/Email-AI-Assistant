from django.db import models

from apps.emails.models import EmailMetadata


class AIAnalysis(models.Model):
    """
    Stores AI-generated information for a Gmail message.
    One email has one AI analysis.
    """

    email = models.OneToOneField(
        EmailMetadata,
        on_delete=models.CASCADE,
        related_name="ai_analysis",
    )

    # ---------- Decision Engine ----------
    category = models.CharField(
        max_length=30,
        blank=True,
    )

    priority = models.CharField(
        max_length=20,
        blank=True,
    )

    importance = models.CharField(
        max_length=20,
        blank=True,
    )

    confidence = models.FloatField(
        default=0.0,
    )

    suggested_action = models.CharField(
        max_length=20,
        blank=True,
    )

    # ---------- AI Features ----------
    summary = models.TextField(
        blank=True,
    )

    generated_reply = models.TextField(
        blank=True,
    )

    extracted_tasks = models.JSONField(
        default=list,
        blank=True,
    )

    # ---------- Metadata ----------
    analyzed_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"AI Analysis - {self.email.subject}"


class EmailActionLog(models.Model):
    """
    Audit trail for the automation pipeline. One row per email per
    time the automation engine touched it: what it decided, what it
    did about it (auto-replied / drafted / skipped / failed), and why.
    """

    ACTION_CHOICES = [
        ("auto_replied", "Auto-replied"),
        ("draft_created", "Draft created"),
        ("skipped", "Skipped"),
        ("failed", "Failed"),
        ("meeting_scheduled", "Meeting scheduled"),
        ("meeting_needs_confirmation", "Meeting needs confirmation"),
    ]

    email = models.ForeignKey(
        EmailMetadata,
        on_delete=models.CASCADE,
        related_name="action_logs",
    )

    action = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES,
    )

    category = models.CharField(
        max_length=30,
        blank=True,
    )

    priority = models.CharField(
        max_length=20,
        blank=True,
    )

    importance = models.CharField(
        max_length=20,
        blank=True,
    )

    confidence = models.FloatField(
        default=0.0,
    )

    reply_content = models.TextField(
        blank=True,
    )

    reasoning = models.TextField(
        blank=True,
    )

    error_message = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_display()} - {self.email.subject}"