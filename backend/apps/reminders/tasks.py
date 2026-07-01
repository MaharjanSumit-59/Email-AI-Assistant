from celery import shared_task
from django.utils import timezone

from .models import Reminder
from .services import ReminderService
from apps.reminders.calender_service import CalendarService


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
    Process one reminder:
    1. Send email
    2. Create Google Calendar event
    3. Mark as SENT or FAILED
    """

    try:
        reminder = Reminder.objects.get(id=reminder_id)
        user = reminder.user

        # -------------------------
        # 1. SEND EMAIL
        # -------------------------
        ReminderService.send_scheduled_email(reminder)

        # -------------------------
        # 2. GOOGLE CALENDAR EVENT
        # -------------------------
        try:
            calendar = CalendarService(user)

            event = calendar.create_event(
                title=reminder.subject,
                description=reminder.body,
                start_time=reminder.scheduled_time,
                end_time=reminder.scheduled_time,
            )

            reminder.calendar_event_id = event.get("id")

        except Exception as e:
            print("Calendar error:", e)

        # -------------------------
        # 3. MARK AS SENT
        # -------------------------
        reminder.status = "SENT"
        reminder.sent_at = timezone.now()
        reminder.save()

        print(f"Reminder {reminder.id} sent successfully.")

    except Exception as e:
        print("Reminder processing failed:", e)

        try:
            reminder.status = "FAILED"
            reminder.save(update_fields=["status"])
        except Exception:
            pass