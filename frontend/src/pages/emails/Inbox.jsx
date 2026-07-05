import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiStar,
    FiRefreshCw,
    FiTrash2,
    FiSearch,
    FiInbox,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
    getInbox,
    searchEmails,
    starEmail,
    unstarEmail,
    deleteEmail,
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

// Don't let "Refresh" hit the server more than once per this window.
const REFRESH_COOLDOWN_MS = 20000;

const PRIORITY_BAR = {
    High: "bg-ember",
    Medium: "bg-signal",
    Low: "bg-sage",
};

export default function Inbox() {
    const navigate = useNavigate();

    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cooldownActive, setCooldownActive] = useState(false);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [busyIds, setBusyIds] = useState(new Set());

    // Doesn't trigger re-renders — just remembers what we last saw so a
    // "refresh" can tell whether anything actually changed.
    const latestIdRef = useRef(null);
    const lastRefreshAtRef = useRef(0);

    const loadInbox = async ({ silent = false, isManualRefresh = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError(null);

        try {
            const data = await getInbox();
            const newestId = data[0]?.gmail_message_id ?? null;

            if (isManualRefresh && newestId && newestId === latestIdRef.current) {
                // Nothing new since last check — leave the list alone so
                // starred/expanded state etc. isn't disturbed for no reason.
                toast("You're all caught up — no new mail.");
            } else {
                setEmails(data);
                latestIdRef.current = newestId;
                if (isManualRefresh) {
                    toast.success("Inbox updated");
                }
            }
        } catch (err) {
            console.error(err);
            setError(
                err?.response?.data?.detail ||
                    "Couldn't load your inbox. Try refreshing."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadInbox();
    }, []);

    const handleRefreshClick = () => {
        const now = Date.now();

        // Client-side throttle: don't spam the server if the user mashes
        // the refresh button — Gmail isn't going to have new mail every
        // couple seconds anyway.
        if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) {
            toast("Just checked — give it a few seconds.");
            return;
        }

        lastRefreshAtRef.current = now;
        setCooldownActive(true);
        setTimeout(() => setCooldownActive(false), REFRESH_COOLDOWN_MS);

        loadInbox({ silent: true, isManualRefresh: true });
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!query.trim()) {
            loadInbox();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await searchEmails(query.trim());
            setEmails(data);
        } catch (err) {
            console.error(err);
            setError("Search failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

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

    const handleToggleStar = async (email) => {
        const id = email.gmail_message_id;
        setBusy(id, true);

        // optimistic update
        setEmails((prev) =>
            prev.map((e) =>
                e.gmail_message_id === id
                    ? { ...e, starred: !e.starred }
                    : e
            )
        );

        try {
            if (email.starred) {
                await unstarEmail(id);
            } else {
                await starEmail(id);
            }
        } catch (err) {
            console.error(err);
            toast.error("Couldn't update star. Reverting.");
            // revert on failure
            setEmails((prev) =>
                prev.map((e) =>
                    e.gmail_message_id === id
                        ? { ...e, starred: email.starred }
                        : e
                )
            );
        } finally {
            setBusy(id, false);
        }
    };

    const handleDelete = async (email, e) => {
        e.stopPropagation();

        const id = email.gmail_message_id;
        setBusy(id, true);

        try {
            await deleteEmail(id);
            setEmails((prev) =>
                prev.filter((item) => item.gmail_message_id !== id)
            );
            toast.success("Email moved to trash");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't delete this email.");
        } finally {
            setBusy(id, false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display text-3xl">Inbox</h1>
                    <p className="text-sm text-muted mt-1">
                        {loading
                            ? "Checking your mailbox..."
                            : `${emails.length} message${
                                  emails.length === 1 ? "" : "s"
                              }`}
                    </p>
                </div>

                <button
                    onClick={handleRefreshClick}
                    disabled={refreshing || cooldownActive}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line bg-paper-raised hover:border-signal hover:text-signal text-sm font-medium disabled:opacity-40 transition-colors"
                >
                    <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex items-center gap-3 bg-paper-raised border border-line rounded-lg px-4 py-3 max-w-xl focus-within:border-signal transition-colors">
                    <FiSearch className="text-faint shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search emails..."
                        className="w-full outline-none bg-transparent text-sm"
                    />
                </div>
            </form>

            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden">
                {loading && (
                    <div className="p-10 text-center text-muted text-sm">
                        Loading your inbox...
                    </div>
                )}

                {!loading && error && (
                    <div className="p-10 text-center text-ember text-sm">
                        {error}
                    </div>
                )}

                {!loading && !error && emails.length === 0 && (
                    <div className="p-16 flex flex-col items-center text-faint">
                        <FiInbox size={36} className="mb-3" />
                        <p className="text-base font-medium text-ink">
                            Nothing here
                        </p>
                        <p className="text-sm">
                            New emails will show up as soon as they arrive.
                        </p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    emails.map((email) => {
                        const id = email.gmail_message_id;
                        const isBusy = busyIds.has(id);
                        const barClass =
                            PRIORITY_BAR[email.priority] || "bg-line";

                        return (
                            <div
                                key={id}
                                onClick={() =>
                                    navigate(`/email/${id}`, {
                                        state: { preview: email },
                                    })
                                }
                                className={`relative flex items-center gap-4 pl-6 pr-5 py-4 border-b border-line last:border-b-0 cursor-pointer hover:bg-paper transition-colors ${
                                    isBusy ? "opacity-50" : ""
                                }`}
                            >
                                <span
                                    className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${barClass}`}
                                />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStar(email);
                                    }}
                                    disabled={isBusy}
                                    className="text-lg shrink-0"
                                    aria-label={
                                        email.starred
                                            ? "Unstar email"
                                            : "Star email"
                                    }
                                >
                                    <FiStar
                                        className={
                                            email.starred
                                                ? "hidden"
                                                : "text-faint"
                                        }
                                    />
                                    <FaStar
                                        className={
                                            email.starred
                                                ? "text-ember"
                                                : "hidden"
                                        }
                                    />
                                </button>

                                <div className="w-48 shrink-0 font-medium truncate text-sm">
                                    {formatSender(email.sender)}
                                </div>

                                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                                    <span className="font-medium truncate text-sm">
                                        {email.subject || "(no subject)"}
                                    </span>
                                    <span className="text-faint text-sm truncate">
                                        — {email.snippet}
                                    </span>
                                </div>

                                <div className="font-mono text-xs text-faint shrink-0 w-16 text-right">
                                    {formatDate(email.received_at)}
                                </div>

                                <button
                                    onClick={(e) => handleDelete(email, e)}
                                    disabled={isBusy}
                                    className="text-faint hover:text-ember shrink-0"
                                    aria-label="Delete email"
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
