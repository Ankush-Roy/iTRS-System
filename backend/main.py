from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn
from datetime import datetime
import logging
import os
import uuid

from rag_qdrant import rag_pipeline, qdrant, openai_client, COLLECTION_NAME
from database import TicketDatabase
from followup_utils import is_follow_up_question, rewrite_follow_up_question

db = TicketDatabase()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ITR Support System API",
    description="Intelligent Ticket Resolution System with RAG",
    version="2.0.0"
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageHistory(BaseModel):
    role: str
    content: str

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    similarity_threshold: Optional[float] = 0.7
    conversation_history: Optional[List[MessageHistory]] = Field(default_factory=list)
    conversation_id: Optional[str] = None

class TicketInfo(BaseModel):
    ticket_id: str
    score: float

class SearchResponse(BaseModel):
    answer: str
    sources: List[TicketInfo] = Field(default_factory=list)
    query: str
    rewritten_query: Optional[str] = None
    total_sources: int = 0
    conversation_id: Optional[str] = None

class EscalationRequest(BaseModel):
    user_query: str
    ai_answer: str
    user_feedback: str
    conversation_history: Optional[List[MessageHistory]] = Field(default_factory=list)

class Comment(BaseModel):
    id: str
    author: str
    author_name: str
    content: str
    timestamp: str
    type: str = "comment"

class EscalatedTicket(BaseModel):
    id: str
    user_query: str
    ai_answer: str
    user_feedback: str
    status: str = "pending"
    submitted_at: str
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    admin_solution: Optional[str] = None
    comments: List[Comment] = Field(default_factory=list)
    conversation_history: Optional[List[dict]] = Field(default_factory=list)

class AdminResponse(BaseModel):
    ticket_id: str
    solution: str

class AddCommentRequest(BaseModel):
    ticket_id: str
    content: str
    author: str
    author_name: str
    is_resolution: bool = False

@app.on_event("startup")
async def startup_event():
    if qdrant is None:
        logger.error("Qdrant client not initialized")
        raise Exception("Qdrant connection failed")
    
    if openai_client is None:
        logger.error("Azure OpenAI client not initialized")
        raise Exception("Azure OpenAI connection failed")
    
    try:
        qdrant.get_collection(collection_name=COLLECTION_NAME)
        logger.info(f"Connected to Qdrant collection: {COLLECTION_NAME}")
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        raise e
    
    db.init_database()
    db.sync_counters_with_data()
    logger.info("Database initialized")

@app.get("/")
async def root():
    return {
        "message": "ITR Support System API",
        "version": "2.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    try:
        qdrant.get_collection(collection_name=COLLECTION_NAME)
        qdrant_status = "connected"
    except Exception:
        qdrant_status = "disconnected"
    
    openai_status = "connected" if openai_client else "disconnected"
    is_healthy = qdrant_status == "connected" and openai_status == "connected"
    
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "qdrant": qdrant_status,
            "azure_openai": openai_status
        }
    }

@app.post("/search", response_model=SearchResponse)
async def search_tickets(request: SearchRequest):
    try:
        logger.info(f"Processing search: {request.query[:50]}...")
        
        conversation_msgs = None
        if request.conversation_history:
            conversation_msgs = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        final_query = request.query
        
        is_followup = is_follow_up_question(
            user_question=request.query,
            conversation_history=conversation_msgs or [],
            llm_client=openai_client
        )

        if is_followup:
            rewritten_query = rewrite_follow_up_question(
                user_question=request.query,
                conversation_history=conversation_msgs or [],
                llm_client=openai_client
            )
            logger.info(f"[FOLLOW-UP] Rewritten: {rewritten_query}")
            final_query = rewritten_query

        answer, sources = rag_pipeline(final_query, conversation_history=conversation_msgs)
        
        ticket_sources = []
        if sources:
            for source in sources:
                ticket_sources.append(TicketInfo(
                    ticket_id=str(source.get('ticket_id', 'N/A')),
                    score=float(source.get('score', 0.0))
                ))
        
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        return SearchResponse(
            answer=answer,
            sources=ticket_sources,
            query=request.query,
            rewritten_query=final_query if final_query != request.query else None,
            total_sources=len(ticket_sources),
            conversation_id=conversation_id
        )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/escalate", response_model=dict)
async def escalate_ticket(request: EscalationRequest):
    try:
        ticket_id = db.get_next_ticket_id()
        
        conversation_history = []
        if request.conversation_history:
            conversation_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]
        
        escalated_ticket = EscalatedTicket(
            id=ticket_id,
            user_query=request.user_query,
            ai_answer=request.ai_answer,
            user_feedback=request.user_feedback,
            submitted_at=datetime.now().isoformat(),
            conversation_history=conversation_history
        )
        
        db.save_ticket(escalated_ticket.model_dump())
        logger.info(f"Ticket escalated: {ticket_id}")
        
        return {
            "message": "Ticket escalated successfully",
            "ticket_id": ticket_id,
            "status": "pending_admin_review"
        }
        
    except Exception as e:
        logger.error(f"Escalation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/tickets")
async def get_escalated_tickets(status: Optional[str] = None):
    """
    Get list of escalated tickets for admin review.
    """
    try:
        # Get tickets from database
        all_tickets = db.get_tickets()
        
        if status:
            filtered_tickets = [
                ticket for ticket in all_tickets 
                if ticket.get('status') == status
            ]
        else:
            filtered_tickets = all_tickets
        
        # Sort by submission time (newest first)
        filtered_tickets.sort(key=lambda x: x['submitted_at'], reverse=True)
        
        logger.info(f"Retrieved {len(filtered_tickets)} tickets with status filter: {status}")
        return filtered_tickets
        
    except Exception as e:
        logger.error(f"Error retrieving escalated tickets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tickets: {str(e)}")

@app.post("/admin/resolve", response_model=dict)
async def resolve_escalated_ticket(response: AdminResponse):
    try:
        ticket = db.get_ticket(response.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        comment_id = db.get_next_comment_id()
        
        resolution_comment = Comment(
            id=comment_id,
            author="admin",
            author_name="Support Admin",
            content=response.solution,
            timestamp=datetime.now().isoformat(),
            type="resolution"
        )
        
        db.add_comment(response.ticket_id, resolution_comment.model_dump())
        
        db.update_ticket(ticket["id"], {
            "status": "resolved",
            "resolved_at": datetime.now().isoformat(),
            "resolved_by": "admin",
            "admin_solution": response.solution
        })
        
        logger.info(f"Ticket {response.ticket_id} resolved")
        
        return {
            "message": "Ticket resolved successfully",
            "ticket_id": response.ticket_id,
            "status": "resolved"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resolve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tickets/comment", response_model=dict)
async def add_comment_to_ticket(request: AddCommentRequest):
    try:
        ticket = db.get_ticket(request.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        comment_id = db.get_next_comment_id()
        
        comment = Comment(
            id=comment_id,
            author=request.author,
            author_name=request.author_name,
            content=request.content,
            timestamp=datetime.now().isoformat(),
            type="resolution" if request.is_resolution else "comment"
        )
        
        success = db.add_comment(request.ticket_id, comment.model_dump())
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add comment")
        
        if request.is_resolution:
            db.update_ticket(ticket["id"], {
                "status": "resolved",
                "resolved_at": datetime.now().isoformat(),
                "resolved_by": request.author,
                "admin_solution": request.content if request.author == "admin" else None
            })
        
        return {
            "message": "Comment added successfully",
            "ticket_id": request.ticket_id,
            "comment_id": comment_id,
            "is_resolution": request.is_resolution,
            "ticket_status": "resolved" if request.is_resolution else ticket["status"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}")
async def get_ticket_details(ticket_id: str):
    try:
        ticket = db.get_ticket(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/stats")
async def get_admin_stats():
    try:
        analytics = db.get_analytics()
        total = analytics["total_escalated_tickets"]
        resolved = analytics["resolved_tickets"]
        
        return {
            "total_escalated_tickets": total,
            "pending_tickets": analytics["pending_tickets"],
            "resolved_tickets": resolved,
            "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 2),
            "recent_tickets_7_days": analytics.get("recent_tickets_7_days", 0),
            "avg_resolution_hours": analytics.get("avg_resolution_hours", 0),
            "daily_stats": analytics.get("daily_stats", [])
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)