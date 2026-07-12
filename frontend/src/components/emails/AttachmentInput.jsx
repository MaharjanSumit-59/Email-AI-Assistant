import { useRef } from "react";
import toast from "react-hot-toast";
import { FiPaperclip, FiX, FiFile, FiImage, FiFileText } from "react-icons/fi";

import {
    formatFileSize,
    isImageType,
    isPdfType,
    isDocType,
    ACCEPTED_ATTACHMENT_TYPES,
    MAX_ATTACHMENTS_TOTAL_BYTES,
} from "../../utils/attachments";

function AttachmentIcon({ mimeType }) {
    if (isImageType(mimeType)) return <FiImage size={14} />;
    if (isPdfType(mimeType) || isDocType(mimeType)) return <FiFileText size={14} />;
    return <FiFile size={14} />;
}

/**
 * Small file-attach control: a paperclip button that opens the native
 * file picker, plus a chip list of what's currently attached with a
 * remove button on each. Enforces the same total-size cap the backend
 * enforces, so bad uploads get caught before the network round trip.
 */
export default function AttachmentInput({ files, onChange, disabled }) {
    const inputRef = useRef(null);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const handlePick = () => inputRef.current?.click();

    const handleFilesSelected = (e) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = ""; // allow re-picking the same file later

        if (picked.length === 0) return;

        const combined = [...files, ...picked];

        const dedupedByKey = new Map();
        combined.forEach((f) => {
            dedupedByKey.set(`${f.name}-${f.size}-${f.lastModified}`, f);
        });
        const deduped = Array.from(dedupedByKey.values());

        const newTotal = deduped.reduce((sum, f) => sum + f.size, 0);

        if (newTotal > MAX_ATTACHMENTS_TOTAL_BYTES) {
            toast.error("Attachments are too large — keep the total under 18MB.");
            return;
        }

        onChange(deduped);
    };

    const handleRemove = (indexToRemove) => {
        onChange(files.filter((_, i) => i !== indexToRemove));
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_TYPES}
                onChange={handleFilesSelected}
                className="hidden"
            />

            <button
                type="button"
                onClick={handlePick}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors disabled:opacity-40"
            >
                <FiPaperclip size={14} />
                Attach files
            </button>

            {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((file, index) => (
                        <span
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full pl-2.5 pr-1.5 py-1 text-xs text-ink max-w-full"
                        >
                            <AttachmentIcon mimeType={file.type} />
                            <span className="truncate max-w-[160px]">
                                {file.name}
                            </span>
                            <span className="text-faint shrink-0">
                                {formatFileSize(file.size)}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                disabled={disabled}
                                aria-label={`Remove ${file.name}`}
                                className="text-faint hover:text-ember shrink-0"
                            >
                                <FiX size={12} />
                            </button>
                        </span>
                    ))}

                    <span className="text-[11px] text-faint self-center">
                        {formatFileSize(totalSize)} total
                    </span>
                </div>
            )}
        </div>
    );
}
