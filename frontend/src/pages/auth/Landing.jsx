import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiZap, FiFileText, FiCornerUpLeft, FiCheckSquare } from "react-icons/fi";

import useAuth from "../../hooks/useAuth";

function handleGoogleLogin() {
    window.location.href = "http://127.0.0.1:8000/api/auth/google/";
}

function GoogleButton({ className = "" }) {
    return (
        <button
            onClick={handleGoogleLogin}
            className={`inline-flex items-center gap-3 bg-ink text-paper px-6 py-3.5 rounded-lg font-medium hover:bg-signal transition-colors ${className}`}
        >
            <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                    fill="#fff"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
                />
                <path
                    fill="#fff"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"
                />
                <path
                    fill="#fff"
                    d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z"
                />
                <path
                    fill="#fff"
                    d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
                />
            </svg>
            Continue with Google
        </button>
    );
}

const PRIORITY_BAR = {
    ember: "bg-ember",
    signal: "bg-signal",
    sage: "bg-sage",
};

// A stylized, non-functional preview of what the inbox looks like once
// the assistant has been through it — this is the page's single job:
// show the before/after in one glance.
function InboxPreview() {
    const raw = [
        { subject: "Re: Re: Re: quick sync tomorrow?", sender: "d.patel" },
        { subject: "Your weekly digest is here", sender: "no-reply" },
        { subject: "Invoice #4471 attached", sender: "billing" },
        { subject: "Can you review this by EOD", sender: "m.osei" },
    ];

    const triaged = [
        {
            subject: "Can you review this by EOD",
            sender: "m.osei",
            priority: "ember",
            tag: "Reply drafted",
        },
        {
            subject: "Invoice #4471 attached",
            sender: "billing",
            priority: "signal",
            tag: "1 task found",
        },
        {
            subject: "Your weekly digest is here",
            sender: "no-reply",
            priority: "sage",
            tag: "Summarized",
        },
    ];

    return (
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="bg-paper-raised border border-line rounded-xl p-4 opacity-70">
                <p className="text-xs font-mono uppercase tracking-wider text-faint mb-3">
                    Before
                </p>
                <ul className="space-y-2.5">
                    {raw.map((r) => (
                        <li key={r.subject} className="text-sm">
                            <p className="truncate text-ink/70">
                                {r.subject}
                            </p>
                            <p className="text-xs text-faint">{r.sender}</p>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="hidden sm:flex flex-col items-center text-faint">
                <FiZap size={18} />
            </div>

            <div className="bg-paper-raised border border-line rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                <p className="text-xs font-mono uppercase tracking-wider text-faint mb-3">
                    After
                </p>
                <ul className="space-y-2.5">
                    {triaged.map((r) => (
                        <li
                            key={r.subject}
                            className="relative pl-3 text-sm"
                        >
                            <span
                                className={`absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full ${PRIORITY_BAR[r.priority]}`}
                            />
                            <p className="truncate font-medium">
                                {r.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-faint">
                                    {r.sender}
                                </p>
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-signal-dim text-signal font-medium">
                                    {r.tag}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

const FEATURES = [
    {
        icon: <FiZap size={18} />,
        barClass: "bg-signal",
        iconClass: "text-signal",
        title: "Prioritize",
        body: "Every email is scored High, Medium, or Low the moment it arrives, so you know what actually needs you.",
    },
    {
        icon: <FiFileText size={18} />,
        barClass: "bg-sage",
        iconClass: "text-sage",
        title: "Summarize",
        body: "Long threads get reduced to the two or three lines that matter — read the gist, skip the scroll.",
    },
    {
        icon: <FiCornerUpLeft size={18} />,
        barClass: "bg-ember",
        iconClass: "text-ember",
        title: "Draft replies",
        body: "A reply is written for you in the right tone. Edit it or send it — nothing goes out on its own.",
    },
    {
        icon: <FiCheckSquare size={18} />,
        barClass: "bg-signal",
        iconClass: "text-signal",
        title: "Extract tasks",
        body: "Action items buried in a paragraph get pulled out with who owns them and when they're due.",
    },
];

export default function Landing() {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate("/inbox", { replace: true });
        }
    }, [loading, isAuthenticated, navigate]);

    return (
        <div className="min-h-screen bg-paper text-ink">
            <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
                <span className="font-display text-xl tracking-tight">
                    Signal
                </span>
                <GoogleButton className="text-sm py-2.5 px-4" />
            </header>

            <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">
                <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-signal mb-5">
                        For your Gmail inbox
                    </p>
                    <h1 className="font-display text-5xl sm:text-6xl leading-[1.05] mb-6">
                        Read less.
                        <br />
                        Know <em className="italic text-signal">more</em>.
                    </h1>
                    <p className="text-lg text-muted max-w-md mb-8 leading-relaxed">
                        Signal reads your inbox before you do — sorting what
                        matters from what doesn't, summarizing the rest, and
                        drafting replies so you can clear your day in
                        minutes.
                    </p>
                    <GoogleButton />
                    <p className="text-xs text-faint mt-4">
                        Connects to Gmail. Nothing sends without your
                        say-so.
                    </p>
                </div>

                <InboxPreview />
            </section>

            <section className="border-t border-line">
                <div className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="relative pl-4">
                            <span
                                className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-full ${f.barClass}`}
                            />
                            <div className={`mb-3 ${f.iconClass}`}>
                                {f.icon}
                            </div>
                            <h3 className="font-semibold mb-1.5">
                                {f.title}
                            </h3>
                            <p className="text-sm text-muted leading-relaxed">
                                {f.body}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-faint">
                Built on the Gmail API. Your messages stay in your mailbox —
                Signal only stores what it needs to keep your inbox
                organized.
            </footer>
        </div>
    );
}
