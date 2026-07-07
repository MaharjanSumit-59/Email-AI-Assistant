import logging

from celery import shared_task

from apps.users.models import User

from .automation import EmailAutomationEngine


logger = logging.getLogger(__name__)


@shared_task
def process_new_emails_for_all_users():
    """
    Runs on a schedule (see CELERY_BEAT_SCHEDULE). Fans out one task
    per user who has Gmail connected and automation turned on, so a
    slow/failing user can't block the others.
    """

    user_ids = list(
        User.objects.filter(
            gmail_connected=True,
            automation_enabled=True,
        ).values_list("id", flat=True)
    )

    print(f"Automation sweep: checking {len(user_ids)} user inbox(es).")

    for user_id in user_ids:
        process_new_emails_for_user.delay(user_id)


@shared_task
def process_new_emails_for_user(user_id):
    """
    Classifies and (auto-reply / draft) any unseen mail in a single
    user's inbox.
    """

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    try:
        EmailAutomationEngine(user).run()
    except Exception:
        logger.exception(
            "Automation run failed for user %s", user_id
        )
