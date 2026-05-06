from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FraudGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

transactions = []


class Transaction(BaseModel):
    amount: float
    country: str
    user_country: str
    hour: int
    transactions_last_minute: int


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

    transaction_record = {
        "amount": transaction.amount,
        "country": transaction.country,
        "user_country": transaction.user_country,
        "hour": transaction.hour,
        "transactions_last_minute": transaction.transactions_last_minute,
        "risk_score": risk_score,
        "status": status,
        "reasons": reasons
    }

    transactions.append(transaction_record)

    return {
        "risk_score": risk_score,
        "status": status,
        "reasons": reasons
    }


@app.get("/transactions")
def get_transactions():
    return {
        "transactions": transactions,
        "total": len(transactions)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)