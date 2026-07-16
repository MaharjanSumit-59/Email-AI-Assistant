"""
Prompt templates used by the AI application.

Each function returns a complete prompt that is sent to Gemini.
"""


def _attachment_note(attachment_context: str = "", has_binary_attachments: bool = False) -> str:
    """
    Builds the extra instruction block appended to a prompt when the
    email has readable attachments.

    - `has_binary_attachments`: True when image/PDF attachments were
      attached directly to this request as additional Gemini content
      parts (see GeminiService.generate's `parts` argument) — the
      model can see them, it just needs to be told to.
    - `attachment_context`: extracted text from non-image/PDF
      attachments (currently .docx), inlined here since Gemini can't
      read those file types natively.
    """

    note = ""

    if has_binary_attachments:
        note += (
            "\nThis email also has one or more image or PDF "
            "attachments, provided to you directly as additional "
            "content alongside this text. Read them and factor "
            "what they show into your answer.\n"
        )

    if attachment_context:
        note += (
            "\nExtracted text from attached document(s):\n"
            f"{attachment_context}\n"
        )

    return note


# ==========================================================
# EMAIL CLASSIFICATION
# ==========================================================

def analyze_email(email_body: str) -> str:

    return f"""
You are an AI email triage assistant. Decide how this email should be
handled and return ONLY valid JSON.

Allowed Categories:
- Work
- Personal
- Finance
- Promotion
- Shopping
- Travel
- Updates
- Social
- Spam

Allowed Priorities:
- High
- Medium
- Low

Allowed Importance:
- Important
- Routine

Mark importance as "Important" if the email involves money, legal or
contractual matters, a deadline, a decision only the recipient can
make, sensitive/personal/emotional matters, or comes from a boss,
client, or someone in a position of authority. Otherwise "Routine".

Allowed Actions:
- auto_send: the email is routine small talk, a simple check-in, a
  scheduling confirmation, or a straightforward support/FAQ-style
  question that can be answered directly with common-sense
  information already in the email - nothing here requires the
  recipient's personal judgment, opinion, approval, or private
  information.
- draft: anything else. If the email asks for a decision, an
  opinion, approval or sign-off, involves money or commitments,
  shares information you cannot verify, is emotionally sensitive, is
  ambiguous, or you are simply not confident a fully automated reply
  is appropriate, choose draft. When in doubt, choose draft.

An email marked "Important" must always use action "draft", even if
it otherwise looks routine.

Examples:
- "Hey, are we still on for lunch tomorrow at 1?" -> Routine,
  auto_send (simple yes/no confirmation).
- "What are your support hours?" -> Routine, auto_send (factual,
  answerable directly).
- "Can you review the attached contract and get back to me by
  Friday?" -> Important, draft (decision + deadline).
- "I'd like a refund for my last order, it hasn't arrived." ->
  Routine priority-wise but needs a real decision about money, so
  Important, draft.
- "Following up on the internship - are we still meeting Thursday?"
  -> Routine, auto_send.

Rules:

1. Return ONLY JSON.
2. No markdown.
3. No explanations.
4. Confidence must be between 0 and 1, reflecting how sure you are
   about the action you chose.

JSON format:

{{
    "category":"",
    "priority":"",
    "importance":"",
    "confidence":0.95,
    "action":""
}}

Email:

{email_body}
"""



# ==========================================================
# EMAIL SUMMARY
# ==========================================================

def summarize_email(
    email_body: str,
    attachment_context: str = "",
    has_binary_attachments: bool = False,
) -> str:

    mentions_attachments = bool(attachment_context or has_binary_attachments)

    return f"""
You are an AI email assistant.

Summarize the email{" and its attachments" if mentions_attachments else ""}.

Rules:

- Maximum {"6" if mentions_attachments else "4"} sentences.
- Ignore signatures.
- Ignore disclaimers.
- Mention important names.
- Mention dates.
- Mention deadlines.
- Mention requested actions.
- If attachments are provided, summarize their key content too, not
  just the email text.
- Keep it concise.
{_attachment_note(attachment_context, has_binary_attachments)}
Email:

{email_body}
"""


# ==========================================================
# REPLY GENERATION
# ==========================================================

def generate_reply(
    email_body: str,
    attachment_context: str = "",
    has_binary_attachments: bool = False,
) -> str:

    return f"""
You are an AI email assistant writing a reply on the recipient's
behalf.

If the email has attachments (provided as extracted text and/or
directly as images/PDFs below), read them and use their content to
inform the reply where relevant - e.g. confirming details from a
document, or acknowledging what an image shows.

First, read the tone of the email below and match it - don't apply
one fixed style to every email:

- If it's a casual message from a friend, family member, or
  colleague (e.g. plans, a quick check-in, small talk), reply
  casually and warmly, the way a person would text or email someone
  they know. Skip stiff, corporate phrasing.
- If it's a support request, FAQ-style question, or comes from
  someone you don't know personally, reply clearly and politely in a
  helpful, professional tone.
- If it's a formal or business email (contracts, invoices,
  scheduling with a client, etc.), keep the reply professional and
  to the point.

Other rules:

- The email below may be written in any language (Japanese,
  Spanish, French, etc.). Regardless of what language it is written
  in, always write your reply in English.
- Do not invent facts, numbers, dates, or commitments that aren't in
  the email or common sense.
- If specific information is missing (e.g. exact time, a document,
  an approval), politely acknowledge the email and say it'll be
  followed up on, rather than making something up.
- Do not include a subject line.
- Do not include a greeting like "Dear X" unless the original email
  is itself formal - a first-name greeting or no greeting at all is
  fine for casual messages.
- Keep it as short as the situation allows. A one-line reply to a
  one-line question is fine.
- End naturally, without a generic sign-off like "Best regards" for
  casual messages.
{_attachment_note(attachment_context, has_binary_attachments)}
Email:

{email_body}
"""

# ==========================================================
# MEETING DETECTION
# ==========================================================

def extract_meeting(email_body: str, reference_date: str, reference_weekday: str) -> str:

    return f"""
You are an AI assistant that reads an email and decides whether it
proposes, confirms, or reschedules a meeting / call / appointment
involving the recipient, and if so, works out when it is.

Today's date is {reference_date} ({reference_weekday}). Resolve any
relative date the email uses ("tomorrow", "next Tuesday", "in two
weeks", "this afternoon") against that date, not against your own
sense of the current date.

Return ONLY valid JSON in this exact format:

{{
    "has_meeting": false,
    "title": "",
    "date": null,
    "time": null,
    "duration_minutes": 30,
    "is_time_explicit": false,
    "attendees": [],
    "confidence": 0.0
}}

Field rules:

- "has_meeting": true only if the email is actually proposing,
  confirming, or rescheduling a specific meeting/call/appointment
  the recipient would attend. Plans mentioned only in passing,
  past meetings, or vague statements like "let's catch up sometime"
  with no attempt at a date do NOT count - use false for those.
- "title": a short (under 8 words) descriptive title, e.g. "Call with
  Priya about Q3 budget". Empty string if has_meeting is false.
- "date": the resolved calendar date in YYYY-MM-DD format, using the
  reference date above to resolve relative phrasing. null if no date
  can reasonably be inferred.
- "time": 24-hour HH:MM local time if a specific time is stated or
  strongly implied (e.g. "morning" -> not explicit, skip; "3pm" ->
  "15:00"). null if no specific time is given.
- "duration_minutes": best guess at meeting length; default 30 if
  unstated.
- "is_time_explicit": true only if BOTH date and time are clearly
  and specifically stated (not vague like "sometime next week" or
  "in the afternoon").
- "attendees": array of email addresses explicitly mentioned in the
  email body as participants (not the sender/recipient headers,
  which you don't have). Usually empty - only fill this in if
  addresses appear in the email text itself.
- "confidence": 0 to 1, how confident you are that this is really a
  meeting happening at the date/time you extracted.

Rules:

1. Return ONLY JSON.
2. No markdown, no explanations.
3. If has_meeting is false, all other fields should be their default
   empty/null/false values shown above.

Email:

{email_body}
"""

# ==========================================================
# TASK EXTRACTION
# ==========================================================

def extract_tasks(
    email_body: str,
    attachment_context: str = "",
    has_binary_attachments: bool = False,
) -> str:

    return f"""
You are an AI assistant specialized in extracting tasks from emails.

Analyze the email{" and any attachments" if (attachment_context or has_binary_attachments) else ""} and identify every actionable task.

Return ONLY JSON.

Each task must follow this format:

[
    {{
        "task": "",
        "deadline": "",
        "person": ""
    }}
]

Rules:

- Return an empty list [] if there are no tasks.
- Do not explain anything.
- Do not include markdown.
- If a deadline is missing, use null.
- If a person is missing, use null.
- Extract every task separately.
- Include tasks found only in an attachment (e.g. an action list in a
  document or image), not just ones stated in the email body.
- Keep task descriptions short and clear.
{_attachment_note(attachment_context, has_binary_attachments)}
Email:

{email_body}
"""

# ==========================================================
# TRANSLATION
# ==========================================================

def translate_email(email_body: str) -> str:

    return f"""
You are a professional email translator.

Detect the language the email below is written in, then translate
the full email into natural, fluent English.

Return ONLY valid JSON in this exact format:

{{
    "detected_language": "",
    "translated_text": ""
}}

Field rules:

- "detected_language": the name of the language the email is
  written in (e.g. "Japanese", "Spanish", "French"), in English.
  If the email is already in English, use "English".
- "translated_text": the complete email translated into English,
  preserving paragraph breaks, tone, and meaning as closely as
  possible. Do not summarize, shorten, or omit any part of it.
  Do not translate names, email addresses, or URLs.
- If the email is already in English, "translated_text" should be
  the original text, unchanged.

Rules:

1. Return ONLY JSON.
2. No markdown.
3. No explanations.

Email:

{email_body}
"""