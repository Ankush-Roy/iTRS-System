import sqlite3
import json
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class TicketDatabase:
    def __init__(self, db_path: str = "tickets.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tickets (
                        id TEXT PRIMARY KEY,
                        user_query TEXT NOT NULL,
                        ai_answer TEXT NOT NULL,
                        user_feedback TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        submitted_at TEXT NOT NULL,
                        resolved_at TEXT,
                        resolved_by TEXT,
                        admin_solution TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS comments (
                        id TEXT PRIMARY KEY,
                        ticket_id TEXT NOT NULL,
                        author TEXT NOT NULL,
                        author_name TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        type TEXT DEFAULT 'comment',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES tickets (id)
                    )
                """)
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_submitted_at ON tickets(submitted_at)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id)")
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS counters (
                        name TEXT PRIMARY KEY,
                        value INTEGER NOT NULL DEFAULT 1000
                    )
                """)
                
                cursor.execute("INSERT OR IGNORE INTO counters (name, value) VALUES ('ticket', 1000)")
                cursor.execute("INSERT OR IGNORE INTO counters (name, value) VALUES ('comment', 1000)")
                
                try:
                    cursor.execute("ALTER TABLE tickets ADD COLUMN conversation_history TEXT")
                except sqlite3.OperationalError:
                    pass
                
                conn.commit()
        except Exception as e:
            logger.error(f"Database init error: {e}")
            raise
    
    def get_next_ticket_id(self) -> str:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.isolation_level = 'EXCLUSIVE'
                cursor = conn.cursor()
                cursor.execute("UPDATE counters SET value = value + 1 WHERE name = 'ticket'")
                cursor.execute("SELECT value FROM counters WHERE name = 'ticket'")
                result = cursor.fetchone()
                conn.commit()
                return f"ESC-{result[0]:06d}"
        except Exception as e:
            logger.error(f"Ticket ID generation error: {e}")
            raise
    
    def get_next_comment_id(self) -> str:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.isolation_level = 'EXCLUSIVE'
                cursor = conn.cursor()
                cursor.execute("UPDATE counters SET value = value + 1 WHERE name = 'comment'")
                cursor.execute("SELECT value FROM counters WHERE name = 'comment'")
                result = cursor.fetchone()
                conn.commit()
                return f"COMMENT-{result[0]:06d}"
        except Exception as e:
            logger.error(f"Comment ID generation error: {e}")
            raise
    
    def sync_counters_with_data(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT id FROM tickets WHERE id LIKE 'ESC-%'")
                max_ticket = 1000
                for row in cursor.fetchall():
                    try:
                        num = int(row[0].split('-')[1])
                        max_ticket = max(max_ticket, num)
                    except:
                        pass
                
                cursor.execute("SELECT id FROM comments WHERE id LIKE 'COMMENT-%'")
                max_comment = 1000
                for row in cursor.fetchall():
                    try:
                        num = int(row[0].split('-')[1])
                        max_comment = max(max_comment, num)
                    except:
                        pass
                
                cursor.execute("UPDATE counters SET value = ? WHERE name = 'ticket' AND value < ?", (max_ticket, max_ticket))
                cursor.execute("UPDATE counters SET value = ? WHERE name = 'comment' AND value < ?", (max_comment, max_comment))
                conn.commit()
        except Exception as e:
            logger.error(f"Counter sync error: {e}")
    
    def save_ticket(self, ticket_data) -> bool:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if hasattr(ticket_data, 'model_dump'):
                    ticket_dict = ticket_data.model_dump()
                elif hasattr(ticket_data, 'dict'):
                    ticket_dict = ticket_data.dict()
                else:
                    ticket_dict = ticket_data
                
                conversation_history = ticket_dict.get('conversation_history', [])
                conversation_history_json = json.dumps(conversation_history) if conversation_history else None
                
                cursor.execute("""
                    INSERT INTO tickets (
                        id, user_query, ai_answer, user_feedback, status, 
                        submitted_at, resolved_at, resolved_by, admin_solution, conversation_history
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ticket_dict.get('id'),
                    ticket_dict.get('user_query'),
                    ticket_dict.get('ai_answer'),
                    ticket_dict.get('user_feedback'),
                    ticket_dict.get('status', 'pending'),
                    ticket_dict.get('submitted_at'),
                    ticket_dict.get('resolved_at'),
                    ticket_dict.get('resolved_by'),
                    ticket_dict.get('admin_solution'),
                    conversation_history_json
                ))
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Save ticket error: {e}")
            return False
            return False
    
    def get_ticket(self, ticket_id: str) -> Optional[Dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
                ticket_row = cursor.fetchone()
                
                if not ticket_row:
                    return None
                
                ticket = dict(ticket_row)
                
                if ticket.get('conversation_history'):
                    try:
                        ticket['conversation_history'] = json.loads(ticket['conversation_history'])
                    except json.JSONDecodeError:
                        ticket['conversation_history'] = []
                else:
                    ticket['conversation_history'] = []
                
                cursor.execute("""
                    SELECT * FROM comments WHERE ticket_id = ? ORDER BY timestamp ASC
                """, (ticket_id,))
                
                ticket['comments'] = [dict(row) for row in cursor.fetchall()]
                return ticket
                
        except Exception as e:
            logger.error(f"Get ticket error: {e}")
            return None
    
    def get_tickets(self, status_filter: Optional[str] = None) -> List[Dict]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                if status_filter:
                    cursor.execute("SELECT * FROM tickets WHERE status = ? ORDER BY submitted_at DESC", (status_filter,))
                else:
                    cursor.execute("SELECT * FROM tickets ORDER BY submitted_at DESC")
                
                tickets = []
                for row in cursor.fetchall():
                    ticket = dict(row)
                    
                    if ticket.get('conversation_history'):
                        try:
                            ticket['conversation_history'] = json.loads(ticket['conversation_history'])
                        except json.JSONDecodeError:
                            ticket['conversation_history'] = []
                    else:
                        ticket['conversation_history'] = []
                    
                    cursor.execute("SELECT * FROM comments WHERE ticket_id = ? ORDER BY timestamp ASC", (ticket['id'],))
                    comments = [dict(c) for c in cursor.fetchall()]
                    ticket['comments'] = comments
                    ticket['comment_count'] = len(comments)
                    tickets.append(ticket)
                
                return tickets
                
        except Exception as e:
            logger.error(f"Get tickets error: {e}")
            return []
    
    def update_ticket(self, ticket_id: str, updates: Dict) -> bool:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                set_clauses = []
                values = []
                
                for field, value in updates.items():
                    if field in ['status', 'resolved_at', 'resolved_by', 'admin_solution']:
                        set_clauses.append(f"{field} = ?")
                        values.append(value)
                
                if not set_clauses:
                    return False
                
                set_clauses.append("updated_at = CURRENT_TIMESTAMP")
                values.append(ticket_id)
                
                query = f"UPDATE tickets SET {', '.join(set_clauses)} WHERE id = ?"
                cursor.execute(query, values)
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Update ticket error: {e}")
            return False
    
    def add_comment(self, ticket_id: str, comment_data) -> bool:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if hasattr(comment_data, 'model_dump'):
                    comment_dict = comment_data.model_dump()
                elif hasattr(comment_data, 'dict'):
                    comment_dict = comment_data.dict()
                else:
                    comment_dict = comment_data
                
                required_fields = ['id', 'author', 'author_name', 'content', 'timestamp']
                for field in required_fields:
                    if field not in comment_dict or comment_dict[field] is None:
                        return False
                
                cursor.execute("""
                    INSERT INTO comments (id, ticket_id, author, author_name, content, timestamp, type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    comment_dict.get('id'),
                    ticket_id,
                    comment_dict.get('author'),
                    comment_dict.get('author_name'),
                    comment_dict.get('content'),
                    comment_dict.get('timestamp'),
                    comment_dict.get('type', 'comment')
                ))
                
                conn.commit()
                return cursor.rowcount > 0
                
        except Exception as e:
            logger.error(f"Add comment error: {e}")
            return False
    
    def get_analytics(self) -> Dict:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT COUNT(*) FROM tickets")
                total_tickets = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'pending'")
                pending_tickets = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM tickets WHERE status = 'resolved'")
                resolved_tickets = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT AVG(
                        CASE WHEN resolved_at IS NOT NULL AND submitted_at IS NOT NULL 
                        THEN (julianday(resolved_at) - julianday(submitted_at)) * 24 
                        ELSE NULL END
                    ) FROM tickets WHERE status = 'resolved'
                """)
                avg_result = cursor.fetchone()[0]
                avg_resolution_hours = round(avg_result, 2) if avg_result else 0
                
                cursor.execute("SELECT COUNT(*) FROM tickets WHERE date(submitted_at) >= date('now', '-7 days')")
                recent_tickets = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT date(submitted_at) as date, COUNT(*) as count
                    FROM tickets WHERE date(submitted_at) >= date('now', '-30 days')
                    GROUP BY date(submitted_at) ORDER BY date(submitted_at)
                """)
                daily_stats = [{"date": row[0], "count": row[1]} for row in cursor.fetchall()]
                
                return {
                    "total_escalated_tickets": total_tickets,
                    "pending_tickets": pending_tickets,
                    "resolved_tickets": resolved_tickets,
                    "avg_resolution_hours": avg_resolution_hours,
                    "recent_tickets_7_days": recent_tickets,
                    "daily_stats": daily_stats
                }
                
        except Exception as e:
            logger.error(f"Analytics error: {e}")
            return {
                "total_escalated_tickets": 0,
                "pending_tickets": 0,
                "resolved_tickets": 0,
                "avg_resolution_hours": 0,
                "recent_tickets_7_days": 0,
                "daily_stats": []
            }
    
