# ITR Support System - Project Documentation

## Overview

This is an **Intelligent Ticket Resolution (ITR) System** that uses **RAG (Retrieval-Augmented Generation)** technology to provide automated support responses. The system consists of a Next.js frontend and a FastAPI backend, leveraging Azure OpenAI and Qdrant vector database for intelligent query processing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Login Page  │  │  Admin Panel │  │  User Ticket Page        │   │
│  │              │  │  (Dashboard) │  │  (ChatWidget)            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                              │                                       │
│                    ┌─────────┴─────────┐                            │
│                    │   API Services    │                            │
│                    │  (chatApi, api)   │                            │
│                    └─────────┬─────────┘                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────┼──────────────────────────────────────┐
│                           BACKEND (FastAPI)                          │
│                    ┌─────────┴─────────┐                            │
│                    │     main.py       │                            │
│                    │   (API Routes)    │                            │
│                    └─────────┬─────────┘                            │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│  ┌──────┴──────┐    ┌───────┴───────┐    ┌──────┴──────┐          │
│  │ rag_qdrant  │    │ followup_utils│    │  database   │          │
│  │  (RAG)      │    │  (Follow-up)  │    │  (SQLite)   │          │
│  └──────┬──────┘    └───────────────┘    └─────────────┘          │
│         │                                                           │
│    ┌────┴────────────────────┐                                     │
│    │                         │                                     │
│  ┌─┴───────────┐    ┌───────┴─────────┐                           │
│  │   Qdrant    │    │  Azure OpenAI   │                           │
│  │  (Vectors)  │    │  (LLM + Embed)  │                           │
│  └─────────────┘    └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Access

| Role | Username | Password | Access |
|------|----------|----------|--------|
| User | `user` | `user123` | Chatbot, Ticket escalation, View own tickets |
| Admin | `admin` | `admin123` | Dashboard, Admin panel, Resolve tickets, Statistics |

---

## Flow Diagrams

### 1. User Chat Flow (Chatbot Interaction)

```
User types query
       │
       ▼
┌──────────────────┐
│  ChatWidget.jsx  │ (Frontend)
│  handleSendMessage
└────────┬─────────┘
         │ Build conversation history
         ▼
┌──────────────────┐
│  chatApi.search  │
│  (POST /search)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│     main.py          │
│  search_tickets()    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  is_follow_up?       │ (followup_utils.py)
│  Detect if follow-up │
└────────┬─────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         │
┌───────────┐ │
│ Rewrite   │ │
│ Query     │ │
└─────┬─────┘ │
      │       │
      └───┬───┘
          │
          ▼
┌──────────────────────┐
│   rag_pipeline()     │ (rag_qdrant.py)
│   1. Embed query     │
│   2. Search Qdrant   │
│   3. Filter results  │
│   4. Synthesize LLM  │
└────────┬─────────────┘
         │
         ▼
   Return AI Answer
   to User
```

### 2. Ticket Escalation Flow

```
User clicks "Escalate"
       │
       ▼
┌──────────────────────┐
│  ChatWidget.jsx      │
│  handleEscalate()    │
└────────┬─────────────┘
         │ Prompt for feedback
         ▼
User provides feedback
         │
         ▼
┌──────────────────────┐
│ chatApi.escalateTicket
│ (POST /escalate)     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│     main.py          │
│  escalate_ticket()   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  database.py         │
│  save_ticket()       │
│  (SQLite storage)    │
└────────┬─────────────┘
         │
         ▼
   Ticket Created
   (ESC-XXXXXX)
```

### 3. Admin Resolution Flow

```
Admin views Dashboard
       │
       ▼
┌──────────────────────┐
│  admin/page.jsx      │
│  loadEscalatedTickets│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ GET /admin/tickets   │
└────────┬─────────────┘
         │
         ▼
Admin selects ticket
& provides solution
         │
         ▼
┌──────────────────────┐
│ POST /admin/resolve  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  database.py         │
│  update_ticket()     │
│  Status → resolved   │
└──────────────────────┘
```

---

## Backend Functions Reference

### main.py (API Endpoints)

| Function | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| `root()` | `/` | GET | Returns API information and status |
| `health_check()` | `/health` | GET | Checks Qdrant and OpenAI connectivity |
| `search_tickets()` | `/search` | POST | Main RAG search endpoint - processes user queries with conversation context |
| `escalate_ticket()` | `/escalate` | POST | Creates a new escalated ticket from unsatisfied user |
| `get_escalated_tickets()` | `/admin/tickets` | GET | Retrieves all escalated tickets (optional status filter) |
| `resolve_escalated_ticket()` | `/admin/resolve` | POST | Admin resolves a ticket with solution |
| `add_comment_to_ticket()` | `/tickets/comment` | POST | Adds a comment to an existing ticket |
| `get_ticket_details()` | `/tickets/{ticket_id}` | GET | Gets full ticket details including history |
| `get_admin_stats()` | `/admin/stats` | GET | Returns dashboard statistics |

### rag_qdrant.py (RAG Pipeline)

| Function | Description |
|----------|-------------|
| `embed_text(text)` | Generates vector embeddings using Azure OpenAI embedding model |
| `count_tokens(text)` | Counts tokens using tiktoken for context management |
| `get_unique_and_filtered_solutions(results)` | Deduplicates and filters Qdrant search results, prioritizes resolution_text over problem_text |
| `rag_pipeline(query, conversation_history)` | **Main function** - Orchestrates the full RAG process: query embedding → Qdrant search → result filtering → LLM synthesis |

### followup_utils.py (Conversation Context)

| Function | Description |
|----------|-------------|
| `_format_history(conversation_history, max_turns)` | Formats conversation history into readable text for LLM prompts |
| `is_follow_up_question(user_question, conversation_history, llm_client)` | Uses LLM to detect if user's question depends on previous context (returns True/False) |
| `rewrite_follow_up_question(user_question, conversation_history, llm_client)` | Rewrites a follow-up question into a standalone question by incorporating context |

### database.py (SQLite Database)

| Function | Description |
|----------|-------------|
| `init_database()` | Creates tickets and related tables if not exist |
| `get_next_ticket_id()` | Atomically generates next ticket ID (ESC-XXXXXX format) |
| `get_next_comment_id()` | Atomically generates next comment ID |
| `sync_counters_with_data()` | Syncs ID counters with existing data on startup |
| `save_ticket(ticket_data)` | Saves a new escalated ticket to database |
| `get_ticket(ticket_id)` | Retrieves a single ticket with all its data |
| `get_tickets()` | Retrieves all tickets |
| `update_ticket(ticket_id, updates)` | Updates ticket fields (status, resolution, etc.) |
| `add_comment(ticket_id, comment_data)` | Adds a comment to a ticket |
| `get_analytics()` | Returns statistics for admin dashboard |

### ingest_qdrant.py (Data Ingestion)

| Function | Description |
|----------|-------------|
| `is_valid_text(text)` | Validates if text is non-empty and meaningful |
| `get_embedding(text)` | Generates embedding for a text chunk |
| `upsert_batch(batch)` | Upserts a batch of vectors to Qdrant collection |

---

## Frontend Components Reference

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| `ChatWidget` | `components/Chatbot/ChatWidget.jsx` | Main chatbot UI with message handling, escalation flow, and conversation state |
| `ChatMessage` | `components/Chatbot/ChatMessage.jsx` | Renders individual chat messages with markdown formatting support |
| `AuthProvider` | `context/AuthContext.jsx` | Manages authentication state, login/logout, and role-based routing |
| `AdminPanel` | `app/admin/page.jsx` | Admin interface for viewing and resolving escalated tickets |

### API Services

| Service | File | Functions |
|---------|------|-----------|
| `chatApi` | `lib/chatApi.js` | `health()`, `search()`, `escalateTicket()`, `getEscalatedTickets()`, `resolveTicket()` |
| `apiService` | `lib/api.js` | `searchTickets()`, `healthCheck()`, `getAdminStats()`, `escalateTicket()`, `resolveEscalatedTicket()` |

---

## Chatbot Working Details

### 1. Query Processing Pipeline

When a user sends a message:

1. **Frontend (ChatWidget.jsx)**
   - Captures user input
   - Builds conversation history array with all previous messages
   - Calls `chatApi.search()` with query and history

2. **Backend (main.py - `/search`)**
   - Receives query and conversation history
   - Calls `is_follow_up_question()` to detect context dependency
   - If follow-up: rewrites query using `rewrite_follow_up_question()`
   - Passes final query to `rag_pipeline()`

3. **RAG Pipeline (rag_qdrant.py)**
   - Embeds query using Azure OpenAI embedding model
   - Searches Qdrant vector database for similar tickets
   - Filters and deduplicates results
   - Synthesizes final answer using Azure OpenAI GPT model

### 2. Follow-up Question Detection

The system intelligently detects follow-up questions by looking for:
- Pronouns: "it", "that", "those", "they", "this issue"
- References: "earlier", "above", "same problem", "why does it happen"
- Incomplete meaning without prior context

**Example:**
```
User: "My car won't start"
Bot: [Provides battery/starter troubleshooting]
User: "What if that doesn't work?"  ← Detected as follow-up
      ↓
Rewritten: "What if battery and starter troubleshooting doesn't fix the car not starting?"
```

### 3. Escalation Flow

When AI response is unsatisfactory:

1. User clicks "Not Helpful" button
2. System prompts for detailed feedback
3. User describes their specific issue
4. Ticket is created with:
   - Original query
   - AI's response
   - User's feedback
   - Full conversation history
5. Admin can view and resolve the ticket

---

## Database Schema

### tickets Table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key (ESC-XXXXXX) |
| user_query | TEXT | Original user question |
| ai_answer | TEXT | AI's response |
| user_feedback | TEXT | Why user was unsatisfied |
| status | TEXT | pending/resolved |
| submitted_at | TEXT | Timestamp |
| resolved_at | TEXT | Resolution timestamp |
| resolved_by | TEXT | user/admin |
| admin_solution | TEXT | Admin's solution |
| conversation_history | TEXT | JSON of full chat |

---

## Environment Variables

### Backend (.env)
```
AZURE_OPENAI_KEY=<your-key>
AZURE_OPENAI_ENDPOINT=<your-endpoint>
AZURE_OPENAI_API_VERSION=<api-version>
AZURE_OPENAI_CHAT_DEPLOYMENT=<chat-model-deployment>
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=<embedding-model-deployment>
QDRANT_URL=<qdrant-cloud-url>
QDRANT_API_KEY=<qdrant-api-key>
QDRANT_COLLECTION=ticket_data_rag
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Key Configuration Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `MIN_QUERY_WORDS` | 3 | rag_qdrant.py | Minimum words for valid query |
| `SIMILARITY_THRESHOLD` | 0.70 | rag_qdrant.py | Minimum similarity score for results |
| `MAX_CONTEXT_TOKENS` | 4000 | rag_qdrant.py | Max tokens for LLM context |
| `MAX_SOLUTIONS_FOR_SYNTHESIS` | 5 | rag_qdrant.py | Max documents to retrieve |
| `MAX_SOLUTIONS_TO_DISPLAY` | 3 | rag_qdrant.py | Max solutions in final answer |

---

## Running the Application

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Data Ingestion
```bash
cd backend
python ingest_qdrant.py
# Ingests ticket data from ticket_clean_rag.xlsx to Qdrant
```

---

## API Response Examples

### Search Response
```json
{
  "answer": "Based on your issue, here are the recommended steps...",
  "sources": [
    {"ticket_id": "TKT-001", "score": 0.85},
    {"ticket_id": "TKT-002", "score": 0.78}
  ],
  "query": "car won't start",
  "rewritten_query": null,
  "total_sources": 2,
  "conversation_id": "uuid-string"
}
```

### Escalation Response
```json
{
  "message": "Ticket escalated successfully",
  "ticket_id": "ESC-001001",
  "status": "pending_admin_review"
}
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | SQLite (tickets), Qdrant Cloud (vectors) |
| AI/ML | Azure OpenAI (GPT-4 + Embeddings) |
| Vector Search | Qdrant |
