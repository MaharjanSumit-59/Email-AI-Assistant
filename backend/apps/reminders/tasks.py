from celery import shared_task
from django.utils import timezone

from .models import Reminder
from .services import ReminderService


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


@shared_task
def send_reminder_email(reminder_id):
    """
    Send a single scheduled email.
    """

    try:

        reminder = Reminder.objects.get(id=reminder_id)

        ReminderService.send_scheduled_email(reminder)

        print(f"Reminder {reminder.id} sent successfully.")

    except Exception as e:

        print(e)

        try:
            reminder.status = "FAILED"
            reminder.save(update_fields=["status"])
        except Exception:
            pass