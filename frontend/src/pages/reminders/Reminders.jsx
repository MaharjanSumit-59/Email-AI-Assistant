import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import clsx from "clsx";
import {
    FiPlus,
    FiMail,
    FiBell,
    FiClock,
    FiTrash2,
    FiX,
    FiAlertTriangle,
    FiCalendar,
    FiUser,
    FiZap,
    FiCheck,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import useAuth from "../../hooks/useAuth";
import {
    getReminders,
    createReminder,
    deleteReminder,
    confirmReminder,
} from "../../services/reminderService";

const TYPES = {
    SCHEDULE_EMAIL: {
        value: "SCHEDULE_EMAIL",
        label: "Schedule Email",
        blurb: "Send an email automatically at a future time.",
        icon: FiMail,
    },
    REMIND_ME: {
        value: "REMIND_ME",
        label: "Remind Me",
        blurb: "A personal nudge on your calendar — nothing is sent.",
        icon: FiBell,
    },
    MEETING: {
        value: "MEETING",
        label: "Meeting",
        blurb: "Detected automatically from an email.",
        icon: FiZap,
    },
};

const STATUS_STYLES = {
    PENDING: "bg-signal-dim text-signal",
    NEEDS_CONFIRMATION: "bg-ember-dim text-ember",
    SENT: "bg-sage-dim text-sage",
    FAILED: "bg-ember-dim text-ember",
    CANCELLED: "bg-line text-muted",
};

const FILTERS = ["ALL", "NEEDS_CONFIRMATION", "PENDING", "SENT", "FAILED", "CANCELLED"];

// MEETING reminders are only ever created by the AI pipeline, so the
// "New Reminder" modal only offers the two manual types.
const CREATABLE_TYPES = [TYPES.SCHEDULE_EMAIL, TYPES.REMIND_ME];

function toDatetimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

function defaultScheduledTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000); // +1h
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return toDatetimeLocal(d);
}

function formatWhen(iso) {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

const emptyForm = {
    reminder_type: TYPES.SCHEDULE_EMAIL.value,
    recipient: "",
    subject: "",
    body: "",
    scheduled_time: defaultScheduledTime(),
};

export default function Reminders() {
    const { user } = useAuth();

    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [conflict, setConflict] = useState(null); // { conflicts, payload }
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        loadReminders();
    }, []);

    async function loadReminders() {
        setLoading(true);
        try {
            const data = await getReminders();
            setReminders(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error(err);
            toast.error("Couldn't load your reminders.");
        } finally {
            setLoading(false);
        }
    }

    const filtered = useMemo(() => {
        if (filter === "ALL") return reminders;
        return reminders.filter((r) => r.status === filter);
    }, [reminders, filter]);

    function openModal() {
        setForm({
            ...emptyForm,
            recipient: "",
            scheduled_time: defaultScheduledTime(),
        });
        setConflict(null);
        setModalOpen(true);
    }

    function closeModal() {
        if (submitting) return;
        setModalOpen(false);
        setConflict(null);
    }

    function updateField(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    function buildPayload() {
        const isRemindMe = form.reminder_type === TYPES.REMIND_ME.value;

        return {
            reminder_type: form.reminder_type,
            recipient: isRemindMe ? (user?.email || "") : form.recipient.trim(),
            subject: form.subject.trim(),
            body: form.body.trim(),
            scheduled_time: new Date(form.scheduled_time).toISOString(),
        };
    }

    async function submitReminder(overrideConflict = false) {
        const payload = buildPayload();

        if (!payload.subject) {
            toast.error(
                form.reminder_type === TYPES.REMIND_ME.value
                    ? "Give your reminder a title."
                    : "Add a subject for the email."
            );
            return;
        }

        if (form.reminder_type === TYPES.SCHEDULE_EMAIL.value && !payload.recipient) {
            toast.error("Add a recipient email address.");
            return;
        }

        if (new Date(form.scheduled_time).getTime() < Date.now()) {
            toast.error("Pick a time in the future.");
            return;
        }

        setSubmitting(true);

        try {
            const created = await createReminder(
                overrideConflict
                    ? { ...payload, override_conflict: true }
                    : payload
            );

            setReminders((prev) => [created, ...prev]);
            toast.success(
                form.reminder_type === TYPES.REMIND_ME.value
                    ? "Reminder set."
                    : "Email scheduled."
            );
            setModalOpen(false);
            setConflict(null);
        } catch (err) {
            const data = err?.response?.data;

            if (err?.response?.status === 409 && data?.has_conflict) {
                setConflict({ conflicts: data.conflicts || [], payload });
            } else {
                console.error(err);
                toast.error(
                    data?.detail || "Couldn't save that reminder. Try again."
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleConfirmMeeting(reminder) {
        const prev = reminders;

        try {
            const updated = await confirmReminder(reminder.id);
            setReminders((list) =>
                list.map((r) => (r.id === reminder.id ? updated : r))
            );
            toast.success("Added to your calendar.");
        } catch (err) {
            const data = err?.response?.data;

            if (err?.response?.status === 409 && data?.has_conflict) {
                toast.error(
                    "That time conflicts with something on your calendar. " +
                        "Edit the time first, or delete and recreate it."
                );
            } else {
                console.error(err);
                setReminders(prev);
                toast.error(data?.detail || "Couldn't confirm that meeting.");
            }
        }
    }

    async function handleDelete(id) {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            setTimeout(() => {
                setConfirmDeleteId((cur) => (cur === id ? null : cur));
            }, 3000);
            return;
        }

        setConfirmDeleteId(null);
        const prev = reminders;
        setReminders((r) => r.filter((item) => item.id !== id));

        try {
            await deleteReminder(id);
            toast.success("Reminder deleted.");
        } catch (err) {
            console.error(err);
            setReminders(prev);
            toast.error("Couldn't delete that reminder.");
        }
    }

    const selectedType = TYPES[form.reminder_type];

    return (
        <DashboardLayout>
            <Toaster position="top-right" />

            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="font-display text-3xl text-ink">Reminders</h1>
                    <p className="text-sm text-muted mt-1">
                        Schedule an email to go out later, or set a personal
                        reminder on your calendar.
                    </p>
                </div>

                <button
                    onClick={openModal}
                    className="flex items-center gap-2 bg-signal text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity shrink-0"
                >
                    <FiPlus size={16} />
                    New Reminder
                </button>
            </div>

            <div className="flex items-center gap-2 mb-6 flex-wrap">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={clsx(
                            "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                            filter === f
                                ? "bg-ink text-white border-ink"
                                : "border-line text-muted hover:text-ink hover:border-ink"
                        )}
                    >
                        {f === "ALL"
                            ? "All"
                            : f === "NEEDS_CONFIRMATION"
                            ? "Needs Confirmation"
                            : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-sm text-faint py-16 text-center">
                    Loading reminders...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-paper-raised border border-line rounded-xl py-16 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-signal-dim text-signal flex items-center justify-center mb-4">
                        <FiClock size={20} />
                    </div>
                    <p className="text-sm font-medium text-ink">
                        {filter === "ALL"
                            ? "No reminders yet"
                            : `No ${filter.toLowerCase()} reminders`}
                    </p>
                    <p className="text-sm text-faint mt-1 max-w-sm">
                        Create one to schedule an email or set a personal
                        nudge for later.
                    </p>
                    {filter === "ALL" && (
                        <button
                            onClick={openModal}
                            className="mt-5 flex items-center gap-2 bg-signal text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <FiPlus size={16} />
                            New Reminder
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((reminder) => {
                        const type = TYPES[reminder.reminder_type] || TYPES.REMIND_ME;
                        const Icon = type.icon;

                        return (
                            <div
                                key={reminder.id}
                                className="bg-paper-raised border border-line rounded-xl p-5 flex items-start gap-4"
                            >
                                <span
                                    className={clsx(
                                        "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                                        reminder.reminder_type === "SCHEDULE_EMAIL"
                                            ? "bg-signal-dim text-signal"
                                            : reminder.reminder_type === "MEETING"
                                            ? "bg-ember-dim text-ember"
                                            : "bg-sage-dim text-sage"
                                    )}
                                >
                                    <Icon size={18} />
                                </span>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-ink truncate">
                                            {reminder.subject}
                                        </p>
                                        {reminder.source === "AI_DETECTED" && (
                                            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-signal-dim text-signal">
                                                <FiZap size={11} />
                                                AI detected
                                            </span>
                                        )}
                                        <span
                                            className={clsx(
                                                "text-[11px] font-medium px-2 py-0.5 rounded-full",
                                                STATUS_STYLES[reminder.status]
                                            )}
                                        >
                                            {reminder.status === "NEEDS_CONFIRMATION"
                                                ? "Needs confirmation"
                                                : reminder.status}
                                        </span>
                                    </div>

                                    {reminder.body && (
                                        <p className="text-sm text-muted mt-1 line-clamp-2">
                                            {reminder.body}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4 mt-3 text-xs text-faint flex-wrap">
                                        <span className="flex items-center gap-1.5">
                                            <FiCalendar size={13} />
                                            {formatWhen(reminder.scheduled_time)}
                                        </span>

                                        {reminder.reminder_type === "SCHEDULE_EMAIL" && (
                                            <span className="flex items-center gap-1.5">
                                                <FiUser size={13} />
                                                {reminder.recipient}
                                            </span>
                                        )}

                                        <span className="flex items-center gap-1.5">
                                            <Icon size={13} />
                                            {type.label}
                                        </span>
                                    </div>
                                </div>

                                {reminder.status === "NEEDS_CONFIRMATION" && (
                                    <button
                                        onClick={() => handleConfirmMeeting(reminder)}
                                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md shrink-0 bg-sage text-white hover:opacity-90 transition-opacity"
                                    >
                                        <FiCheck size={13} />
                                        Confirm
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDelete(reminder.id)}
                                    className={clsx(
                                        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md shrink-0 transition-colors",
                                        confirmDeleteId === reminder.id
                                            ? "bg-ember text-white"
                                            : "text-faint hover:text-ember hover:bg-ember-dim"
                                    )}
                                >
                                    <FiTrash2 size={13} />
                                    {confirmDeleteId === reminder.id ? "Confirm" : ""}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && (
                <div
                    className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50"
                    onClick={closeModal}
                >
                    <div
                        className="bg-paper-raised border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 pt-6">
                            <h2 className="font-display text-xl text-ink">
                                New Reminder
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-faint hover:text-ink transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Type toggle */}
                            <div className="grid grid-cols-2 gap-2 bg-paper p-1 rounded-lg">
                                {CREATABLE_TYPES.map((t) => {
                                    const TIcon = t.icon;
                                    const active = form.reminder_type === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                updateField("reminder_type", t.value);
                                                setConflict(null);
                                            }}
                                            className={clsx(
                                                "flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-md transition-colors",
                                                active
                                                    ? "bg-paper-raised text-ink shadow-sm border border-line"
                                                    : "text-muted hover:text-ink"
                                            )}
                                        >
                                            <TIcon size={15} />
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-faint -mt-3">
                                {selectedType.blurb}
                            </p>

                            {form.reminder_type === TYPES.SCHEDULE_EMAIL.value && (
                                <div>
                                    <label className="text-xs font-medium text-muted mb-1.5 block">
                                        Recipient
                                    </label>
                                    <input
                                        type="email"
                                        value={form.recipient}
                                        onChange={(e) =>
                                            updateField("recipient", e.target.value)
                                        }
                                        placeholder="someone@example.com"
                                        className="w-full text-sm border border-line rounded-lg px-3 py-2.5 bg-paper text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-signal-dim focus:border-signal"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-medium text-muted mb-1.5 block">
                                    {form.reminder_type === TYPES.REMIND_ME.value
                                        ? "Title"
                                        : "Subject"}
                                </label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) =>
                                        updateField("subject", e.target.value)
                                    }
                                    placeholder={
                                        form.reminder_type === TYPES.REMIND_ME.value
                                            ? "Call the dentist"
                                            : "Following up on our chat"
                                    }
                                    className="w-full text-sm border border-line rounded-lg px-3 py-2.5 bg-paper text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-signal-dim focus:border-signal"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted mb-1.5 block">
                                    {form.reminder_type === TYPES.REMIND_ME.value
                                        ? "Note"
                                        : "Body"}
                                </label>
                                <textarea
                                    value={form.body}
                                    onChange={(e) =>
                                        updateField("body", e.target.value)
                                    }
                                    rows={4}
                                    placeholder={
                                        form.reminder_type === TYPES.REMIND_ME.value
                                            ? "Details for yourself..."
                                            : "Write the email..."
                                    }
                                    className="w-full text-sm border border-line rounded-lg px-3 py-2.5 bg-paper text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-signal-dim focus:border-signal resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-muted mb-1.5 block">
                                    {form.reminder_type === TYPES.REMIND_ME.value
                                        ? "Remind me at"
                                        : "Send at"}
                                </label>
                                <input
                                    type="datetime-local"
                                    value={form.scheduled_time}
                                    onChange={(e) =>
                                        updateField("scheduled_time", e.target.value)
                                    }
                                    className="w-full text-sm border border-line rounded-lg px-3 py-2.5 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-signal-dim focus:border-signal"
                                />
                            </div>

                            {conflict && (
                                <div className="bg-ember-dim border border-ember/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-ember text-sm font-medium">
                                        <FiAlertTriangle size={15} />
                                        This time overlaps your calendar
                                    </div>
                                    <ul className="mt-2 space-y-1">
                                        {conflict.conflicts.map((c, i) => (
                                            <li
                                                key={c.event_id || i}
                                                className="text-xs text-ink/80"
                                            >
                                                {c.title} —{" "}
                                                {c.start ? formatWhen(c.start) : "?"}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => submitReminder(true)}
                                        className="mt-3 text-xs font-medium text-white bg-ember px-3 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        Schedule anyway
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 pb-6">
                            <button
                                onClick={closeModal}
                                disabled={submitting}
                                className="text-sm font-medium text-muted px-4 py-2.5 rounded-lg hover:bg-paper transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => submitReminder(false)}
                                disabled={submitting}
                                className="flex items-center gap-2 bg-signal text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {submitting
                                    ? "Saving..."
                                    : form.reminder_type === TYPES.REMIND_ME.value
                                    ? "Set Reminder"
                                    : "Schedule Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}