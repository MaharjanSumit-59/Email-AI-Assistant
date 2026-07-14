import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiZap,
    FiFileText,
    FiCornerUpLeft,
    FiCheckSquare,
    FiSend,
    FiEdit3,
    FiSkipForward,
    FiMail,
    FiSliders,
    FiBellOff,
    FiLock,
    FiEye,
    FiPower,
} from "react-icons/fi";

import useAuth from "../../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function handleGoogleLogin() {
    window.location.href = `${API_BASE}/auth/google/`;
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

// Signature element: a live-feed style preview of the real Automation Log
// page. This is the page's single most important argument for a product
// that acts inside someone's inbox on its own — you can see exactly what
// it did, including the times it chose to do nothing.
const FEED_META = {
    auto_replied: {
        label: "Auto-replied",
        icon: <FiSend size={13} />,
        badge: "bg-sage-dim text-sage",
    },
    draft_created: {
        label: "Draft created",
        icon: <FiEdit3 size={13} />,
        badge: "bg-signal-dim text-signal",
    },
    skipped: {
        label: "Skipped",
        icon: <FiSkipForward size={13} />,
        badge: "bg-paper text-faint",
    },
};

const FEED = [
    {
        action: "auto_replied",
        who: "m.osei",
        detail: "Confirmed availability for Thursday's review call.",
        when: "2m ago",
    },
    {
        action: "draft_created",
        who: "billing@vendor.io",
        detail: "Drafted a reply flagging invoice #4471 for approval.",
        when: "14m ago",
    },
    {
        action: "skipped",
        who: "legal@partnerco.com",
        detail: "Contract terms need your judgment — left untouched.",
        when: "41m ago",
    },
    {
        action: "auto_replied",
        who: "d.patel",
        detail: "Sent the meeting-notes recap you approved the pattern for.",
        when: "1h ago",
    },
];

function AutomationFeed() {
    return (
        <div className="bg-paper-raised border border-line rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
                <span className="text-xs font-mono uppercase tracking-wider text-faint">
                    Automation log
                </span>
                <span className="flex items-center gap-1.5 text-xs text-sage font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                    Live
                </span>
            </div>
            <ul>
                {FEED.map((item, i) => {
                    const meta = FEED_META[item.action];
                    return (
                        <li
                            key={i}
                            className={`flex items-start gap-3 px-5 py-3.5 ${
                                i !== FEED.length - 1
                                    ? "border-b border-line"
                                    : ""
                            }`}
                        >
                            <span
                                className={`shrink-0 mt-0.5 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${meta.badge}`}
                            >
                                {meta.icon}
                                {meta.label}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-ink truncate">
                                    {item.detail}
                                </p>
                                <p className="text-xs text-faint mt-0.5">
                                    {item.who}
                                </p>
                            </div>
                            <span className="shrink-0 text-xs text-faint font-mono">
                                {item.when}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

const STEPS = [
    {
        n: "01",
        title: "Connect Gmail",
        body: "One click, read-only to start. Signal never touches anything until you decide it should.",
    },
    {
        n: "02",
        title: "It reads before you do",
        body: "Every new message is triaged, summarized, and matched against the patterns you've approved.",
    },
    {
        n: "03",
        title: "You stay the judge",
        body: "Routine replies go out automatically. Anything uncertain waits as a draft — or gets skipped, logged, and left alone.",
    },
];

const TRUST_POINTS = [
    {
        icon: <FiLock size={16} />,
        title: "Your inbox stays yours",
        body: "Proxima reads and drafts inside your mailbox. Nothing is copied out except what it needs to do the job.",
    },
    {
        icon: <FiEye size={16} />,
        title: "Full audit trail",
        body: "Every reply, draft, and skip is logged with the reasoning behind it — searchable any time.",
    },
    {
        icon: <FiPower size={16} />,
        title: "Off is always one click",
        body: "Turn automation down to draft-only, or disconnect entirely. Nothing is permanent.",
    },
];

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
            <header className="sticky top-0 z-50 bg-paper/85 backdrop-blur-md border-b border-line">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <img
                            src="/proxima.png"
                            alt="Proxima Logo"
                            className="w-12 h-10"
                        />
                        <span className="font-display text-xl tracking-tight">
                            Proxima
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
                        <a href="#how-it-works" className="hover:text-ink transition-colors">
                            How it works
                        </a>
                        <a href="#features" className="hover:text-ink transition-colors">
                            Features
                        </a>
                        <a href="#trust" className="hover:text-ink transition-colors">
                            Trust
                        </a>
                    </nav>
                    <GoogleButton className="text-sm py-2.5 px-4" />
                </div>
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
                        Proxima reads your inbox before you do — sorting what
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

            <section id="how-it-works" className="border-t border-line scroll-mt-20">
                <div className="max-w-6xl mx-auto px-6 py-16">
                    <p className="text-xs font-mono uppercase tracking-widest text-faint mb-10">
                        How it works
                    </p>
                    <div className="grid sm:grid-cols-3 gap-10">
                        {STEPS.map((s) => (
                            <div key={s.n}>
                                <span className="font-display text-3xl text-signal/40">
                                    {s.n}
                                </span>
                                <h3 className="font-semibold mt-3 mb-1.5">
                                    {s.title}
                                </h3>
                                <p className="text-sm text-muted leading-relaxed">
                                    {s.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="features" className="border-t border-line scroll-mt-20">
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

            <section id="trust" className="border-t border-line scroll-mt-20">
                <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_1.1fr] gap-14 items-start">
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-faint mb-5">
                            Autonomy you can audit
                        </p>
                        <h2 className="font-display text-3xl sm:text-4xl leading-[1.1] mb-5">
                            It acts on your behalf.
                            <br />
                            You can see every reason why.
                        </h2>
                        <p className="text-muted leading-relaxed mb-8 max-w-md">
                            Letting an AI touch your inbox only feels safe
                            when it isn't a black box. Signal keeps a running
                            record of everything it did or chose not to do —
                            no reply, draft, or skip happens off the books.
                        </p>
                        <div className="space-y-6">
                            {TRUST_POINTS.map((t) => (
                                <div key={t.title} className="flex gap-3.5">
                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-paper-raised border border-line flex items-center justify-center text-signal">
                                        {t.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm mb-1">
                                            {t.title}
                                        </h3>
                                        <p className="text-sm text-muted leading-relaxed">
                                            {t.body}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <AutomationFeed />
                </div>
            </section>

            <footer className="border-t border-line">
                <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-xs text-faint max-w-sm">
                        Built on the Gmail API. Your messages stay in your
                        mailbox — Proxima only stores what it needs to keep
                        your inbox organized.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-faint">
                        <FiMail size={13} />
                        <span>Gmail</span>
                        <span className="mx-1">·</span>
                        <FiSliders size={13} />
                        <span>Automations</span>
                        <span className="mx-1">·</span>
                        <FiBellOff size={13} />
                        <span>Unsubscribe anytime</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}