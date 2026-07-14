import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiMail,
    FiCalendar,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiStar,
    FiInbox,
    FiAlertTriangle,
    FiCopy,
    FiBell,
    FiActivity,
    FiAtSign,
    FiUser,
    FiEdit2,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashBoardLayout";
import useAuth from "../../hooks/useAuth";
import {
    getProfile,
    getSummary,
    updateProfile,
    deleteAccount,
} from "../../services/userService";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.@+-]+$/;
const MAX_LEN = 150;

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function StatTile({ icon, label, value, tone = "text-muted" }) {
    return (
        <div className="flex items-center gap-3 py-3 border-t border-line">
            <span className={`shrink-0 ${tone}`}>{icon}</span>
            <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-faint truncate">{value}</p>
            </div>
        </div>
    );
}

function FieldLabel({ icon, children, count }) {
    return (
        <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-faint">
                {icon}
                {children}
            </label>
            {count !== undefined && (
                <span
                    className={`text-[11px] tabular-nums ${
                        count > MAX_LEN ? "text-ember" : "text-faint"
                    }`}
                >
                    {count}/{MAX_LEN}
                </span>
            )}
        </div>
    );
}

function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-center justify-between py-3 border-t border-line first:border-t-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-faint">
                {icon}
                {label}
            </span>
            <span className="text-sm font-medium text-ink truncate max-w-[60%] text-right">
                {value || "—"}
            </span>
        </div>
    );
}

export default function Profile() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [summary, setSummary] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        username: "",
        first_name: "",
        last_name: "",
    });
    const [initialForm, setInitialForm] = useState(null);
    const [touched, setTouched] = useState({});
    const [saving, setSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [profileData, summaryData] = await Promise.all([
                    getProfile(),
                    getSummary(),
                ]);

                setProfile(profileData);
                setSummary(summaryData);

                const nextForm = {
                    username: profileData.username || "",
                    first_name: profileData.first_name || "",
                    last_name: profileData.last_name || "",
                };
                setForm(nextForm);
                setInitialForm(nextForm);
            } catch (err) {
                console.error(err);
                toast.error("Couldn't load your profile.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const dirty = useMemo(() => {
        if (!initialForm) return false;
        return (
            form.username !== initialForm.username ||
            form.first_name !== initialForm.first_name ||
            form.last_name !== initialForm.last_name
        );
    }, [form, initialForm]);

    // Warn before leaving the tab mid-edit with unsaved changes.
    useEffect(() => {
        const handler = (e) => {
            if (!isEditing || !dirty) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isEditing, dirty]);

    const usernameError = (() => {
        const value = form.username.trim();
        if (!value) return "Username is required.";
        if (value.length > MAX_LEN) return `Keep it under ${MAX_LEN} characters.`;
        if (!USERNAME_PATTERN.test(value)) {
            return "Only letters, numbers, and . @ + - _ are allowed.";
        }
        return null;
    })();

    const nameError = (value) =>
        value.length > MAX_LEN ? `Keep it under ${MAX_LEN} characters.` : null;

    const firstNameError = nameError(form.first_name);
    const lastNameError = nameError(form.last_name);

    const canSave =
        dirty && !usernameError && !firstNameError && !lastNameError && !saving;

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleBlur = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setTouched({ username: true, first_name: true, last_name: true });

        if (usernameError || firstNameError || lastNameError) {
            toast.error("Fix the highlighted fields before saving.");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                username: form.username.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
            };

            const updated = await updateProfile(payload);

            setProfile(updated);
            setForm(payload);
            setInitialForm(payload);
            setTouched({});
            setIsEditing(false);
            toast.success("Profile updated");
        } catch (err) {
            console.error(err);

            const detail =
                err?.response?.data?.username?.[0] ||
                "Couldn't save your changes. Try again.";
            toast.error(detail);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (dirty) {
            const confirmed = window.confirm(
                "Discard your unsaved changes?"
            );
            if (!confirmed) return;
        }

        if (initialForm) setForm(initialForm);
        setTouched({});
        setIsEditing(false);
    };

    const handleCopyEmail = async () => {
        if (!profile?.email) return;

        try {
            await navigator.clipboard.writeText(profile.email);
            toast.success("Email copied");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't copy. Select it manually.");
        }
    };

    const handleDelete = async () => {
        if (deleteText !== "DELETE") return;

        setDeleting(true);

        try {
            await deleteAccount();
            toast.success("Account deleted");
            logout();
            navigate("/");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't delete your account. Try again.");
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <h1 className="font-display text-3xl mb-8">Profile</h1>

                <div className="max-w-2xl space-y-6 animate-pulse">
                    <div className="bg-paper-raised border border-line rounded-xl p-6 h-24" />
                    <div className="bg-paper-raised border border-line rounded-xl p-6 h-56" />
                    <div className="bg-paper-raised border border-line rounded-xl p-6 h-48" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <h1 className="font-display text-3xl mb-8">Profile</h1>

            <div className="max-w-2xl space-y-6">
                {/* Identity header */}
                <div className="bg-paper-raised border border-line rounded-xl p-6 flex items-center gap-4">
                    <img
                        src={
                            profile?.profile_picture ||
                            "https://ui-avatars.com/api/?name=" +
                                encodeURIComponent(
                                    profile?.first_name ||
                                        profile?.username ||
                                        "U"
                                )
                        }
                        alt=""
                        className="w-16 h-16 rounded-full border border-line shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-display text-xl truncate">
                            {profile?.first_name || profile?.last_name
                                ? `${profile?.first_name || ""} ${
                                      profile?.last_name || ""
                                  }`.trim()
                                : profile?.username}
                        </p>

                        <button
                            onClick={handleCopyEmail}
                            className="text-sm text-muted flex items-center gap-1.5 mt-1 hover:text-signal transition-colors group"
                            title="Copy email"
                        >
                            <FiMail size={14} />
                            <span className="truncate">{profile?.email}</span>
                            <FiCopy
                                size={12}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            />
                        </button>

                        <p className="text-xs text-faint flex items-center gap-1.5 mt-1">
                            <FiCalendar size={12} />
                            Member since {formatDate(profile?.date_joined)}
                        </p>
                    </div>

                    <span
                        className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                            profile?.gmail_connected
                                ? "bg-sage-dim text-sage"
                                : "bg-ember-dim text-ember"
                        }`}
                    >
                        {profile?.gmail_connected ? (
                            <FiCheckCircle size={12} />
                        ) : (
                            <FiXCircle size={12} />
                        )}
                        {profile?.gmail_connected ? "Gmail linked" : "Not linked"}
                    </span>
                </div>

                {/* Personal details */}
                <div className="bg-paper-raised border border-line rounded-xl p-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-semibold text-ink">
                            Personal details
                        </h2>

                        {!isEditing && (
                            <button
                                onClick={handleStartEdit}
                                className="flex items-center gap-1.5 text-xs font-medium text-signal hover:underline"
                            >
                                <FiEdit2 size={12} />
                                Edit
                            </button>
                        )}
                    </div>

                    {!isEditing ? (
                        <div>
                            <DetailRow
                                icon={<FiAtSign size={12} />}
                                label="Username"
                                value={profile?.username}
                            />
                            <DetailRow
                                icon={<FiUser size={12} />}
                                label="First name"
                                value={profile?.first_name}
                            />
                            <DetailRow
                                icon={<FiUser size={12} />}
                                label="Last name"
                                value={profile?.last_name}
                            />
                            <DetailRow
                                icon={<FiMail size={12} />}
                                label="Email"
                                value={profile?.email}
                            />
                        </div>
                    ) : (
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel
                                        icon={<FiAtSign size={12} />}
                                        count={form.username.length}
                                    >
                                        Username
                                    </FieldLabel>
                                    <input
                                        type="text"
                                        value={form.username}
                                        maxLength={MAX_LEN + 20}
                                        autoFocus
                                        onChange={(e) =>
                                            handleChange(
                                                "username",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => handleBlur("username")}
                                        aria-invalid={Boolean(
                                            touched.username && usernameError
                                        )}
                                        className={`w-full px-3 py-2 rounded-lg border bg-paper text-sm focus:outline-none focus:ring-2 transition-colors ${
                                            touched.username && usernameError
                                                ? "border-ember focus:ring-ember-dim focus:border-ember"
                                                : "border-line focus:ring-signal-dim focus:border-signal"
                                        }`}
                                    />
                                    {touched.username && usernameError ? (
                                        <p className="text-xs text-ember mt-1.5">
                                            {usernameError}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-faint mt-1.5">
                                            Letters, numbers, and . @ + - _
                                            only.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <FieldLabel
                                            icon={<FiUser size={12} />}
                                            count={form.first_name.length}
                                        >
                                            First name
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            value={form.first_name}
                                            maxLength={MAX_LEN + 20}
                                            onChange={(e) =>
                                                handleChange(
                                                    "first_name",
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleBlur("first_name")
                                            }
                                            className={`w-full px-3 py-2 rounded-lg border bg-paper text-sm focus:outline-none focus:ring-2 transition-colors ${
                                                touched.first_name &&
                                                firstNameError
                                                    ? "border-ember focus:ring-ember-dim focus:border-ember"
                                                    : "border-line focus:ring-signal-dim focus:border-signal"
                                            }`}
                                        />
                                        {touched.first_name &&
                                            firstNameError && (
                                                <p className="text-xs text-ember mt-1.5">
                                                    {firstNameError}
                                                </p>
                                            )}
                                    </div>

                                    <div>
                                        <FieldLabel
                                            icon={<FiUser size={12} />}
                                            count={form.last_name.length}
                                        >
                                            Last name
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            value={form.last_name}
                                            maxLength={MAX_LEN + 20}
                                            onChange={(e) =>
                                                handleChange(
                                                    "last_name",
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleBlur("last_name")
                                            }
                                            className={`w-full px-3 py-2 rounded-lg border bg-paper text-sm focus:outline-none focus:ring-2 transition-colors ${
                                                touched.last_name &&
                                                lastNameError
                                                    ? "border-ember focus:ring-ember-dim focus:border-ember"
                                                    : "border-line focus:ring-signal-dim focus:border-signal"
                                            }`}
                                        />
                                        {touched.last_name &&
                                            lastNameError && (
                                                <p className="text-xs text-ember mt-1.5">
                                                    {lastNameError}
                                                </p>
                                            )}
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel icon={<FiMail size={12} />}>
                                        Email
                                    </FieldLabel>
                                    <input
                                        type="text"
                                        value={profile?.email || ""}
                                        disabled
                                        className="w-full px-3 py-2 rounded-lg border border-line bg-paper text-sm text-faint disabled:opacity-60 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-line">
                                <button
                                    type="submit"
                                    disabled={!canSave}
                                    className="px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                >
                                    {saving ? "Saving..." : "Save changes"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Snapshot */}
                <div className="bg-paper-raised border border-line rounded-xl p-6">
                    <h2 className="font-semibold text-ink mb-1">Snapshot</h2>
                    <p className="text-sm text-muted mb-1">
                        A quick look at how your account is connected and
                        used.
                    </p>

                    <div className="grid grid-cols-2 gap-x-4">
                        <StatTile
                            icon={
                                profile?.gmail_connected ? (
                                    <FiCheckCircle size={18} />
                                ) : (
                                    <FiXCircle size={18} />
                                )
                            }
                            label="Gmail"
                            tone={
                                profile?.gmail_connected
                                    ? "text-sage"
                                    : "text-ember"
                            }
                            value={
                                profile?.gmail_connected
                                    ? summary?.gmail_connected_since
                                        ? `Connected since ${formatDate(
                                              summary.gmail_connected_since
                                          )}`
                                        : "Connected"
                                    : "Not connected"
                            }
                        />

                        <StatTile
                            icon={<FiClock size={18} />}
                            label="Last login"
                            value={formatDateTime(profile?.last_login)}
                        />

                        <StatTile
                            icon={<FiInbox size={18} />}
                            label="Total emails"
                            tone="text-signal"
                            value={`${summary?.total_emails ?? 0} tracked`}
                        />

                        <StatTile
                            icon={<FiStar size={18} />}
                            label="Starred emails"
                            tone="text-ember"
                            value={`${summary?.starred_emails ?? 0} starred`}
                        />

                        <StatTile
                            icon={<FiBell size={18} />}
                            label="Pending reminders"
                            tone="text-sage"
                            value={`${summary?.pending_reminders ?? 0} upcoming`}
                        />

                        <StatTile
                            icon={<FiActivity size={18} />}
                            label="AI actions"
                            value={`${
                                summary?.automation_actions_total ?? 0
                            } total`}
                        />
                    </div>
                </div>

                {/* Danger zone */}
                <div className="bg-paper-raised border border-ember/30 rounded-xl p-6">
                    <h2 className="font-semibold text-ember mb-1 flex items-center gap-2">
                        <FiAlertTriangle size={16} />
                        Danger zone
                    </h2>
                    <p className="text-sm text-muted mb-5">
                        Deleting your account removes your profile, connected
                        Gmail token, and all tracked email data. This can't
                        be undone.
                    </p>

                    {!deleteOpen ? (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="px-4 py-2 rounded-lg border border-ember text-ember text-sm font-medium hover:bg-ember-dim transition-colors"
                        >
                            Delete account
                        </button>
                    ) : (
                        <div className="pt-5 border-t border-line space-y-3">
                            <p className="text-sm text-ink">
                                Type{" "}
                                <span className="font-mono font-semibold">
                                    DELETE
                                </span>{" "}
                                to confirm.
                            </p>
                            <input
                                type="text"
                                value={deleteText}
                                onChange={(e) => setDeleteText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full max-w-xs px-3 py-2 rounded-lg border border-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-ember-dim focus:border-ember"
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={
                                        deleteText !== "DELETE" || deleting
                                    }
                                    className="px-4 py-2 rounded-lg bg-ember text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                                >
                                    {deleting
                                        ? "Deleting..."
                                        : "Permanently delete my account"}
                                </button>
                                <button
                                    onClick={() => {
                                        setDeleteOpen(false);
                                        setDeleteText("");
                                    }}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}