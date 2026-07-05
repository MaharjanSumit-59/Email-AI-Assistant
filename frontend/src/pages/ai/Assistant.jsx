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

const PRIORITY_STYLES = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
};

function ResultCard({ title, icon, children }) {
    return (
        <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
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
        setResults({ summary: null, reply: null, tasks: null, decision: null });
    };

    const runAction = async (action) => {
        if (!selectedEmail) return;

        setLoadingAction(action);

        try {
            if (action === "summarize") {
                const data = await summarizeEmail(selectedId);
                setResults((prev) => ({ ...prev, summary: data.summary }));
            } else if (action === "reply") {
                const data = await generateReply(selectedId);
                setResults((prev) => ({ ...prev, reply: data.reply }));
            } else if (action === "tasks") {
                const data = await extractTasks(selectedId);
                setResults((prev) => ({ ...prev, tasks: data.tasks }));
            } else if (action === "analyze") {
                const data = await analyzeEmail(selectedId);
                setResults({
                    summary: data.summary,
                    reply: data.reply,
                    tasks: data.tasks,
                    decision: data.decision,
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
            <h1 className="text-3xl font-bold mb-6">AI Assistant</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Email picker */}
                <div className="lg:col-span-1 bg-white border rounded-xl overflow-hidden flex flex-col max-h-[75vh]">
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                            <FiSearch className="text-gray-400 shrink-0" />
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
                            <div className="p-6 text-center text-gray-400 text-sm">
                                Loading emails...
                            </div>
                        )}

                        {!loadingEmails && emailsError && (
                            <div className="p-6 text-center text-red-500 text-sm">
                                {emailsError}
                            </div>
                        )}

                        {!loadingEmails &&
                            !emailsError &&
                            filteredEmails.length === 0 && (
                                <div className="p-6 text-center text-gray-400 text-sm">
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
                                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition ${
                                            isSelected
                                                ? "bg-blue-50 border-l-4 border-l-blue-600"
                                                : ""
                                        }`}
                                    >
                                        <p className="font-medium text-sm truncate">
                                            {email.subject || "(no subject)"}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
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
                        <div className="bg-white border rounded-xl p-16 text-center text-gray-400">
                            <FiZap size={32} className="mx-auto mb-3" />
                            <p className="text-gray-600 font-medium">
                                Pick an email to get started
                            </p>
                            <p className="text-sm">
                                Choose one from the list to summarize, draft a
                                reply, or pull out action items.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white border rounded-xl p-5">
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                                    Selected email
                                </p>
                                <p className="font-semibold">
                                    {selectedEmail.subject ||
                                        "(no subject)"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    From{" "}
                                    {formatSender(selectedEmail.sender)}
                                </p>

                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button
                                        onClick={() => runAction("summarize")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <FiFileText />
                                        {loadingAction === "summarize"
                                            ? "Summarizing..."
                                            : "Summarize"}
                                    </button>

                                    <button
                                        onClick={() => runAction("reply")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <FiCornerUpLeft />
                                        {loadingAction === "reply"
                                            ? "Drafting..."
                                            : "Suggest reply"}
                                    </button>

                                    <button
                                        onClick={() => runAction("tasks")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <FiCheckSquare />
                                        {loadingAction === "tasks"
                                            ? "Extracting..."
                                            : "Extract tasks"}
                                    </button>

                                    <button
                                        onClick={() => runAction("analyze")}
                                        disabled={loadingAction !== null}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <FiZap />
                                        {loadingAction === "analyze"
                                            ? "Analyzing..."
                                            : "Full analysis"}
                                    </button>
                                </div>
                            </div>

                            {!hasResults && loadingAction === null && (
                                <div className="bg-white border rounded-xl p-10 text-center text-gray-400 text-sm">
                                    Run an action above to see results here.
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
                                                PRIORITY_STYLES[
                                                    results.decision.priority
                                                ] || "bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {results.decision.priority}{" "}
                                            priority
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {results.decision.category}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                            {results.decision.importance}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
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
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {results.summary}
                                    </p>
                                </ResultCard>
                            )}

                            {results.reply && (
                                <ResultCard
                                    title="Suggested reply"
                                    icon={<FiCornerUpLeft />}
                                >
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                                        {results.reply}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleUseReply}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                                        >
                                            Use in reply
                                            <FiArrowRight />
                                        </button>
                                        <button
                                            onClick={handleCopyReply}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
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
                                        <p className="text-gray-400 text-sm">
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
                                                        <FiCheckSquare className="mt-1 text-gray-300 shrink-0" />
                                                        <div>
                                                            <p className="text-gray-800">
                                                                {task.task}
                                                            </p>
                                                            <p className="text-xs text-gray-400">
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