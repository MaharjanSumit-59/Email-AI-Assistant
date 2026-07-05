import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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

export default function EmailDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [starred, setStarred] = useState(false);
    const [busy, setBusy] = useState(false);

    const [showReply, setShowReply] = useState(false);
    const [replyBody, setReplyBody] = useState("");
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

    return (
        <DashboardLayout>
            <Link
                to="/inbox"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
            >
                <FiArrowLeft />
                Back to inbox
            </Link>

            {loading && (
                <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
                    Loading email...
                </div>
            )}

            {!loading && error && (
                <div className="bg-white border rounded-xl p-10 text-center text-red-500">
                    {error}
                </div>
            )}

            {!loading && !error && email && (
                <div className="bg-white border rounded-xl overflow-hidden">
                    <div className="p-6 border-b">
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="text-2xl font-bold">
                                {email.subject || "(no subject)"}
                            </h1>

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
                                            starred
                                                ? "hidden"
                                                : "text-gray-300"
                                        }
                                    />
                                    <FaStar
                                        className={
                                            starred
                                                ? "text-yellow-400"
                                                : "hidden"
                                        }
                                    />
                                </button>

                                <button
                                    onClick={handleDelete}
                                    disabled={busy}
                                    aria-label="Delete email"
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <FiTrash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-500">
                            <p>
                                <span className="font-medium text-gray-700">
                                    {extractName(email.from)}
                                </span>{" "}
                                &lt;{extractEmailAddress(email.from)}&gt;
                            </p>
                            <p>To: {email.to}</p>
                            <p>{email.date}</p>
                        </div>
                    </div>

                    <div className="p-6 whitespace-pre-wrap leading-relaxed text-gray-800">
                        {email.body || email.snippet || "(no content)"}
                    </div>

                    <div className="p-6 border-t bg-gray-50">
                        {!showReply ? (
                            <button
                                onClick={() => setShowReply(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
                            >
                                <FiCornerUpLeft />
                                Reply
                            </button>
                        ) : (
                            <form onSubmit={handleSendReply}>
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
                                    className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />

                                <div className="mt-3 flex items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={
                                            sendingReply || !replyBody.trim()
                                        }
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
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
                                        className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-100"
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
