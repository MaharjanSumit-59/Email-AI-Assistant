import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiActivity,
    FiRefreshCw,
    FiSend,
    FiEdit3,
    FiSkipForward,
    FiAlertTriangle,
    FiChevronDown,
    FiChevronUp,
    FiCornerUpLeft,
    FiTrash2,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
    getActionLogs,
    runAutomationNow,
    deleteActionLog,
} from "../../services/aiService";

function formatSender(sender) {
    if (!sender) return "Unknown sender";
    const match = sender.match(/^(.*?)<.*>$/);
    if (match && match[1].trim()) {
        return match[1].trim().replace(/^"|"$/g, "");
    }
    return sender;
}

function formatWhen(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

const ACTION_META = {
    auto_replied: {
        label: "Auto-replied",
        icon: <FiSend />,
        badge: "bg-sage-dim text-sage",
    },
    draft_created: {
        label: "Draft created",
        icon: <FiEdit3 />,
        badge: "bg-signal-dim text-signal",
    },
    skipped: {
        label: "Skipped",
        icon: <FiSkipForward />,
        badge: "bg-paper text-muted",
    },
    failed: {
        label: "Failed",
        icon: <FiAlertTriangle />,
        badge: "bg-ember-dim text-ember",
    },
};

const FILTERS = [
    { value: "", label: "All" },
    { value: "auto_replied", label: "Auto-replied" },
    { value: "draft_created", label: "Drafted" },
    { value: "skipped", label: "Skipped" },
    { value: "failed", label: "Failed" },
];

function LogRow({ log, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const navigate = useNavigate();

    const meta = ACTION_META[log.action] || {
        label: log.action,
        icon: <FiActivity />,
        badge: "bg-paper text-muted",
    };

    const hasBody = log.reply_content || log.reasoning || log.error_message;
    const isDraft = log.action === "draft_created" && log.gmail_message_id;

    const handleOpenDraft = (e) => {
        e.stopPropagation();
        navigate(`/email/${log.gmail_message_id}`, {
            state: { draftReply: log.reply_content },
        });
    };

    const handleDelete = (e) => {
        e.stopPropagation();

        if (
            !window.confirm(
                "Permanently delete this log entry? This can't be undone."
            )
        ) {
            return;
        }

        onDelete(log.id);
    };

    const handleToggle = () => {
        if (hasBody) setExpanded((e) => !e);
    };

    return (
        <div className="bg-paper-raised border border-line rounded-xl overflow-hidden">
            <div
                role="button"
                tabIndex={0}
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleToggle();
                }}
                className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-4 text-left cursor-pointer"
            >
                <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${meta.badge}`}
                >
                    {meta.icon}
                    {meta.label}
                </span>

                <div className="min-w-0 flex-1 basis-40">
                    <p className="text-sm font-medium text-ink truncate">
                        {log.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-faint truncate">
                        {formatSender(log.sender)}
                    </p>
                </div>

                <div className="hidden md:flex items-center gap-2 shrink-0">
                    {log.importance && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-paper text-muted">
                            {log.importance}
                        </span>
                    )}
                    {log.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-paper text-muted">
                            {log.category}
                        </span>
                    )}
                    {log.confidence > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-paper text-muted">
                            {Math.round(log.confidence * 100)}%
                        </span>
                    )}
                </div>

                <span className="text-xs text-faint font-mono shrink-0 w-20 sm:w-24 text-right">
                    {formatWhen(log.created_at)}
                </span>

                <div className="flex items-center gap-3 shrink-0 ml-auto">
                    {isDraft && (
                        <button
                            type="button"
                            onClick={handleOpenDraft}
                            title="Open reply page"
                            className="flex items-center gap-1 text-xs font-medium text-signal hover:text-ink"
                        >
                            <FiCornerUpLeft size={14} />
                            <span className="hidden sm:inline">Open draft</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleDelete}
                        title="Permanently delete"
                        aria-label="Permanently delete log entry"
                        className="text-faint hover:text-ember"
                    >
                        <FiTrash2 size={15} />
                    </button>

                    {hasBody &&
                        (expanded ? (
                            <FiChevronUp className="text-faint shrink-0" />
                        ) : (
                            <FiChevronDown className="text-faint shrink-0" />
                        ))}
                </div>
            </div>

            {expanded && hasBody && (
                <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-line space-y-3">
                    {log.reasoning && (
                        <p className="text-sm text-muted">{log.reasoning}</p>
                    )}

                    {log.reply_content && (
                        <div className="bg-paper rounded-lg p-3 border border-line">
                            <p className="text-xs font-medium text-faint mb-1 uppercase tracking-wide">
                                {log.action === "auto_replied"
                                    ? "Reply sent"
                                    : "Draft content"}
                            </p>
                            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                                {log.reply_content}
                            </p>
                        </div>
                    )}

                    {log.error_message && (
                        <p className="text-sm text-ember">
                            {log.error_message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AutomationLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("");
    const [running, setRunning] = useState(false);

    const load = async (action) => {
        setLoading(true);
        setError(null);

        try {
            const data = await getActionLogs(action || undefined);
            setLogs(data);
        } catch (err) {
            console.error(err);
            setError("Couldn't load the automation log.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(filter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const handleRunNow = async () => {
        setRunning(true);

        try {
            await runAutomationNow();
            toast.success("Automation run complete");
            await load(filter);
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.detail ||
                    "Couldn't run automation. Is Gmail connected?"
            );
        } finally {
            setRunning(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        const previous = logs;

        // optimistic removal
        setLogs((prev) => prev.filter((l) => l.id !== logId));

        try {
            await deleteActionLog(logId);
            toast.success("Log entry deleted");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't delete this log entry.");
            setLogs(previous);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl sm:text-3xl">
                        Automation log
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Every email the assistant has looked at, what it
                        decided, and what it did about it.
                    </p>
                </div>

                <button
                    onClick={handleRunNow}
                    disabled={running}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-ink disabled:opacity-40 transition-colors shrink-0 self-start sm:self-auto"
                >
                    <FiRefreshCw className={running ? "animate-spin" : ""} />
                    {running ? "Running..." : "Run now"}
                </button>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            filter === f.value
                                ? "bg-signal text-white"
                                : "bg-paper-raised border border-line text-muted hover:text-ink"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="bg-paper-raised border border-line rounded-xl p-10 text-center text-faint text-sm">
                    Loading...
                </div>
            )}

            {!loading && error && (
                <div className="bg-ember-dim border border-line rounded-xl p-10 text-center text-ember text-sm">
                    {error}
                </div>
            )}

            {!loading && !error && logs.length === 0 && (
                <div className="bg-paper-raised border border-line rounded-xl p-10 text-center text-faint text-sm">
                    Nothing here yet. Once the assistant processes an
                    email — or you hit "Run now" — its actions will show
                    up here.
                </div>
            )}

            {!loading && !error && logs.length > 0 && (
                <div className="space-y-3">
                    {logs.map((log) => (
                        <LogRow
                            key={log.id}
                            log={log}
                            onDelete={handleDeleteLog}
                        />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}