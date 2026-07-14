// Shared helpers for anything attachment-related: formatting sizes,
// and figuring out what "kind" of file something is for icon choice.

export function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null || Number.isNaN(bytes)) {
        return "";
    }

    if (bytes < 1024) return `${bytes} B`;

    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function isImageType(mimeType = "") {
    return mimeType.startsWith("image/");
}

export function isPdfType(mimeType = "") {
    return mimeType === "application/pdf";
}

export function isDocType(mimeType = "") {
    return (
        mimeType === "application/msword" ||
        mimeType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
}

// Files the compose window will let a user pick, mirrored on the
// backend's ALLOWED_ATTACHMENT_CONTENT_TYPES allowlist.
export const ACCEPTED_ATTACHMENT_TYPES =
    "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip";

export const MAX_ATTACHMENTS_TOTAL_BYTES = 18 * 1024 * 1024;
