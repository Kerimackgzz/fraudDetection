const form = document.getElementById("transactionForm");
const riskScoreText = document.getElementById("riskScore");
const statusText = document.getElementById("statusText");
const reasonsList = document.getElementById("reasonsList");
const transactionsTableBody = document.getElementById("transactionsTableBody");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
const deleteDatabaseBtn = document.getElementById("deleteDatabaseBtn");
const gaugeFill = document.getElementById("gaugeFill");
const analyzeBtn = document.getElementById("analyzeBtn");
const btnText = document.getElementById("btnText");
const resultTimestamp = document.getElementById("resultTimestamp");

const apiHost = window.location.hostname || "127.0.0.1";
const apiBaseUrl = `http://${apiHost}:8001`;

const GAUGE_CIRC = 502.65;
let resultResetTimer = null;

const WAITING_RESULT = {
  riskScore: "-",
  status: "WAITING",
  reasons: ["Waiting for transaction analysis."]
};

function clearResultResetTimer() {
  if (resultResetTimer) {
    clearTimeout(resultResetTimer);
    resultResetTimer = null;
  }
}

function setGauge(score) {
  if (score === "-" || score === null) {
    gaugeFill.style.strokeDashoffset = GAUGE_CIRC;
    gaugeFill.style.stroke = "#475569";
    return;
  }
  gaugeFill.style.strokeDashoffset = GAUGE_CIRC - (score / 100) * GAUGE_CIRC;
  if (score >= 70)      gaugeFill.style.stroke = "#ef4444";
  else if (score >= 40) gaugeFill.style.stroke = "#f59e0b";
  else                  gaugeFill.style.stroke = "#10b981";
}

function setReasons(reasons) {
  reasonsList.replaceChildren();
  reasons.forEach(function (reason) {
    const li = document.createElement("li");
    li.textContent = reason;
    reasonsList.appendChild(li);
  });
}

function setResultCard(result) {
  riskScoreText.textContent = result.riskScore === "-" ? "—" : result.riskScore;
  statusText.textContent = result.status;
  statusText.className = "status";
  statusText.classList.add(result.status.toLowerCase());
  setGauge(result.riskScore);
  if (result.riskScore !== "-" && resultTimestamp) {
    resultTimestamp.textContent = "Analyzed at " + new Date().toLocaleTimeString();
  }
  setReasons(result.reasons);
}

function resetResultCard() {
  setResultCard(WAITING_RESULT);
  if (resultTimestamp) resultTimestamp.textContent = "Waiting for input...";
}

function scheduleResultReset() {
  clearResultResetTimer();
  resultResetTimer = setTimeout(function () {
    resetResultCard();
    resultResetTimer = null;
  }, 10000);
}

resetResultCard();

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearResultResetTimer();

  if (analyzeBtn) analyzeBtn.disabled = true;
  if (btnText) btnText.textContent = "Analyzing...";

  const transaction = {
    amount: Number(document.getElementById("amount").value),
    country: document.getElementById("country").value,
    user_country: document.getElementById("userCountry").value,
    hour: Number(document.getElementById("hour").value),
    transactions_last_minute: Number(document.getElementById("transactionsLastMinute").value)
  };

  try {
    const response = await fetch(`${apiBaseUrl}/analyze-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction)
    });

    if (!response.ok) throw new Error("Backend hata döndürdü");

    const data = await response.json();

    setResultCard({
      riskScore: data.risk_score,
      status: data.status,
      reasons: data.reasons.length === 0
        ? ["No suspicious activity detected."]
        : data.reasons
    });

    loadTransactionHistory();
    scheduleResultReset();

  } catch (error) {
    alert("Backend bağlantısı kurulamadı. FastAPI server açık mı kontrol et.");
    console.error(error);
  } finally {
    if (analyzeBtn) analyzeBtn.disabled = false;
    if (btnText) btnText.textContent = "Analyze Transaction";
  }
});

async function loadTransactionHistory() {
  try {
    const response = await fetch(`${apiBaseUrl}/transactions`);
    if (!response.ok) throw new Error("Transaction history alınamadı");

    const data = await response.json();
    const transactions = data.transactions;

    const total      = transactions.length;
    const fraudCount = transactions.filter(function (t) { return t.status === "FRAUD"; }).length;
    const suspCount  = transactions.filter(function (t) { return t.status === "SUSPICIOUS"; }).length;
    const safeCount  = transactions.filter(function (t) { return t.status === "SAFE"; }).length;

    const el = function (id) { return document.getElementById(id); };
    if (el("statTotal"))      el("statTotal").textContent      = total      || "—";
    if (el("statFraud"))      el("statFraud").textContent      = fraudCount || "—";
    if (el("statSuspicious")) el("statSuspicious").textContent = suspCount  || "—";
    if (el("statSafe"))       el("statSafe").textContent       = safeCount  || "—";

    transactionsTableBody.innerHTML = "";

    if (transactions.length === 0) {
      transactionsTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">No transactions yet.</td></tr>`;
      return;
    }

    transactions.forEach(function (transaction) {
      const row = document.createElement("tr");
      const statusClass = transaction.status.toLowerCase();
      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${transaction.amount}</td>
        <td>${transaction.country}</td>
        <td>${transaction.user_country}</td>
        <td>${transaction.hour}</td>
        <td>${transaction.risk_score}</td>
        <td><span class="status-pill ${statusClass}">${transaction.status}</span></td>
      `;
      transactionsTableBody.appendChild(row);
    });

  } catch (error) {
    console.error("History error:", error);
  }
}

refreshHistoryBtn.addEventListener("click", loadTransactionHistory);

deleteDatabaseBtn.addEventListener("click", async function () {
  const confirmed = confirm("Are you sure you want to delete all transaction history?");
  if (!confirmed) return;

  try {
    const response = await fetch(`${apiBaseUrl}/transactions`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error("Database silinemedi");

    clearResultResetTimer();
    resetResultCard();
    loadTransactionHistory();
    alert("Transaction history deleted successfully.");

  } catch (error) {
    alert("Database silinirken hata oluştu.");
    console.error("DELETE error:", error);
  }
});

loadTransactionHistory();
