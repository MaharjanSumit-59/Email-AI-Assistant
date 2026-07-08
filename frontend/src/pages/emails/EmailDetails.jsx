import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiStar, FiTrash2, FiCornerUpLeft } from "react-icons/fi";
import { FaStar } from "react-icons/fa";

import DashboardLayout from "../../layouts/DashboardLayout";
import {
    getEmail,
    starEmail,
    unstarEmail,
    deleteEmail,
    replyEmail,
} from "../../services/emailService";

// Gmail "From" headers look like `Name <email@example.com>`.
function extractEmailAddress(header) {
    if (!header) return "";
    const match = header.match(/<(.+)>/);
    return match ? match[1] : header;
}

function extractName(header) {
    if (!header) return "";
    const match = header.match(/^(.*?)<.*>$/);
    if (match && match[1].trim()) {
        return match[1].trim().replace(/^"|"$/g, "");
    }
    return header;
}

const PRIORITY_BAR = {
    High: "bg-ember",
    Medium: "bg-signal",
    Low: "bg-sage",
};

const PRIORITY_BADGE = {
    High: "bg-ember-dim text-ember",
    Medium: "bg-signal-dim text-signal",
    Low: "bg-sage-dim text-sage",
};

export default function EmailDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Carried over from the Inbox row so we can paint the priority bar and
    // category chip instantly, before the full email has loaded.
    const preview = location.state?.preview;

    const [email, setEmail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [starred, setStarred] = useState(Boolean(preview?.starred));
    const [busy, setBusy] = useState(false);

    const incomingDraft = location.state?.draftReply || "";
    const [showReply, setShowReply] = useState(Boolean(incomingDraft));
    const [replyBody, setReplyBody] = useState(incomingDraft);
    const [sendingReply, setSendingReply] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await getEmail(id);
                if (!isMounted) return;
                setEmail(data);
                setStarred((data.label_ids || []).includes("STARRED"));
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError("Couldn't load this email.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [id]);

    const handleToggleStar = async () => {
        setBusy(true);
        const next = !starred;
        setStarred(next);

        try {
            if (next) {
                await starEmail(id);
            } else {
                await unstarEmail(id);
            }
        } catch (err) {
            console.error(err);
            setStarred(!next);
            toast.error("Couldn't update star.");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        setBusy(true);

        try {
            await deleteEmail(id);
            toast.success("Email moved to trash");
            navigate("/inbox");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't delete this email.");
            setBusy(false);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();

        if (!replyBody.trim()) return;

        setSendingReply(true);

        try {
            await replyEmail({
                thread_id: email.thread_id,
                to: extractEmailAddress(email.from),
                subject: email.subject?.startsWith("Re:")
                    ? email.subject
                    : `Re: ${email.subject || ""}`,
                body: replyBody.trim(),
            });

            toast.success("Reply sent");
            setReplyBody("");
            setShowReply(false);
        } catch (err) {
            console.error(err);
            toast.error("Couldn't send your reply.");
        } finally {
            setSendingReply(false);
        }
    };

    const barClass = PRIORITY_BAR[preview?.priority] || "bg-line";
    const badgeClass =
        PRIORITY_BADGE[preview?.priority] || "bg-paper text-muted";

    return (
        <DashboardLayout>
            <Link
                to="/inbox"
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink mb-6"
            >
                <FiArrowLeft />
                Back to inbox
            </Link>

            {loading && (
                <div className="bg-paper-raised border border-line rounded-xl p-10 text-center text-muted text-sm">
                    Loading email...
                </div>
            )}

            {!loading && error && (
                <div className="bg-paper-raised border border-line rounded-xl p-10 text-center text-ember text-sm">
                    {error}
                </div>
            )}

            {!loading && !error && email && (
                <div className="relative bg-paper-raised border border-line rounded-xl overflow-hidden">
                    <span
                        className={`absolute left-0 top-0 bottom-0 w-1 ${barClass}`}
                    />

                    <div className="p-7 pl-8 border-b border-line">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                {preview?.priority && (
                                    <span
                                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded mb-3 ${badgeClass}`}
                                    >
                                        {preview.priority} priority
                                        {preview.category
                                            ? ` · ${preview.category}`
                                            : ""}
                                    </span>
                                )}
                                <h1 className="font-display text-2xl leading-snug">
                                    {email.subject || "(no subject)"}
                                </h1>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={handleToggleStar}
                                    disabled={busy}
                                    aria-label={
                                        starred ? "Unstar email" : "Star email"
                                    }
                                    className="text-xl"
                                >
                                    <FiStar
                                        className={
                                            starred ? "hidden" : "text-faint"
                                        }
                                    />
                                    <FaStar
                                        className={
                                            starred ? "text-ember" : "hidden"
                                        }
                                    />
                                </button>

                                <button
                                    onClick={handleDelete}
                                    disabled={busy}
                                    aria-label="Delete email"
                                    className="text-faint hover:text-ember"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 text-sm text-muted space-y-0.5">
                            <p>
                                <span className="font-medium text-ink">
                                    {extractName(email.from)}
                                </span>{" "}
                                &lt;{extractEmailAddress(email.from)}&gt;
                            </p>
                            <p>To: {email.to}</p>
                            <p className="font-mono text-xs">{email.date}</p>
                        </div>
                    </div>

                    <div className="p-7 pl-8 whitespace-pre-wrap leading-relaxed text-ink">
                        {email.body || email.snippet || "(no content)"}
                    </div>

                    <div className="p-7 pl-8 border-t border-line bg-paper">
                        {!showReply ? (
                            <button
                                onClick={() => setShowReply(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-signal text-white hover:bg-ink text-sm font-medium transition-colors"
                            >
                                <FiCornerUpLeft />
                                Reply
                            </button>
                        ) : (
                            <form onSubmit={handleSendReply}>
                                {incomingDraft && (
                                    <p className="text-xs text-signal font-medium mb-2">
                                        Drafted by the AI Assistant — review
                                        before sending.
                                    </p>
                                )}
                                <textarea
                                    value={replyBody}
                                    onChange={(e) =>
                                        setReplyBody(e.target.value)
                                    }
                                    rows={6}
                                    autoFocus
                                    placeholder={`Reply to ${extractName(
                                        email.from
                                    )}...`}
                                    className="w-full border border-line bg-paper-raised rounded-lg p-3 outline-none focus:border-signal resize-none text-sm"
                                />

                                <div className="mt-3 flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={
                                            sendingReply || !replyBody.trim()
                                        }
                                        className="px-4 py-2 rounded-lg bg-signal text-white hover:bg-ink text-sm font-medium disabled:opacity-40 transition-colors"
                                    >
                                        {sendingReply
                                            ? "Sending..."
                                            : "Send reply"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowReply(false);
                                            setReplyBody("");
                                        }}
                                        className="px-4 py-2 rounded-lg border border-line text-sm font-medium hover:bg-paper-raised transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
