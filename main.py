from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

app = FastAPI(title="FraudGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_NAME = "fraudguard.db"


class Transaction(BaseModel):
    amount: float
    country: str
    user_country: str
    hour: int
    transactions_last_minute: int


def get_db_connection():
    connection = sqlite3.connect(DATABASE_NAME)
    connection.row_factory = sqlite3.Row
    return connection


def create_transactions_table():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            country TEXT NOT NULL,
            user_country TEXT NOT NULL,
            hour INTEGER NOT NULL,
            transactions_last_minute INTEGER NOT NULL,
            risk_score INTEGER NOT NULL,
            status TEXT NOT NULL,
            reasons TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


create_transactions_table()
@app.delete("/transactions")
def delete_all_transactions():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("DELETE FROM transactions")
    connection.commit()
    connection.close()

    return {"message": "All transactions deleted successfully"}

@app.get("/")
def home():
    return {"message": "FraudGuard API is running"}


@app.post("/analyze-transaction")
def analyze_transaction(transaction: Transaction):
    risk_score = 0
    reasons = []

    if transaction.amount > 50000:
        risk_score += 30
        reasons.append("High transaction amount")

    if transaction.country.upper() != transaction.user_country.upper():
        risk_score += 35
        reasons.append("Transaction from different country")

    if 0 <= transaction.hour <= 5:
        risk_score += 15
        reasons.append("Transaction made at unusual hour")

    if transaction.transactions_last_minute > 5:
        risk_score += 40
        reasons.append("Too many transactions in a short time")

    risk_score = min(risk_score, 100)

    if risk_score >= 70:
        status = "FRAUD"
    elif risk_score >= 40:
        status = "SUSPICIOUS"
    else:
        status = "SAFE"

    reasons_text = ", ".join(reasons)

    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO transactions (
            amount,
            country,
            user_country,
            hour,
            transactions_last_minute,
            risk_score,
            status,
            reasons
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        transaction.amount,
        transaction.country,
        transaction.user_country,
        transaction.hour,
        transaction.transactions_last_minute,
        risk_score,
        status,
        reasons_text
    ))

    connection.commit()
    connection.close()

    return {
        "risk_score": risk_score,
        "status": status,
        "reasons": reasons
    }


@app.get("/transactions")
def get_transactions():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM transactions ORDER BY id DESC")
    rows = cursor.fetchall()

    connection.close()

    transactions = []

    for row in rows:
        transactions.append({
            "id": row["id"],
            "amount": row["amount"],
            "country": row["country"],
            "user_country": row["user_country"],
            "hour": row["hour"],
            "transactions_last_minute": row["transactions_last_minute"],
            "risk_score": row["risk_score"],
            "status": row["status"],
            "reasons": row["reasons"].split(", ") if row["reasons"] else []
        })

    return {
        "transactions": transactions,
        "total": len(transactions)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)