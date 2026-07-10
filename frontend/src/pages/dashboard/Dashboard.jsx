import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiInbox,
    FiStar,
    FiTrash2,
    FiZap,
    FiPlay,
    FiSend,
    FiEdit3,
    FiSkipForward,
    FiAlertTriangle,
    FiCalendar,
    FiHelpCircle,
    FiBell,
    FiArrowRight,
    FiClock,
    FiMail,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import { getInbox, getTrash } from "../../services/emailService";
import { getProfile, getSummary } from "../../services/userService";
import { getReminders } from "../../services/reminderService";
import { getActionLogs, runAutomationNow } from "../../services/aiService";

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

function timeAgo(iso) {
    if (!iso) return "";
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
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
    meeting_scheduled: {
        label: "Meeting scheduled",
        icon: <FiCalendar />,
        badge: "bg-sage-dim text-sage",
    },
    meeting_needs_confirmation: {
        label: "Needs confirmation",
        icon: <FiHelpCircle />,
        badge: "bg-ember-dim text-ember",
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

const REMINDER_TYPE_META = {
    SCHEDULE_EMAIL: { label: "Scheduled email", icon: <FiSend /> },
    REMIND_ME: { label: "Reminder", icon: <FiBell /> },
    MEETING: { label: "Meeting", icon: <FiCalendar /> },
};

function StatCard({ icon, label, value, sub, accent }) {
    return (
        <div className="bg-paper-raised border border-line rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span
                    className={`flex items-center justify-center w-9 h-9 rounded-lg ${accent}`}
                >
                    {icon}
                </span>
            </div>
            <div>
                <p className="font-display text-3xl leading-none">{value}</p>
                <p className="text-sm text-muted mt-1.5">{label}</p>
                {sub && <p className="text-xs text-faint mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [runningAutomation, setRunningAutomation] = useState(false);

    const [profile, setProfile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [trash, setTrash] = useState({ emails: [], retention_days: 30 });
    const [reminders, setReminders] = useState([]);
    const [logs, setLogs] = useState([]);

    const loadDashboard = async () => {
        setLoading(true);

        const [
            profileResult,
            summaryResult,
            inboxResult,
            trashResult,
            remindersResult,
            logsResult,
        ] = await Promise.allSettled([
            getProfile(),
            getSummary(),
            getInbox(),
            getTrash(),
            getReminders(),
            getActionLogs(),
        ]);

        if (profileResult.status === "fulfilled") {
            setProfile(profileResult.value);
        }
        if (summaryResult.status === "fulfilled") {
            setSummary(summaryResult.value);
        }
        if (inboxResult.status === "fulfilled") {
            setInbox(inboxResult.value ?? []);
        }
        if (trashResult.status === "fulfilled") {
            setTrash(trashResult.value ?? { emails: [], retention_days: 30 });
        }
        if (remindersResult.status === "fulfilled") {
            setReminders(remindersResult.value ?? []);
        }
        if (logsResult.status === "fulfilled") {
            setLogs(logsResult.value ?? []);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleRunAutomation = async () => {
        setRunningAutomation(true);

        try {
            await runAutomationNow();
            toast.success("Automation sweep complete");
            loadDashboard();
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.detail ||
                    "Couldn't run automation right now."
            );
        } finally {
            setRunningAutomation(false);
        }
    };

    const upcomingReminders = useMemo(() => {
        const now = Date.now();

        return reminders
            .filter(
                (r) =>
                    ["PENDING", "NEEDS_CONFIRMATION"].includes(r.status) &&
                    new Date(r.scheduled_time).getTime() >= now
            )
            .sort(
                (a, b) =>
                    new Date(a.scheduled_time) - new Date(b.scheduled_time)
            )
            .slice(0, 5);
    }, [reminders]);

    const expiringTrash = useMemo(() => {
        return [...(trash.emails ?? [])]
            .sort((a, b) => a.days_remaining - b.days_remaining)
            .slice(0, 4);
    }, [trash]);

    const recentLogs = useMemo(() => logs.slice(0, 6), [logs]);

    const breakdown = useMemo(() => {
        const counts = {
            handled: 0,
            review: 0,
            skipped: 0,
            failed: 0,
        };

        logs.forEach((log) => {
            if (
                ["auto_replied", "draft_created", "meeting_scheduled"].includes(
                    log.action
                )
            ) {
                counts.handled += 1;
            } else if (log.action === "meeting_needs_confirmation") {
                counts.review += 1;
            } else if (log.action === "skipped") {
                counts.skipped += 1;
            } else if (log.action === "failed") {
                counts.failed += 1;
            }
        });

        const total =
            counts.handled + counts.review + counts.skipped + counts.failed;

        return { ...counts, total };
    }, [logs]);

    const repliedToday = useMemo(() => {
        const today = new Date().toDateString();
        return logs.filter(
            (log) =>
                ["auto_replied", "draft_created"].includes(log.action) &&
                new Date(log.created_at).toDateString() === today
        ).length;
    }, [logs]);

    const displayName =
        profile?.first_name || profile?.username || "there";

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl">
                        {getGreeting()}, {displayName}
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        {new Date().toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>

                <button
                    onClick={handleRunAutomation}
                    disabled={
                        runningAutomation || !profile?.gmail_connected
                    }
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-signal text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                    <FiPlay size={15} />
                    {runningAutomation ? "Running..." : "Run automation now"}
                </button>
            </div>

            {!loading && profile && !profile.gmail_connected && (
                <div className="flex items-center gap-3 bg-ember-dim text-ember text-sm rounded-xl px-5 py-3.5 mb-6">
                    <FiAlertTriangle size={16} className="shrink-0" />
                    <span>
                        Gmail isn't connected yet — automation, inbox sync,
                        and trash have nothing to work with until you
                        connect it.
                    </span>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={<FiInbox className="text-signal" size={17} />}
                    accent="bg-signal-dim"
                    label="In inbox"
                    value={loading ? "—" : inbox.length}
                    sub={
                        summary
                            ? `${summary.total_emails} synced total`
                            : undefined
                    }
                />
                <StatCard
                    icon={<FiStar className="text-ember" size={17} />}
                    accent="bg-ember-dim"
                    label="Starred"
                    value={loading ? "—" : summary?.starred_emails ?? 0}
                />
                <StatCard
                    icon={<FiTrash2 className="text-muted" size={17} />}
                    accent="bg-paper border border-line"
                    label="In trash"
                    value={loading ? "—" : trash.emails?.length ?? 0}
                    sub={`Auto-clears after ${trash.retention_days ?? 30}d`}
                />
                <StatCard
                    icon={<FiZap className="text-sage" size={17} />}
                    accent="bg-sage-dim"
                    label={
                        profile?.automation_enabled
                            ? "Automation active"
                            : "Automation paused"
                    }
                    value={loading ? "—" : repliedToday}
                    sub="handled today"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: activity feed + breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-paper-raised border border-line rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-ink">
                                Automation activity
                            </h2>
                            <Link
                                to="/ai/log"
                                className="flex items-center gap-1 text-xs font-medium text-signal hover:underline"
                            >
                                View all
                                <FiArrowRight size={12} />
                            </Link>
                        </div>

                        {!loading && breakdown.total > 0 && (
                            <div className="mb-5">
                                <div className="flex h-2 rounded-full overflow-hidden bg-paper">
                                    {breakdown.handled > 0 && (
                                        <div
                                            className="bg-sage"
                                            style={{
                                                width: `${
                                                    (breakdown.handled /
                                                        breakdown.total) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    )}
                                    {breakdown.review > 0 && (
                                        <div
                                            className="bg-ember"
                                            style={{
                                                width: `${
                                                    (breakdown.review /
                                                        breakdown.total) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    )}
                                    {breakdown.skipped > 0 && (
                                        <div
                                            className="bg-line"
                                            style={{
                                                width: `${
                                                    (breakdown.skipped /
                                                        breakdown.total) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    )}
                                    {breakdown.failed > 0 && (
                                        <div
                                            className="bg-ink"
                                            style={{
                                                width: `${
                                                    (breakdown.failed /
                                                        breakdown.total) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-sage" />
                                        Handled ({breakdown.handled})
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-ember" />
                                        Needs review ({breakdown.review})
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-line" />
                                        Skipped ({breakdown.skipped})
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-ink" />
                                        Failed ({breakdown.failed})
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="divide-y divide-line">
                            {loading && (
                                <p className="text-sm text-faint py-4">
                                    Loading activity...
                                </p>
                            )}

                            {!loading && recentLogs.length === 0 && (
                                <p className="text-sm text-faint py-4">
                                    No automation activity yet. Run a
                                    sweep to see it here.
                                </p>
                            )}

                            {!loading &&
                                recentLogs.map((log) => {
                                    const meta =
                                        ACTION_META[log.action] || {
                                            label: log.action,
                                            icon: <FiMail />,
                                            badge: "bg-paper text-muted",
                                        };

                                    return (
                                        <div
                                            key={log.id}
                                            className="flex items-center gap-3 py-3"
                                        >
                                            <span
                                                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${meta.badge}`}
                                            >
                                                {meta.icon}
                                            </span>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {log.subject ||
                                                        "(no subject)"}
                                                </p>
                                                <p className="text-xs text-faint truncate">
                                                    {meta.label} ·{" "}
                                                    {formatSender(
                                                        log.sender
                                                    )}
                                                </p>
                                            </div>

                                            <span className="text-xs text-faint shrink-0">
                                                {timeAgo(log.created_at)}
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="bg-paper-raised border border-line rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-ink">
                                Recent inbox
                            </h2>
                            <Link
                                to="/inbox"
                                className="flex items-center gap-1 text-xs font-medium text-signal hover:underline"
                            >
                                Open inbox
                                <FiArrowRight size={12} />
                            </Link>
                        </div>

                        <div className="divide-y divide-line">
                            {loading && (
                                <p className="text-sm text-faint py-4">
                                    Loading inbox...
                                </p>
                            )}

                            {!loading && inbox.length === 0 && (
                                <p className="text-sm text-faint py-4">
                                    Nothing here yet.
                                </p>
                            )}

                            {!loading &&
                                inbox.slice(0, 5).map((email) => (
                                    <Link
                                        key={email.gmail_message_id}
                                        to={`/email/${email.gmail_message_id}`}
                                        className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity"
                                    >
                                        {email.starred ? (
                                            <FiStar
                                                className="text-ember shrink-0"
                                                size={14}
                                            />
                                        ) : (
                                            <span className="w-3.5 shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0 flex items-baseline gap-2">
                                            <span className="font-medium text-sm truncate w-40 shrink-0">
                                                {formatSender(email.sender)}
                                            </span>
                                            <span className="text-sm text-faint truncate">
                                                {email.subject ||
                                                    "(no subject)"}
                                            </span>
                                        </div>

                                        <span className="text-xs text-faint shrink-0">
                                            {formatWhen(email.received_at)}
                                        </span>
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Right: reminders + trash health */}
                <div className="space-y-6">
                    <div className="bg-paper-raised border border-line rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-ink">
                                Upcoming
                            </h2>
                            <Link
                                to="/reminders"
                                className="flex items-center gap-1 text-xs font-medium text-signal hover:underline"
                            >
                                View all
                                <FiArrowRight size={12} />
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {loading && (
                                <p className="text-sm text-faint">
                                    Loading reminders...
                                </p>
                            )}

                            {!loading && upcomingReminders.length === 0 && (
                                <p className="text-sm text-faint">
                                    Nothing scheduled. Meetings the
                                    assistant finds in your email will
                                    show up here.
                                </p>
                            )}

                            {!loading &&
                                upcomingReminders.map((reminder) => {
                                    const meta =
                                        REMINDER_TYPE_META[
                                            reminder.reminder_type
                                        ] || {
                                            label: reminder.reminder_type,
                                            icon: <FiClock />,
                                        };

                                    const needsConfirmation =
                                        reminder.status ===
                                        "NEEDS_CONFIRMATION";

                                    return (
                                        <div
                                            key={reminder.id}
                                            className="flex items-start gap-3"
                                        >
                                            <span
                                                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                                    needsConfirmation
                                                        ? "bg-ember-dim text-ember"
                                                        : "bg-signal-dim text-signal"
                                                }`}
                                            >
                                                {meta.icon}
                                            </span>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {reminder.subject ||
                                                        "(untitled)"}
                                                </p>
                                                <p className="text-xs text-faint">
                                                    {formatWhen(
                                                        reminder.scheduled_time
                                                    )}
                                                    {needsConfirmation &&
                                                        " · needs confirmation"}
                                                </p>
                                            </div>

                                            {reminder.source ===
                                                "AI_DETECTED" && (
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full bg-signal mt-2 shrink-0"
                                                    title="Detected by AI"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="bg-paper-raised border border-line rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-ink">
                                Trash health
                            </h2>
                            <Link
                                to="/trash"
                                className="flex items-center gap-1 text-xs font-medium text-signal hover:underline"
                            >
                                Open trash
                                <FiArrowRight size={12} />
                            </Link>
                        </div>

                        {loading && (
                            <p className="text-sm text-faint">
                                Checking trash...
                            </p>
                        )}

                        {!loading && expiringTrash.length === 0 && (
                            <p className="text-sm text-faint">
                                Trash is empty. Nothing scheduled for
                                cleanup.
                            </p>
                        )}

                        {!loading && expiringTrash.length > 0 && (
                            <div className="space-y-3">
                                {expiringTrash.map((email) => (
                                    <div
                                        key={email.gmail_message_id}
                                        className="flex items-center gap-3"
                                    >
                                        <span
                                            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                                email.days_remaining <= 1
                                                    ? "bg-ember-dim text-ember"
                                                    : "bg-paper border border-line text-faint"
                                            }`}
                                        >
                                            <FiTrash2 size={14} />
                                        </span>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {email.subject ||
                                                    "(no subject)"}
                                            </p>
                                            <p className="text-xs text-faint truncate">
                                                {formatSender(
                                                    email.sender
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={`text-xs font-medium shrink-0 ${
                                                email.days_remaining <= 1
                                                    ? "text-ember"
                                                    : "text-faint"
                                            }`}
                                        >
                                            {email.days_remaining}d
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}