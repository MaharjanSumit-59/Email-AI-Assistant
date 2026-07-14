import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiActivity } from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import { getProfile, updateProfile } from "../../services/userService";

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-40 ${
                checked ? "bg-signal" : "bg-line"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [automationEnabled, setAutomationEnabled] = useState(true);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [trashRetentionDays, setTrashRetentionDays] = useState(30);
    const [savingRetention, setSavingRetention] = useState(false);

    const RETENTION_OPTIONS = [7, 15, 30, 60, 90];

    useEffect(() => {
        const load = async () => {
            try {
                const profile = await getProfile();
                setAutomationEnabled(Boolean(profile.automation_enabled));
                setGmailConnected(Boolean(profile.gmail_connected));
                setTrashRetentionDays(profile.trash_retention_days ?? 30);
            } catch (err) {
                console.error(err);
                toast.error("Couldn't load your settings.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const handleToggle = async (next) => {
        setAutomationEnabled(next);
        setSaving(true);

        try {
            await updateProfile({ automation_enabled: next });
            toast.success(
                next ? "Automation turned on" : "Automation turned off"
            );
        } catch (err) {
            console.error(err);
            setAutomationEnabled(!next);
            toast.error("Couldn't save that. Try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleRetentionChange = async (days) => {
        const previous = trashRetentionDays;
        setTrashRetentionDays(days);
        setSavingRetention(true);

        try {
            await updateProfile({ trash_retention_days: days });
            toast.success(`Trash now auto-clears after ${days} days`);
        } catch (err) {
            console.error(err);
            setTrashRetentionDays(previous);
            toast.error("Couldn't save that. Try again.");
        } finally {
            setSavingRetention(false);
        }
    };

    return (
        <DashboardLayout>
            <h1 className="font-display text-3xl mb-8">Settings</h1>

            <div className="max-w-2xl space-y-6">
                <div className="bg-paper-raised border border-line rounded-xl p-6">
                    <h2 className="font-semibold text-ink mb-1">
                        AI automation
                    </h2>
                    <p className="text-sm text-muted mb-5">
                        When a new email arrives, the assistant classifies
                        it. Routine emails it's confident about get
                        answered right away; anything important, or
                        anything it isn't sure about, gets left as a
                        draft in Gmail for you to review instead.
                    </p>

                    {loading ? (
                        <p className="text-sm text-faint">Loading...</p>
                    ) : (
                        <div className="flex items-center justify-between py-3 border-t border-line">
                            <div>
                                <p className="text-sm font-medium text-ink">
                                    Automatic replies &amp; drafts
                                </p>
                                <p className="text-xs text-faint mt-0.5">
                                    {automationEnabled
                                        ? "On — new mail is analyzed as it arrives."
                                        : "Off — the assistant won't touch your inbox until you run it manually."}
                                </p>
                            </div>
                            <Toggle
                                checked={automationEnabled}
                                onChange={handleToggle}
                                disabled={saving}
                            />
                        </div>
                    )}

                    {!loading && !gmailConnected && (
                        <p className="text-xs text-ember mt-4">
                            Gmail isn't connected yet, so automation has
                            nothing to work on until you connect it.
                        </p>
                    )}
                </div>

                <div className="bg-paper-raised border border-line rounded-xl p-6">
                    <h2 className="font-semibold text-ink mb-1">
                        Trash auto-clear
                    </h2>
                    <p className="text-sm text-muted mb-5">
                        Deleted emails sit in Trash for a grace period
                        before they're permanently removed, in case you
                        change your mind. Choose how long that grace
                        period lasts.
                    </p>

                    {loading ? (
                        <p className="text-sm text-faint">Loading...</p>
                    ) : (
                        <div className="flex items-center justify-between py-3 border-t border-line">
                            <div>
                                <p className="text-sm font-medium text-ink">
                                    Delete emails from Trash after
                                </p>
                                <p className="text-xs text-faint mt-0.5">
                                    Currently set to{" "}
                                    {trashRetentionDays} day
                                    {trashRetentionDays === 1 ? "" : "s"}.
                                </p>
                            </div>

                            <select
                                value={trashRetentionDays}
                                disabled={savingRetention}
                                onChange={(e) =>
                                    handleRetentionChange(
                                        Number(e.target.value)
                                    )
                                }
                                className="px-3 py-2 rounded-lg border border-line bg-paper text-sm font-medium disabled:opacity-40"
                            >
                                {RETENTION_OPTIONS.map((days) => (
                                    <option key={days} value={days}>
                                        {days} days
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <Link
                    to="/ai/log"
                    className="flex items-center gap-3 bg-paper-raised border border-line rounded-xl p-6 hover:border-signal transition-colors"
                >
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-signal-dim text-signal shrink-0">
                        <FiActivity />
                    </span>
                    <div>
                        <p className="text-sm font-medium text-ink">
                            View automation log
                        </p>
                        <p className="text-xs text-faint">
                            See every reply sent and draft created, with
                            the reasoning behind each one.
                        </p>
                    </div>
                </Link>
            </div>
        </DashboardLayout>
    );
}