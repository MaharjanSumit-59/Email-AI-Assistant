"""
Prompt templates used by the AI application.

Each function returns a complete prompt that is sent to Gemini.
"""


# ==========================================================
# EMAIL CLASSIFICATION
# ==========================================================

def analyze_email(email_body: str) -> str:

    return f"""
You are an AI email classification assistant.

Your task is to analyze the email and return ONLY valid JSON.

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

Allowed Actions:
- draft
- auto_send

Rules:

1. Return ONLY JSON.
2. No markdown.
3. No explanations.
4. Confidence must be between 0 and 1.

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

def summarize_email(email_body: str) -> str:

    return f"""
You are an AI email assistant.

Summarize the email.

Rules:

- Maximum 4 sentences.
- Ignore signatures.
- Ignore disclaimers.
- Mention important names.
- Mention dates.
- Mention deadlines.
- Mention requested actions.
- Keep it concise.

Email:

{email_body}
"""


# ==========================================================
# REPLY GENERATION
# ==========================================================

def generate_reply(email_body: str) -> str:

    return f"""
You are an AI email assistant.

Write a professional reply.

Rules:

- Friendly.
- Professional.
- Do not invent information.
- If information is missing, politely acknowledge the email.
- Do not include a subject line.
- End naturally.

Email:

{email_body}
"""


# ==========================================================
# TASK EXTRACTION
# ==========================================================

def extract_tasks(email_body: str) -> str:

    return f"""
You are an AI assistant specialized in extracting tasks from emails.

Analyze the email and identify every actionable task.

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
- Keep task descriptions short and clear.

Email:

{email_body}
"""