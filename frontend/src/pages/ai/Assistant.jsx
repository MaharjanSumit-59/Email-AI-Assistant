import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FiSearch,
    FiFileText,
    FiCornerUpLeft,
    FiCheckSquare,
    FiZap,
    FiCopy,
    FiArrowRight,
} from "react-icons/fi";

import DashboardLayout from "../../layouts/DashboardLayout";
import { getInbox } from "../../services/emailService";
import {
    summarizeEmail,
    generateReply,
    extractTasks,
    analyzeEmail,
} from "../../services/aiService";

function formatSender(sender) {
    if (!sender) return "Unknown sender";
    const match = sender.match(/^(.*?)<.*>$/);
    if (match && match[1].trim()) {
        return match[1].trim().replace(/^"|"$/g, "");
    }
    return sender;
}

const PRIORITY_BADGE = {
    High: "bg-ember-dim text-ember",
    Medium: "bg-signal-dim text-signal",
    Low: "bg-sage-dim text-sage",
};

function ResultCard({ title, icon, children }) {
    return (
        <div className="bg-paper-raised border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 text-ink font-semibold text-sm">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

export default function Assistant() {
    const navigate = useNavigate();

    const [emails, setEmails] = useState([]);
    const [loadingEmails, setLoadingEmails] = useState(true);
    const [emailsError, setEmailsError] = useState(null);
    const [filter, setFilter] = useState("");

    const [selectedId, setSelectedId] = useState(null);

    const [results, setResults] = useState({
        summary: null,
        reply: null,
        tasks: null,
        decision: null,
        attachmentsAnalyzed: [],
        attachmentsSkipped: [],
    });
    const [loadingAction, setLoadingAction] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoadingEmails(true);
            setEmailsError(null);

            try {
                const data = await getInbox();
                setEmails(data);
            } catch (err) {
                console.error(err);
                setEmailsError("Couldn't load your inbox.");
            } finally {
                setLoadingEmails(false);
            }
        };

        load();
    }, []);

    const filteredEmails = useMemo(() => {
        if (!filter.trim()) return emails;

        const q = filter.toLowerCase();

        return emails.filter(
            (e) =>
                e.subject?.toLowerCase().includes(q) ||
                e.sender?.toLowerCase().includes(q)
        );
    }, [emails, filter]);

    const selectedEmail = emails.find(
        (e) => e.gmail_message_id === selectedId
    );

    const selectEmail = (id) => {
        setSelectedId(id);
        // Fresh email, fresh results — don't show stale AI output from
        // whatever was selected before.
        setResults({
            summary: null,
            reply: null,
            tasks: null,
            decision: null,
            attachmentsAnalyzed: [],
            attachmentsSkipped: [],
        });
    };

    const runAction = async (action) => {
        if (!selectedEmail) return;

        setLoadingAction(action);

        try {
            if (action === "summarize") {
                const data = await summarizeEmail(selectedId);
                setResults((prev) => ({
                    ...prev,
                    summary: data.summary,
                    attachmentsAnalyzed: data.attachments_analyzed || [],
                    attachmentsSkipped: data.attachments_skipped || [],
                }));
            } else if (action === "reply") {
                const data = await generateReply(selectedId);
                setResults((prev) => ({
                    ...prev,
                    reply: data.reply,
                    attachmentsAnalyzed: data.attachments_analyzed || [],
                    attachmentsSkipped: data.attachments_skipped || [],
                }));
            } else if (action === "tasks") {
                const data = await extractTasks(selectedId);
                setResults((prev) => ({
                    ...prev,
                    tasks: data.tasks,
                    attachmentsAnalyzed: data.attachments_analyzed || [],
                    attachmentsSkipped: data.attachments_skipped || [],
                }));
            } else if (action === "analyze") {
                const data = await analyzeEmail(selectedId);
                setResults({
                    summary: data.summary,
                    reply: data.reply,
                    tasks: data.tasks,
                    decision: data.decision,
                    attachmentsAnalyzed: data.attachments_analyzed || [],
                    attachmentsSkipped: data.attachments_skipped || [],
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("The AI couldn't process that email. Try again.");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCopyReply = async () => {
        try {
            await navigator.clipboard.writeText(results.reply);
            toast.success("Reply copied");
        } catch (err) {
            console.error(err);
            toast.error("Couldn't copy to clipboard");
        }
    };

    const handleUseReply = () => {
        navigate(`/email/${selectedId}`, {
            state: { draftReply: results.reply },
        });
    };

    const hasResults =
        results.summary || results.reply || results.tasks || results.decision;

    return (
        <DashboardLayout>
            <h1 className="font-display text-3xl mb-8">Assistant</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Email picker */}
                <div className="lg:col-span-1 bg-paper-raised border border-line rounded-xl overflow-hidden flex flex-col max-h-[75vh]">
                    <div className="p-4 border-b border-line">
                        <div className="flex items-center gap-2 bg-paper border border-line rounded-lg px-3 py-2 focus-within:border-signal transition-colors">
                            <FiSearch className="text-faint shrink-0" />
                            <input
                                type="text"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="Filter your inbox..."
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loadingEmails && (
                            <div className="p-6 text-center text-muted text-sm">
                                Loading emails...
                            </div>
                        )}

                        {!loadingEmails && emailsError && (
                            <div className="p-6 text-center text-ember text-sm">
                                {emailsError}
                            </div>
                        )}

                        {!loadingEmails &&
                            !emailsError &&
                            filteredEmails.length === 0 && (
                                <div className="p-6 text-center text-faint text-sm">
                                    No emails match.
                                </div>
                            )}

                        {!loadingEmails &&
                            filteredEmails.map((email) => {
                                const isSelected =
                                    email.gmail_message_id === selectedId;

                                return (
                                    <button
                                        key={email.gmail_message_id}
                                        onClick={() =>
                                            selectEmail(
                                                email.gmail_message_id
                                            )
                                        }
                                        className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 hover:bg-paper transition-colors ${
                                            isSelected
                                                ? "bg-signal-dim border-l-[3px] border-l-signal"
                                                : ""
                                        }`}
                                    >
                                        <p className="font-medium text-sm truncate">
                                            {email.subject || "(no subject)"}
                                        </p>
                                        <p className="text-xs text-faint truncate">
                                            {formatSender(email.sender)}
                                        </p>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Assistant panel */}
                <div className="lg:col-span-2 space-y-6">
                    {!selectedEmail ? (
                        <div className="bg-paper-raised border border-line rounded-xl p-16 text-center text-faint">
                            <FiZap size={30} className="mx-auto mb-3" />
                            <p className="text-ink font-medium">
                                Pick an email to get started
                            </p>
                            <p className="text-sm">
                                Choose one from the list to summarize, draft a
                                reply, or pull out action items.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-paper-raised border border-line rounded-xl p-5">
                                <p className="text-xs font-mono uppercase tracking-wider text-faint mb-1.5">
                                    Selected email
                                </p>
                                <p className="font-semibold">
                                    {selectedEmail.subject ||
                                        "(no subject)"}
                                </p>
                                <p className="text-sm text-muted">
                                    From{" "}
                                    {formatSender(selectedEmail.sender)}
                                </p>

                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button
                                        onClick={() => runAction("summarize")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:border-signal hover:text-signal disabled:opacity-40 transition-colors"
                                    >
                                        <FiFileText />
                                        {loadingAction === "summarize"
                                            ? "Summarizing..."
                                            : "Summarize"}
                                    </button>

                                    <button
                                        onClick={() => runAction("reply")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:border-signal hover:text-signal disabled:opacity-40 transition-colors"
                                    >
                                        <FiCornerUpLeft />
                                        {loadingAction === "reply"
                                            ? "Drafting..."
                                            : "Suggest reply"}
                                    </button>

                                    <button
                                        onClick={() => runAction("tasks")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:border-signal hover:text-signal disabled:opacity-40 transition-colors"
                                    >
                                        <FiCheckSquare />
                                        {loadingAction === "tasks"
                                            ? "Extracting..."
                                            : "Extract tasks"}
                                    </button>

                                    <button
                                        onClick={() => runAction("analyze")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-ink disabled:opacity-40 transition-colors"
                                    >
                                        <FiZap />
                                        {loadingAction === "analyze"
                                            ? "Analyzing..."
                                            : "Full analysis"}
                                    </button>
                                </div>
                            </div>

                            {!hasResults && loadingAction === null && (
                                <div className="bg-paper-raised border border-line rounded-xl p-10 text-center text-faint text-sm">
                                    Run an action above to see results here.
                                </div>
                            )}

                            {(results.attachmentsAnalyzed.length > 0 ||
                                results.attachmentsSkipped.length > 0) && (
                                <div className="bg-paper-raised border border-line rounded-xl px-4 py-3 text-xs text-muted">
                                    {results.attachmentsAnalyzed.length > 0 && (
                                        <p>
                                            📎 Read attachment
                                            {results.attachmentsAnalyzed.length > 1
                                                ? "s"
                                                : ""}
                                            :{" "}
                                            {results.attachmentsAnalyzed.join(
                                                ", "
                                            )}
                                        </p>
                                    )}
                                    {results.attachmentsSkipped.length > 0 && (
                                        <p className="text-faint">
                                            Skipped (unsupported or too
                                            large):{" "}
                                            {results.attachmentsSkipped.join(
                                                ", "
                                            )}
                                        </p>
                                    )}
                                </div>
                            )}

                            {results.decision && (
                                <ResultCard
                                    title="Classification"
                                    icon={<FiZap />}
                                >
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                PRIORITY_BADGE[
                                                    results.decision.priority
                                                ] || "bg-paper text-muted"
                                            }`}
                                        >
                                            {results.decision.priority}{" "}
                                            priority
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-paper text-muted">
                                            {results.decision.category}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-paper text-muted">
                                            {results.decision.importance}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-paper text-muted font-mono">
                                            {Math.round(
                                                results.decision.confidence *
                                                    100
                                            )}
                                            % confidence
                                        </span>
                                    </div>
                                </ResultCard>
                            )}

                            {results.summary && (
                                <ResultCard
                                    title="Summary"
                                    icon={<FiFileText />}
                                >
                                    <p className="text-ink whitespace-pre-wrap leading-relaxed text-sm">
                                        {results.summary}
                                    </p>
                                </ResultCard>
                            )}

                            {results.reply && (
                                <ResultCard
                                    title="Suggested reply"
                                    icon={<FiCornerUpLeft />}
                                >
                                    <p className="text-ink whitespace-pre-wrap leading-relaxed mb-4 text-sm">
                                        {results.reply}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleUseReply}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-ink transition-colors"
                                        >
                                            Use in reply
                                            <FiArrowRight />
                                        </button>
                                        <button
                                            onClick={handleCopyReply}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:bg-paper transition-colors"
                                        >
                                            <FiCopy />
                                            Copy
                                        </button>
                                    </div>
                                </ResultCard>
                            )}

                            {results.tasks && (
                                <ResultCard
                                    title="Action items"
                                    icon={<FiCheckSquare />}
                                >
                                    {results.tasks.length === 0 ? (
                                        <p className="text-faint text-sm">
                                            No action items found in this
                                            email.
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {results.tasks.map(
                                                (task, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="flex items-start gap-3"
                                                    >
                                                        <FiCheckSquare className="mt-1 text-faint shrink-0" />
                                                        <div>
                                                            <p className="text-ink text-sm">
                                                                {task.task}
                                                            </p>
                                                            <p className="text-xs text-faint font-mono">
                                                                {task.person
                                                                    ? `${task.person} · `
                                                                    : ""}
                                                                {task.deadline
                                                                    ? task.deadline
                                                                    : "No deadline"}
                                                            </p>
                                                        </div>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    )}
                                </ResultCard>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}