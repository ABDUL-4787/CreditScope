import os
import sqlite3
import json
from datetime import datetime

class DBService:
    def __init__(self):
        # Determine database URL from environment variable or default to local file
        db_url = os.environ.get('DATABASE_URL', 'sqlite:///creditscope.db')
        
        # SQLite connection setup
        if db_url.startswith('sqlite:///'):
            self.db_path = db_url.replace('sqlite:///', '')
        else:
            self.db_path = 'creditscope.db'
            
        self.init_db()

    def get_connection(self):
        """
        Returns a sqlite3 connection object. In production, this can be swapped
        to yield a PostgreSQL session.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """
        Initialize tables if they do not exist.
        """
        with self.get_connection() as conn:
            # Create prediction logs table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prediction_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    model_version TEXT NOT NULL,
                    income REAL NOT NULL,
                    loan_amount REAL NOT NULL,
                    employment_length REAL NOT NULL,
                    existing_debt REAL NOT NULL,
                    credit_history_length REAL NOT NULL,
                    prior_defaults INTEGER NOT NULL,
                    monthly_expenses REAL NOT NULL,
                    savings_balance REAL NOT NULL,
                    credit_utilization REAL NOT NULL,
                    transaction_activity INTEGER NOT NULL,
                    employment_type TEXT NOT NULL,
                    employment_notes TEXT,
                    default_probability REAL NOT NULL,
                    risk_score REAL NOT NULL,
                    decision TEXT NOT NULL
                )
            """)
            
            # Create drift events table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS drift_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    feature TEXT NOT NULL,
                    psi REAL NOT NULL,
                    severity TEXT NOT NULL
                )
            """)
            conn.commit()

    def log_prediction(self, model_version: str, inputs: dict, outputs: dict) -> int:
        """
        Log the inputs and output of a scoring prediction.
        """
        now = datetime.utcnow().isoformat()
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO prediction_logs (
                    timestamp, model_version, income, loan_amount, employment_length,
                    existing_debt, credit_history_length, prior_defaults, monthly_expenses,
                    savings_balance, credit_utilization, transaction_activity, employment_type,
                    employment_notes, default_probability, risk_score, decision
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now,
                model_version,
                inputs['income'],
                inputs['loan_amount'],
                inputs['employment_length'],
                inputs['existing_debt'],
                inputs['credit_history_length'],
                inputs['prior_defaults'],
                inputs['monthly_expenses'],
                inputs['savings_balance'],
                inputs['credit_utilization'],
                inputs['transaction_activity'],
                inputs['employment_type'],
                inputs.get('employment_notes', ''),
                outputs['default_probability'],
                outputs['risk_score'],
                outputs['decision']
            ))
            conn.commit()
            return cursor.lastrowid

    def log_drift_event(self, feature: str, psi: float, severity: str):
        """
        Log a data drift event.
        """
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO drift_events (timestamp, feature, psi, severity)
                VALUES (?, ?, ?, ?)
            """, (now, feature, psi, severity))
            conn.commit()

    def get_recent_predictions(self, limit: int = 100) -> list:
        """
        Get recent prediction records.
        """
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM prediction_logs
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def get_segment_analytics(self) -> list:
        """
        Phase 12: SQL Analytics.
        Runs aggregate SQL analytics over logged predictions to analyze scores and approvals per employment type segment.
        """
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT
                    employment_type,
                    COUNT(*) AS applications,
                    AVG(risk_score) AS avg_risk,
                    AVG(
                        CASE WHEN decision = 'APPROVE'
                        THEN 1.0 ELSE 0.0 END
                    ) AS approval_rate
                FROM prediction_logs
                GROUP BY employment_type
            """)
            return [dict(row) for row in cursor.fetchall()]

    def get_recent_drift_events(self, limit: int = 50) -> list:
        """
        Get drift events.
        """
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM drift_events
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def clear_database_logs(self):
        """
        Utility to clear logs for resets.
        """
        with self.get_connection() as conn:
            conn.execute("DELETE FROM prediction_logs")
            conn.execute("DELETE FROM drift_events")
            conn.commit()
