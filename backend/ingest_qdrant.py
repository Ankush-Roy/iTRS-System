import os
import math
import uuid
import time
import pandas as pd
from dotenv import load_dotenv
from openai import AzureOpenAI
from qdrant_client import QdrantClient, models as rest
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings

# --- Load Environment Variables ---
load_dotenv()
warnings.filterwarnings("ignore")

# --- Configuration ---
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "ticket_data_rag")

INPUT_FILE = "ticket_clean_rag.xlsx"
BATCH_SIZE = 25
MAX_WORKERS = 4
MAX_RETRIES = 5  # Retry for transient errors
RETRY_BACKOFF = 2  # Exponential backoff factor in seconds

# --- Initialize Azure OpenAI Client ---
print("🟢 Initializing Azure OpenAI client...")
try:
    openai_client = AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
    )
    openai_client.models.list()
    print("✅ Azure OpenAI client initialized successfully.")
except Exception as e:
    print(f"❌ Failed to initialize Azure OpenAI client: {e}")
    exit()

# --- Initialize Qdrant Cloud Client ---
print("\n🟢 Initializing Qdrant Cloud client...")
try:
    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        prefer_grpc=False,
        timeout=120
    )
    qdrant.get_collections()
    print(f"✅ Connected to Qdrant Cloud at {QDRANT_URL}")
except Exception as e:
    print(f"❌ Failed to connect to Qdrant Cloud: {e}")
    exit()

# --- Load and Prepare Data ---
print(f"\n📚 Reading data from '{INPUT_FILE}'...")
try:
    df = pd.read_excel(INPUT_FILE)
    df.columns = df.columns.str.strip()
except FileNotFoundError:
    print(f"❌ Error: The file '{INPUT_FILE}' was not found.")
    exit()

def is_valid_text(text) -> bool:
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return False
    return str(text).strip().lower() not in ["", "nan", "null", "none"]

comments_to_embed = []
for i, row in df.iterrows():
    problem = str(row.get("problem_text", "")).strip()
    resolution = str(row.get("resolution_text", "")).strip()
    text_for_embedding = problem if is_valid_text(problem) else resolution if is_valid_text(resolution) else None
    if not text_for_embedding:
        continue

    tid = str(row.get("TicketID", "")).strip()
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, tid)) if tid else str(uuid.uuid4())

    comments_to_embed.append({
        "id": point_id,
        "embedding_text": text_for_embedding,
        "payload": {
            "ticket_id": tid,
            "problem_text": problem,
            "resolution_text": resolution,
            "language": str(row.get("language", "")),
            "category": str(row.get("category", "")),
        }
    })

print(f"✅ Prepared {len(comments_to_embed)} valid records for embedding.")
if not comments_to_embed:
    print("⚠️ No valid records to ingest. Exiting.")
    exit()

# --- Setup Qdrant Collection ---
print("\n🛠️ Setting up Qdrant collection...")
try:
    test_embedding = openai_client.embeddings.create(
        model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        input="test"
    ).data[0].embedding
    dim = len(test_embedding)

    existing_collections = qdrant.get_collections()
    collection_names = [c.name for c in existing_collections.collections]

    if COLLECTION_NAME in collection_names:
        print(f"- Collection '{COLLECTION_NAME}' already exists. Deleting...")
        qdrant.delete_collection(COLLECTION_NAME)

    print(f"- Creating new collection '{COLLECTION_NAME}'...")
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=rest.VectorParams(size=dim, distance=rest.Distance.COSINE),
    )
    print(f"✅ Created collection '{COLLECTION_NAME}' with vector size {dim}.")
except Exception as e:
    print(f"❌ Failed to set up Qdrant collection: {e}")
    exit()

# --- Helper function for safe embedding with retries ---
def embed_text_with_retry(texts):
    for attempt in range(MAX_RETRIES):
        try:
            response = openai_client.embeddings.create(
                model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
                input=texts
            )
            return [d.embedding for d in response.data]
        except Exception as e:
            wait_time = RETRY_BACKOFF ** attempt
            print(f"⚠️ Embedding failed (attempt {attempt+1}/{MAX_RETRIES}). Retrying in {wait_time}s...")
            time.sleep(wait_time)
    print("❌ Max retries reached. Skipping this batch.")
    return [ [0.0]*dim for _ in texts ]  # fallback dummy vector

# --- Embed and Upsert Data ---
print(f"\n⚡ Starting ingestion ({MAX_WORKERS} workers, batch size={BATCH_SIZE})...")
total_batches = (len(comments_to_embed) + BATCH_SIZE - 1) // BATCH_SIZE

for start_index in range(0, len(comments_to_embed), BATCH_SIZE):
    batch_num = start_index // BATCH_SIZE + 1
    batch = comments_to_embed[start_index:start_index+BATCH_SIZE]

    embeddings = embed_text_with_retry([c["embedding_text"] for c in batch])
    points = [rest.PointStruct(id=item["id"], vector=embeddings[i], payload=item["payload"]) for i, item in enumerate(batch)]

    for attempt in range(MAX_RETRIES):
        try:
            qdrant.upsert(COLLECTION_NAME, points=points, wait=True)
            print(f"- Upserted batch {batch_num}/{total_batches}")
            break
        except Exception as e:
            wait_time = RETRY_BACKOFF ** attempt
            print(f"⚠️ Upsert failed (attempt {attempt+1}/{MAX_RETRIES}). Retrying in {wait_time}s...")
            time.sleep(wait_time)
    else:
        print(f"❌ Max retries reached for batch {batch_num}. Skipping.")

print("\n🎉 All comments ingested successfully (with automatic retry on failures)!")
