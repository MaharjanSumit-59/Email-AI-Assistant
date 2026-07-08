import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.users.models import User

from .models import EmailMetadata
from .services.gmail_service import GmailService


logger = logging.getLogger(__name__)


# ----------------------------------------------------
# 1. SWEEP ALL USERS (SCHEDULER)
# ----------------------------------------------------
@shared_task
def auto_clear_trash():
    """
    Runs daily (see CELERY_BEAT_SCHEDULE). Fans out one task per user
    with Gmail connected, so one user's slow/failing cleanup can't
    hold up everyone else's — same pattern as the AI automation sweep.
    """

    user_ids = list(
        User.objects.filter(
            gmail_connected=True,
        ).values_list("id", flat=True)
    )

    print(f"Trash auto-clear sweep: checking {len(user_ids)} user(s).")

    for user_id in user_ids:
        clear_expired_trash_for_user.delay(user_id)


# ----------------------------------------------------
# 2. CLEAR ONE USER'S EXPIRED TRASH
# ----------------------------------------------------
@shared_task
def clear_expired_trash_for_user(user_id):
    """
    Permanently deletes any of this user's trashed emails that have
    sat past their configured retention window. Mirrors what Gmail
    already does automatically after 30 days, but respects whatever
    the user has set in Settings.
    """

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    cutoff = timezone.now() - timedelta(days=user.trash_retention_days)

    expired = EmailMetadata.objects.filter(
        user=user,
        is_trashed=True,
        trashed_at__isnull=False,
        trashed_at__lte=cutoff,
    )

    count = expired.count()

    if count == 0:
        return

    print(f"Auto-clearing {count} expired trash item(s) for user {user_id}.")

    gmail = GmailService(user)

    cleared_ids = []
    failed_ids = []

    for email in expired:
        try:
            gmail.permanently_delete_email(email.gmail_message_id)
            cleared_ids.append(email.gmail_message_id)
        except Exception:
            # Don't let one bad message (e.g. a stale/expired Google
            # token) stop the rest of this user's cleanup, and don't
            # let it stop the whole sweep either — just log and move on.
            logger.exception(
                "Auto-clear failed for message %s (user %s)",
                email.gmail_message_id, user_id,
            )
            failed_ids.append(email.gmail_message_id)

    EmailMetadata.objects.filter(
        gmail_message_id__in=cleared_ids
    ).delete()

    print(
        f"Auto-clear done for user {user_id}: "
        f"{len(cleared_ids)} cleared, {len(failed_ids)} failed."
    )