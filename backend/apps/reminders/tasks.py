from celery import shared_task
from django.utils import timezone

from .models import Reminder
from .services import ReminderService


# ----------------------------------------------------
# 1. CHECK DUE REMINDERS (SCHEDULER)
# ----------------------------------------------------
@shared_task
def check_due_reminders():
    """
    Runs every minute.
    Finds all due reminders and dispatches them.
    """

    reminders = Reminder.objects.filter(
        status="PENDING",
        scheduled_time__lte=timezone.now(),
    )

    print(f"Found {reminders.count()} due reminder(s).")

    for reminder in reminders:
        send_reminder_email.delay(reminder.id)


# ----------------------------------------------------
# 2. PROCESS SINGLE REMINDER
# ----------------------------------------------------
@shared_task
def send_reminder_email(reminder_id):
    """
    Process one due reminder:
    1. SCHEDULE_EMAIL -> send the email. REMIND_ME -> no email.
    2. Ensure a Google Calendar event exists (normally already
       created when the reminder was scheduled — this is a fallback
       in case that earlier creation failed).
    3. Mark as SENT or FAILED.
    """

    try:
        reminder = Reminder.objects.get(id=reminder_id)

        # -------------------------
        # 1. SEND EMAIL (or skip, for REMIND_ME)
        # -------------------------
        ReminderService.process_due_reminder(reminder)

        # -------------------------
        # 2. CALENDAR FALLBACK
        # -------------------------
        if not reminder.calendar_event_id:
            ReminderService.create_calendar_event(reminder)

        print(f"Reminder {reminder.id} processed successfully.")

    except Exception as e:
        import traceback
        print("Reminder processing failed:", e)
        traceback.print_exc()

        try:
            reminder.status = "FAILED"
            reminder.save(update_fields=["status"])
        except Exception:
            pass