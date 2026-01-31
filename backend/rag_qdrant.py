import os
import html
import tiktoken
import logging
from dotenv import load_dotenv
from openai import AzureOpenAI
from qdrant_client import QdrantClient

load_dotenv()
logger = logging.getLogger(__name__)

AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "ticket_data_rag")

try:
    openai_client = AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
    )
    try:
        TOKENIZER = tiktoken.encoding_for_model("gpt-4")
    except KeyError:
        TOKENIZER = tiktoken.get_encoding("cl100k_base")
except Exception as e:
    openai_client = None
    TOKENIZER = None
    logger.error(f"Azure OpenAI init error: {e}")

try:
    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        prefer_grpc=False,
        timeout=60
    )
    qdrant.get_collection(collection_name=COLLECTION_NAME)
except Exception as e:
    qdrant = None
    logger.error(f"Qdrant init error: {e}")

MIN_QUERY_WORDS = 3
SIMILARITY_THRESHOLD = 0.70
MAX_CONTEXT_TOKENS = 4000
MAX_SOLUTIONS_FOR_SYNTHESIS = 5
MAX_SOLUTIONS_TO_DISPLAY = 3
MIN_SOLUTION_TEXT_LENGTH = 20

def count_tokens(text: str) -> int:
    if TOKENIZER is None:
        return len(text.split())
    return len(TOKENIZER.encode(text))

def embed_text(text: str):
    if not text or openai_client is None:
        return []
    try:
        response = openai_client.embeddings.create(
            model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return []

def get_unique_and_filtered_solutions(results, min_chars=MIN_SOLUTION_TEXT_LENGTH):
    unique_solutions_map = {}
    for r in results:
        text = r.payload.get("resolution_text") or r.payload.get("problem_text") or ""
        text = html.unescape(text).strip()

        if not text or len(text) < min_chars:
            continue

        normalized_text = " ".join(text.lower().split())

        if normalized_text not in unique_solutions_map:
            unique_solutions_map[normalized_text] = {
                "text": text,
                "source_id": r.payload.get("ticket_id", "N/A"),
                "score": r.score
            }
    
    return sorted(unique_solutions_map.values(), key=lambda x: x["score"], reverse=True)

def rag_pipeline(query: str, conversation_history=None):
    if not query:
        return "Please provide a query to search for solutions.", []

    if openai_client is None or qdrant is None:
        return "System not fully initialized. Please check environment variables.", []

    if len(query.split()) < MIN_QUERY_WORDS:
        return "Your query is too short. Please provide more details for accurate suggestions.", []

    search_query = query
    if conversation_history and len(conversation_history) > 0:
        user_messages = [msg.get("content", "") for msg in conversation_history if msg.get("role") == "user"]
        if len(user_messages) > 1:
            recent_context = " ".join(user_messages[-3:])[:1000]
            if recent_context:
                search_query = recent_context
    
    query_vector = embed_text(search_query)
    if not query_vector:
        return "Could not generate embeddings for the query. Please try again.", []

    try:
        response = qdrant.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=MAX_SOLUTIONS_FOR_SYNTHESIS * 3,
            with_payload=True,
            score_threshold=SIMILARITY_THRESHOLD,
        )
        results = response.points
    except Exception as e:
        logger.error(f"Qdrant query error: {e}")
        return "An error occurred while searching for solutions. Please try again.", []

    retrieved_solutions_data = get_unique_and_filtered_solutions(results)

    if not retrieved_solutions_data:
        return "I don't have any relevant solutions for this query. Please try a different query or raise a new ticket.", []

    selected_solutions = retrieved_solutions_data[:MAX_SOLUTIONS_FOR_SYNTHESIS]

    combined_context = ""
    source_info_list = []
    current_token_count = 0

    for i, sol_data in enumerate(selected_solutions):
        solution_text = sol_data["text"]
        estimated_tokens = count_tokens(solution_text)

        if current_token_count + estimated_tokens + count_tokens(query) + 500 > MAX_CONTEXT_TOKENS:
            break

        combined_context += f"<solution_{i+1}>\n{solution_text}\n</solution_{i+1}>\n\n"
        source_info_list.append({"number": i+1, "ticket_id": sol_data["source_id"], "score": sol_data["score"]})
        current_token_count += estimated_tokens

    final_sources = source_info_list[:MAX_SOLUTIONS_TO_DISPLAY]

    if not combined_context:
        return "I found some potential matches, but they were not suitable. Please try a different query.", []

    system_prompt = (
        "You are an expert support assistant. "
        "Refine the provided solution(s) into a clear, professional response. "
        "Explain what should be done in simple terms. "
        "Do not invent information or add external knowledge. "
        "If multiple solutions are given, present them as separate numbered options. "
        "Do not include any signature, contact information, or closing formalities. "
        "Provide only the technical solution and helpful guidance. "
        "When responding to follow-up questions, reference and build upon the conversation context."
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    if conversation_history:
        for msg in conversation_history[-6:]:
            messages.append({"role": msg.get("role"), "content": msg.get("content")})
    
    user_prompt = f"User Query: {query}\n\nAvailable Solutions:\n{combined_context}\n\nPlease provide a helpful response."
    messages.append({"role": "user", "content": user_prompt})

    try:
        completion = openai_client.chat.completions.create(
            model=AZURE_OPENAI_CHAT_DEPLOYMENT,
            messages=messages,
            temperature=0.3,
            max_tokens=800
        )
        return completion.choices[0].message.content.strip(), final_sources
    except Exception as e:
        logger.error(f"LLM completion error: {e}")
        return "An error occurred while generating the answer. Please try again.", []
