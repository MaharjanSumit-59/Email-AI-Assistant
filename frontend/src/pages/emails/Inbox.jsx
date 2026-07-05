import { useEffect, useState } from "react";
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

export default function Inbox() {
    const navigate = useNavigate();

    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [busyIds, setBusyIds] = useState(new Set());

    const loadInbox = async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError(null);

        try {
            const data = await getInbox();
            setEmails(data);
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Inbox</h1>

                <button
                    onClick={() => loadInbox({ silent: true })}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                >
                    <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex items-center gap-3 bg-white border rounded-lg px-4 py-3 max-w-xl">
                    <FiSearch className="text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search emails..."
                        className="w-full outline-none"
                    />
                </div>
            </form>

            <div className="bg-white border rounded-xl overflow-hidden">
                {loading && (
                    <div className="p-10 text-center text-gray-500">
                        Loading your inbox...
                    </div>
                )}

                {!loading && error && (
                    <div className="p-10 text-center text-red-500">
                        {error}
                    </div>
                )}

                {!loading && !error && emails.length === 0 && (
                    <div className="p-16 flex flex-col items-center text-gray-400">
                        <FiInbox size={40} className="mb-3" />
                        <p className="text-lg font-medium text-gray-600">
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

                        return (
                            <div
                                key={id}
                                onClick={() => navigate(`/email/${id}`)}
                                className={`flex items-center gap-4 px-5 py-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition ${
                                    isBusy ? "opacity-50" : ""
                                }`}
                            >
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
                                                : "text-gray-300"
                                        }
                                    />
                                    <FaStar
                                        className={
                                            email.starred
                                                ? "text-yellow-400"
                                                : "hidden"
                                        }
                                    />
                                </button>

                                <div className="w-48 shrink-0 font-medium truncate">
                                    {formatSender(email.sender)}
                                </div>

                                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                                    <span className="font-medium truncate">
                                        {email.subject || "(no subject)"}
                                    </span>
                                    <span className="text-gray-400 text-sm truncate">
                                        — {email.snippet}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-400 shrink-0 w-16 text-right">
                                    {formatDate(email.received_at)}
                                </div>

                                <button
                                    onClick={(e) => handleDelete(email, e)}
                                    disabled={isBusy}
                                    className="text-gray-300 hover:text-red-500 shrink-0"
                                    aria-label="Delete email"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        );
                    })}
            </div>
        </DashboardLayout>
    );
}
