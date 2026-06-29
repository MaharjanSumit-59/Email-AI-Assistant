"""
All prompt templates used by the AI Assistant.
"""


def summarize_email(email_body: str) -> str:
    return f"""
You are an AI Email Assistant.

Summarize the following email in 3-5 concise bullet points.

Rules:
- Keep important information only.
- Mention deadlines if present.
- Mention action items if present.
- Ignore greetings and signatures.
- Keep the summary professional.

Email:

{email_body}
"""


def generate_reply(email_body: str) -> str:
    return f"""
You are an AI Email Assistant.

Generate a professional reply for the following email.

Rules:
- Be polite.
- Keep the response concise.
- Do not invent facts.
- If information is missing, acknowledge it naturally.

Email:

{email_body}
"""


def classify_email(email_body: str) -> str:
    return f"""
You are an email classifier.

Choose exactly ONE category from this list:

Work
Personal
Finance
Promotion
Shopping
Travel
Updates
Social
Spam

Return ONLY the category.

Email:

{email_body}
"""


def detect_priority(email_body: str) -> str:
    return f"""
Determine the priority of this email.

Return ONLY one of:

High
Medium
Low

High:
- urgent
- deadlines
- client issues
- meeting today

Medium:
- normal work
- follow-up
- requests

Low:
- newsletters
- promotions
- advertisements

Email:

{email_body}
"""


def extract_tasks(email_body: str) -> str:
    return f"""
Extract all actionable tasks from this email.

Return JSON in this format:

[
    {{
        "task": "...",
        "deadline": "..."
    }}
]

If no tasks exist, return:

[]

Email:

{email_body}
"""


def analyze_email(email_body: str) -> str:
    return f"""
You are an intelligent email assistant.

Analyze the email and return ONLY valid JSON.

Return exactly this format:

{{
    "category": "",
    "priority": "",
    "importance": "",
    "confidence": 0.0,
    "action": ""
}}

Rules

Category must be one of:
- Work
- Personal
- Finance
- Promotion
- Shopping
- Travel
- Updates
- Social
- Spam

Priority:
- High
- Medium
- Low

Importance:
- Important
- Routine

Action:
- draft
- auto_send

Confidence:
A decimal between 0 and 1.

Choose "draft" if:
- Human judgement is needed
- Business discussion
- Negotiation
- Meeting
- Client issue
- Complaint
- Sensitive topic
- Money involved

Choose "auto_send" if:
- Greeting
- Thank you
- Confirmation
- Receipt acknowledgement
- FAQ
- Routine support
- Status update

Return JSON only.

Email:

{email_body}
"""