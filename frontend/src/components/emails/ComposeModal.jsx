import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiSend } from "react-icons/fi";

import {
    sendEmail,
    getContactSuggestions,
    buildEmailFormData,
} from "../../services/emailService";
import AttachmentInput from "./AttachmentInput";

export default function ComposeModal({ onClose, onSent }) {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);

    const [contacts, setContacts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const blurTimeoutRef = useRef(null);

    useEffect(() => {
        // Best-effort — if this fails, Compose still works fine without
        // suggestions, so no error toast needed here.
        getContactSuggestions()
            .then(setContacts)
            .catch((err) => console.error(err));

        return () => clearTimeout(blurTimeoutRef.current);
    }, []);

    const filteredContacts = (() => {
        const query = to.trim().toLowerCase();

        if (!query) return contacts.slice(0, 6);

        return contacts
            .filter(
                (c) =>
                    c.email.toLowerCase().includes(query) ||
                    (c.name && c.name.toLowerCase().includes(query))
            )
            .slice(0, 6);
    })();

    const handleSelectContact = (contact) => {
        setTo(contact.email);
        setShowSuggestions(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (!to.trim() || !body.trim()) {
            toast.error("Add a recipient and a message before sending.");
            return;
        }

        setSending(true);

        try {
            const fields = {
                to: to.trim(),
                subject: subject.trim(),
                body: body.trim(),
            };

            const payload =
                attachments.length > 0
                    ? buildEmailFormData(fields, attachments)
                    : fields;

            await sendEmail(payload);

            toast.success("Email sent");
            onSent?.();
            onClose();
        } catch (err) {
            console.error(err);
            const detail =
                err?.response?.data?.to?.[0] ||
                err?.response?.data?.detail ||
                "Couldn't send that email. Check the address and try again.";
            toast.error(detail);
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-6"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-raised border border-line rounded-xl w-full max-w-lg max-h-full flex flex-col shadow-xl"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
                    <h2 className="font-display text-lg">New message</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close compose"
                        className="text-faint hover:text-ink"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSend} className="flex flex-col min-h-0">
                    <div className="px-5 py-4 space-y-3 overflow-y-auto">
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={to}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => {
                                    // Delay so a click on a suggestion
                                    // registers before the list unmounts.
                                    blurTimeoutRef.current = setTimeout(
                                        () => setShowSuggestions(false),
                                        150
                                    );
                                }}
                                placeholder="To"
                                autoComplete="off"
                                className="w-full outline-none bg-transparent border-b border-line pb-2 text-sm focus:border-signal transition-colors"
                            />

                            {showSuggestions && filteredContacts.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-paper-raised border border-line rounded-lg shadow-lg z-10 overflow-hidden">
                                    {filteredContacts.map((contact) => (
                                        <button
                                            type="button"
                                            key={contact.email}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleSelectContact(contact)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-paper transition-colors flex flex-col"
                                        >
                                            {contact.name && (
                                                <span className="font-medium text-ink truncate">
                                                    {contact.name}
                                                </span>
                                            )}
                                            <span className="text-faint text-xs truncate">
                                                {contact.email}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full outline-none bg-transparent border-b border-line pb-2 text-sm focus:border-signal transition-colors"
                        />

                        <textarea
                            required
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your message..."
                            rows={8}
                            className="w-full outline-none bg-transparent text-sm resize-none"
                        />

                        <AttachmentInput
                            files={attachments}
                            onChange={setAttachments}
                            disabled={sending}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-ink transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={sending}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-medium hover:bg-ink disabled:opacity-40 transition-colors"
                        >
                            <FiSend size={14} />
                            {sending ? "Sending..." : "Send"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}