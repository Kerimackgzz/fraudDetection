// HTML içindeki id'si "transactionForm" olan formu seçiyoruz.
// Kullanıcı bu formu doldurup butona basacak.
const form = document.getElementById("transactionForm");

// Sonucu göstereceğimiz kartı seçiyoruz.
// Başta gizli olabilir, analizden sonra görünür yapacağız.
const resultCard = document.getElementById("resultCard");

// Risk skorunun yazılacağı HTML elemanını seçiyoruz.
const riskScoreText = document.getElementById("riskScore");

// SAFE / SUSPICIOUS / FRAUD yazısının gösterileceği alanı seçiyoruz.
const statusText = document.getElementById("statusText");

// Risk sebeplerini liste halinde göstereceğimiz ul elemanını seçiyoruz.
const reasonsList = document.getElementById("reasonsList");

const transactionsTableBody = document.getElementById("transactionsTableBody");

const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

// Frontend'in çalıştığı hostname'i alıyoruz.
// Mesela sayfa http://127.0.0.1:5500 üzerinden çalışıyorsa hostname 127.0.0.1 olur.
// Eğer hostname boş gelirse varsayılan olarak 127.0.0.1 kullanılır.
const apiHost = window.location.hostname || "127.0.0.1";

// Backend API'nin temel adresini oluşturuyoruz.
// Örneğin apiHost 127.0.0.1 ise sonuç şöyle olur:
// http://127.0.0.1:8001
const apiBaseUrl = `http://${apiHost}:8001`;


// Form submit edildiğinde çalışacak event listener.
// Yani kullanıcı Analyze Transaction butonuna basınca bu fonksiyon çalışır.
form.addEventListener("submit", async function (event) {

  // Formun normal davranışını engelliyoruz.
  // Normalde form submit edilince sayfa yenilenir.
  // Biz sayfanın yenilenmesini istemiyoruz çünkü işlemi JavaScript ile yapacağız.
  event.preventDefault();


  // Kullanıcının formdan girdiği verileri alıp transaction objesine koyuyoruz.
  const transaction = {

    // amount inputundaki değeri alıyoruz.
    // Number() ile sayıya çeviriyoruz.
    amount: Number(document.getElementById("amount").value),

    // country inputundaki değeri alıyoruz.
    // Bu string olarak kalıyor.
    country: document.getElementById("country").value,

    // userCountry inputundaki değeri alıyoruz.
    // Backend tarafında bu alan user_country olarak bekleniyor.
    user_country: document.getElementById("userCountry").value,

    // hour inputundaki değeri alıyoruz ve sayıya çeviriyoruz.
    hour: Number(document.getElementById("hour").value),

    // Son 1 dakikadaki işlem sayısını alıyoruz ve sayıya çeviriyoruz.
    // Backend bu alanı transactions_last_minute ismiyle bekliyor.
    transactions_last_minute: Number(document.getElementById("transactionsLastMinute").value)
  };


  // try-catch kullanıyoruz.
  // Çünkü backend kapalıysa, bağlantı hatası varsa veya başka sorun çıkarsa uygulama patlamasın.
  try {

    // fetch ile backend'e istek atıyoruz.
    // apiBaseUrl = http://127.0.0.1:8001
    // Endpoint = /analyze-transaction
    const response = await fetch(`${apiBaseUrl}/analyze-transaction`, {

      // POST methodu kullanıyoruz.
      // Çünkü backend'e veri gönderiyoruz.
      method: "POST",

      // Gönderdiğimiz verinin JSON olduğunu söylüyoruz.
      headers: {
        "Content-Type": "application/json"
      },

      // JavaScript objesini JSON string'e çevirip backend'e gönderiyoruz.
      body: JSON.stringify(transaction)
    });
    //backend hata döndürürse bunu yakalamak için:
     if (!response.ok) {
    throw new Error("Backend hata döndürdü");
     }


    // Backend'den gelen JSON cevabı JavaScript objesine çeviriyoruz.
    const data = await response.json();


    // Sonuç kartının hidden class'ını kaldırıyoruz.
    // Böylece sonuç ekranda görünür hale geliyor.
    resultCard.classList.remove("hidden");


    // Backend'den gelen risk skorunu ekrana yazıyoruz.
    riskScoreText.textContent = data.risk_score;

    // Backend'den gelen status bilgisini ekrana yazıyoruz.
    // Örnek: SAFE, SUSPICIOUS, FRAUD
    statusText.textContent = data.status;


    // Status alanının class'ını sıfırlıyoruz.
    // Böylece önceki işlemden kalan safe/suspicious/fraud rengi temizleniyor.
    statusText.className = "status";


    // Eğer backend sonucu SAFE ise yeşil/güvenli class ekliyoruz.
    if (data.status === "SAFE") {
      statusText.classList.add("safe");

    // Eğer sonuç SUSPICIOUS ise sarı/uyarı class ekliyoruz.
    } else if (data.status === "SUSPICIOUS") {
      statusText.classList.add("suspicious");

    // Eğer sonuç FRAUD ise kırmızı/tehlikeli class ekliyoruz.
    } else if (data.status === "FRAUD") {
      statusText.classList.add("fraud");
    }


    // Önceki analizden kalan sebepleri temizliyoruz.
    reasonsList.innerHTML = "";


    // Eğer backend hiç risk sebebi döndürmediyse:
    if (data.reasons.length === 0) {

      // Yeni bir li elemanı oluşturuyoruz.
      const li = document.createElement("li");

      // İçine güvenli mesaj yazıyoruz.
      li.textContent = "No suspicious activity detected.";

      // Bu li elemanını reasonsList içine ekliyoruz.
      reasonsList.appendChild(li);

    // Eğer risk sebepleri varsa:
    } else {

      // Her bir sebep için döngü kuruyoruz.
      data.reasons.forEach(function (reason) {

        // Yeni bir li elemanı oluşturuyoruz.
        const li = document.createElement("li");

        // Risk sebebini li içine yazıyoruz.
        li.textContent = reason;

        // li elemanını ekrandaki listeye ekliyoruz.
        reasonsList.appendChild(li);
      });
    }
    


  // Eğer try bloğu içinde hata olursa burası çalışır.
  } catch (error) {

    // Kullanıcıya backend bağlantısında sorun olduğunu söylüyoruz.
    alert("Backend bağlantısı kurulamadı. FastAPI server açık mı kontrol et.");

    // Gerçek hata detayını console'a yazdırıyoruz.
    // Geliştirici olarak hatayı buradan inceleriz.
    console.error(error);
  }
  async function loadTransactionHistory() {
  try {
    const response = await fetch(`${apiBaseUrl}/transactions`);

    if (!response.ok) {
      throw new Error("Transaction history alınamadı");
    }

    const data = await response.json();
    const transactions = data.transactions;

    transactionsTableBody.innerHTML = "";

    if (transactions.length === 0) {
      transactionsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">Henüz işlem yok.</td>
        </tr>
      `;
      return;
    }

    transactions.forEach(function (transaction) {
      const row = document.createElement("tr");

      const statusClass = transaction.status.toLowerCase();

      row.innerHTML = `
        <td>${transaction.amount}</td>
        <td>${transaction.country}</td>
        <td>${transaction.user_country}</td>
        <td>${transaction.hour}</td>
        <td>${transaction.risk_score}</td>
        <td>
          <span class="status-pill ${statusClass}">
            ${transaction.status}
          </span>
        </td>
      `;

      transactionsTableBody.appendChild(row);
    });

  } catch (error) {
    console.error("History error:", error);
  }
}

refreshHistoryBtn.addEventListener("click", loadTransactionHistory);

loadTransactionHistory();
});