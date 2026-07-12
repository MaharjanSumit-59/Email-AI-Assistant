import api from "../api/interceptors";

export const getInbox = async (folder = "inbox") => {
    const response = await api.get("/emails/", {
        params: { folder },
    });
    return response.data;
};

export const getEmail = async (messageId) => {
    const response = await api.get(`/emails/${messageId}/`);
    return response.data;
};

export const searchEmails = async (query) => {
    const response = await api.post("/emails/search/", {
        query,
    });

    return response.data;
};

export const getContactSuggestions = async () => {
    const response = await api.get("/emails/contacts/");
    return response.data;
};

// `payload` can be a plain object (no attachments) or a FormData
// instance (when attachments are present) — FormData needs its own
// multipart Content-Type so the boundary axios generates isn't
// clobbered by the instance's default "application/json" header.
const isFormData = (payload) =>
    typeof FormData !== "undefined" && payload instanceof FormData;

export const sendEmail = async (payload) => {
    const config = isFormData(payload)
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined;

    const response = await api.post("/emails/send/", payload, config);
    return response.data;
};

export const replyEmail = async (payload) => {
    const config = isFormData(payload)
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined;

    const response = await api.post("/emails/reply/", payload, config);
    return response.data;
};

// Builds the FormData body for send/reply when the user has attached
// files. `fields` holds plain string fields (to, subject, body,
// thread_id, ...) and `files` is an array of File objects.
export const buildEmailFormData = (fields, files = []) => {
    const formData = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value);
        }
    });

    files.forEach((file) => {
        formData.append("attachments", file);
    });

    return formData;
};

export const getAttachmentDownloadUrl = (messageId, attachmentId) =>
    `/emails/${messageId}/attachments/${attachmentId}/`;

// Fetches an attachment as a blob and triggers a browser download,
// since the endpoint requires the same auth header everything else
// in this app uses (so a plain <a href> can't hit it directly).
export const downloadAttachment = async (messageId, attachmentId, filename) => {
    const response = await api.get(
        getAttachmentDownloadUrl(messageId, attachmentId),
        { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename || "attachment");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const starEmail = async (messageId) => {
    const response = await api.post("/emails/star/", {
        message_id: messageId,
    });

    return response.data;
};

export const unstarEmail = async (messageId) => {
    const response = await api.post("/emails/unstar/", {
        message_id: messageId,
    });

    return response.data;
};

export const deleteEmail = async (messageId) => {
    const response = await api.post("/emails/delete/", {
        message_id: messageId,
    });

    return response.data;
};

export const getTrash = async () => {
    const response = await api.get("/emails/trash/");
    return response.data;
};

export const restoreEmail = async (messageId) => {
    const response = await api.post("/emails/restore/", {
        message_id: messageId,
    });

    return response.data;
};

export const permanentlyDeleteEmail = async (messageId) => {
    const response = await api.post("/emails/permanent-delete/", {
        message_id: messageId,
    });

    return response.data;
};

export const emptyTrash = async () => {
    const response = await api.post("/emails/trash/empty/");
    return response.data;
};