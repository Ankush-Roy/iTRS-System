import os
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)
AZURE_OPENAI_CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")


def _format_history(conversation_history: List[Dict], max_turns: int = 5) -> str:
    if not conversation_history:
        return "No prior conversation."
    trimmed = conversation_history[-max_turns:]
    return "\n".join([f"{msg.get('role', '').capitalize()}: {msg.get('content', '')}" for msg in trimmed])


def is_follow_up_question(user_question: str, conversation_history: List[Dict], llm_client) -> bool:
    if not conversation_history:
        return False

    prompt = f"""Determine if QUESTION depends on conversation context.
Follow-up indicators: pronouns (it, that, they), references (earlier, same problem)

Conversation:
{_format_history(conversation_history)}

Question: "{user_question}"

Reply ONLY: YES or NO"""

    try:
        response = llm_client.chat.completions.create(
            model=AZURE_OPENAI_CHAT_DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5,
        )
        return response.choices[0].message.content.strip().lower().startswith("yes")
    except Exception as e:
        logger.error(f"Follow-up detection error: {e}")
        return False


def rewrite_follow_up_question(user_question: str, conversation_history: List[Dict], llm_client) -> str:
    prompt = f"""Rewrite the follow-up question as standalone by adding context.
Rules: Preserve meaning, be concise, output ONLY the rewritten question.

Conversation:
{_format_history(conversation_history)}

Follow-up: "{user_question}"

Standalone Question:"""

    try:
        response = llm_client.chat.completions.create(
            model=AZURE_OPENAI_CHAT_DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        rewritten = response.choices[0].message.content.strip()
        return rewritten if rewritten and len(rewritten.split()) >= 3 else user_question
    except Exception as e:
        logger.error(f"Follow-up rewrite error: {e}")
        return user_question
