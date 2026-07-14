import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiRotateCcw,
    FiTrash2,
    FiTrash,
    FiAlertTriangle,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
    getTrash,
    getEmail,
    restoreEmail,
    permanentlyDeleteEmail,
    emptyTrash,
} from "../../services/emailService";

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
    });
}

// Gmail "From" headers look like `Name <email@example.com>`.
// Pull out just the display name (or the raw email if there's no name).
function formatSender(sender) {
    if (!sender) return "Unknown sender";

    const match = sender.match(/^(.*?)<.*>$/);

    if (match && match[1].trim()) {
        return match[1].trim().replace(/^"|"$/g, "");
    }

    return sender;
}

function daysLeftBadge(daysRemaining) {
    if (daysRemaining <= 1) {
        return "bg-ember/10 text-ember";
    }
    if (daysRemaining <= 3) {
        return "bg-signal-dim text-signal";
    }
    return "bg-paper border border-line text-faint";
}

export default function Trash() {
    const navigate = useNavigate();

    const [emails, setEmails] = useState([]);
    const [retentionDays, setRetentionDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyIds, setBusyIds] = useState(new Set());
    const [emptying, setEmptying] = useState(false);

    const loadTrash = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getTrash();
            setEmails(data.emails ?? []);
            setRetentionDays(data.retention_days ?? 30);
        } catch (err) {
            console.error(err);
            setError(
                err?.response?.data?.detail ||
                    "Couldn't load your trash. Try refreshing."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrash();
    }, []);

    const setBusy = (id, isBusy) => {
        setBusyIds((prev) => {
            const next = new Set(prev);
            if (isBusy) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const handleRestore = async (email, e) => {
        e.stopPropagation();

        const id = email.gmail_message_id;
        setBusy(id, true);

        try {
            await restoreEmail(id);

            // Don't just trust the restore call succeeded — read the
            // message straight back from Gmail and check its actual
            // labels. This is the real proof it worked, and it stays
            // on this page instead of bouncing you somewhere else to
            // "go check."
            const fresh = await getEmail(id);
            const labels = fresh.label_ids || [];
            const stillTrashed = labels.includes("TRASH");
            const backInInbox = labels.includes("INBOX");

            if (stillTrashed || !backInInbox) {
                toast.error(
                    "Gmail didn't confirm the restore. Try again in a moment."
                );
                // Leave it in the list (don't remove it) since it's
                // still genuinely in Trash as far as Gmail is concerned.
                return;
            }

            setEmails((prev) =>
                prev.filter((item) => item.gmail_message_id !== id)
            );
            toast.success("Email restored to your inbox.");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't restore this email.");
        } finally {
            setBusy(id, false);
        }
    };

    const handlePermanentDelete = async (email, e) => {
        e.stopPropagation();

        const id = email.gmail_message_id;

        const confirmed = window.confirm(
            "Delete this email forever? This can't be undone."
        );
        if (!confirmed) return;

        setBusy(id, true);

        try {
            await permanentlyDeleteEmail(id);
            setEmails((prev) =>
                prev.filter((item) => item.gmail_message_id !== id)
            );
            toast.success("Email deleted forever");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't delete this email.");
        } finally {
            setBusy(id, false);
        }
    };

    const handleEmptyTrash = async () => {
        if (emails.length === 0) return;

        const confirmed = window.confirm(
            `Permanently delete all ${emails.length} email(s) in Trash? This can't be undone.`
        );
        if (!confirmed) return;

        setEmptying(true);

        try {
            const result = await emptyTrash();
            setEmails([]);

            if (result.failed && result.failed.length > 0) {
                toast.error(
                    `Cleared ${result.cleared}, but ${result.failed.length} couldn't be deleted. Try again shortly.`
                );
                loadTrash();
            } else {
                toast.success("Trash emptied");
            }
        } catch (err) {
            console.error(err);
            toast.error("Couldn't empty trash. Try again.");
        } finally {
            setEmptying(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl">
                        Trash
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        {loading
                            ? "Checking your trash..."
                            : `${emails.length} message${
                                  emails.length === 1 ? "" : "s"
                              } — auto-deleted after ${retentionDays} day${
                                  retentionDays === 1 ? "" : "s"
                              }`}
                    </p>
                </div>

                <button
                    onClick={handleEmptyTrash}
                    disabled={emptying || loading || emails.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-paper-raised hover:border-ember hover:text-ember text-sm font-medium disabled:opacity-40 transition-colors shrink-0 self-start sm:self-auto"
                >
                    <FiTrash />
                    Empty trash
                </button>
            </div>

            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden">
                {loading && (
                    <div className="p-10 text-center text-muted text-sm">
                        Loading your trash...
                    </div>
                )}

                {!loading && error && (
                    <div className="p-10 text-center text-ember text-sm">
                        {error}
                    </div>
                )}

                {!loading && !error && emails.length === 0 && (
                    <div className="p-16 flex flex-col items-center text-faint">
                        <FiTrash2 size={36} className="mb-3" />
                        <p className="text-base font-medium text-ink">
                            Trash is empty
                        </p>
                        <p className="text-sm">
                            Deleted emails show up here before they're
                            gone for good.
                        </p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    emails.map((email) => {
                        const id = email.gmail_message_id;
                        const isBusy = busyIds.has(id);

                        return (
                            <div
                                key={id}
                                onClick={() =>
                                    navigate(`/email/${id}`, {
                                        state: {
                                            preview: email,
                                            from: "/trash",
                                        },
                                    })
                                }
                                className={`relative flex items-center gap-3 sm:gap-4 pl-6 pr-4 sm:pr-5 py-4 border-b border-line last:border-b-0 cursor-pointer hover:bg-paper transition-colors ${
                                    isBusy ? "opacity-50" : ""
                                }`}
                            >
                                <div className="w-20 sm:w-48 shrink-0 font-medium truncate text-sm">
                                    {formatSender(email.sender)}
                                </div>

                                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                                    <span className="font-medium truncate text-sm">
                                        {email.subject || "(no subject)"}
                                    </span>
                                    <span className="text-faint text-sm truncate hidden sm:inline">
                                        — {email.snippet}
                                    </span>
                                </div>

                                <div className="font-mono text-xs text-faint shrink-0 w-12 sm:w-16 text-right">
                                    {formatDate(email.received_at)}
                                </div>

                                <span
                                    className={`hidden sm:flex items-center gap-1 shrink-0 px-2 py-1 rounded-full text-xs font-medium ${daysLeftBadge(
                                        email.days_remaining
                                    )}`}
                                    title={`Permanently deleted in ${email.days_remaining} day(s)`}
                                >
                                    {email.days_remaining <= 1 && (
                                        <FiAlertTriangle size={12} />
                                    )}
                                    {email.days_remaining}d left
                                </span>

                                <button
                                    onClick={(e) => handleRestore(email, e)}
                                    disabled={isBusy}
                                    className="text-faint hover:text-signal shrink-0"
                                    aria-label="Restore email"
                                    title="Restore to inbox"
                                >
                                    <FiRotateCcw size={16} />
                                </button>

                                <button
                                    onClick={(e) =>
                                        handlePermanentDelete(email, e)
                                    }
                                    disabled={isBusy}
                                    className="text-faint hover:text-ember shrink-0"
                                    aria-label="Delete forever"
                                    title="Delete forever"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
            </div>
        </DashboardLayout>
    );
}