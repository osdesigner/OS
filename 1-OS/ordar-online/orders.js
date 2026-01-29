// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB_ycbGn27inIzFd-hkOxJ3aHauJTlc2IE",
  authDomain: "ordar-and-bay.firebaseapp.com",
  projectId: "ordar-and-bay",
  storageBucket: "ordar-and-bay.firebasestorage.app",
  messagingSenderId: "933547150906",
  appId: "1:584686051923:web:d4bebfb4905b318769af03"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ordersContainer = document.getElementById("ordersContainer");

// قراءة الطلبات
async function loadOrders() {
  ordersContainer.innerHTML = ""; // تفريغ قبل التحميل

  const querySnapshot = await getDocs(collection(db, "orders"));

  querySnapshot.forEach(orderSnap => {
    const data = orderSnap.data();

    const orderDiv = document.createElement("div");
    orderDiv.className = "order-card";

    orderDiv.innerHTML = `
      <div class="order-header">
        رقم الطلب: ${data.orderId}
      </div>

      <div class="customer-info">
        <p>👤 الاسم: ${data.customerName || `${data.firstName} ${data.lastName}`}</p>
        <p>📞 الهاتف: ${data.phone || "-"}</p>
        <p>📧 البريد: ${data.email || "-"}</p>
        <p>📍 العنوان: ${data.address || "-"}</p>
        <p>🗺️ الموقع: ${data.location || "-"}</p>
      </div>

      <div class="items"></div>

      <div class="total">الإجمالي: ${data.total || 0} جنيه</div>

      <div class="status" id="status-${orderSnap.id}">
        الحالة: ${data.status || "قيد المراجعة"}
      </div>

      <div class="status-buttons">
        <button class="prepare">جاري التحضير</button>
        <button class="delivered">تم التوصيل</button>
      </div>
    `;

    // ====== الأزرار ======
    const prepareBtn = orderDiv.querySelector(".prepare");
    const deliveredBtn = orderDiv.querySelector(".delivered");
    const statusDiv = orderDiv.querySelector(`#status-${orderSnap.id}`);

    const orderRef = doc(db, "orders", orderSnap.id);

    prepareBtn.addEventListener("click", async () => {
      await updateDoc(orderRef, { status: "جاري التحضير" });
      statusDiv.textContent = "الحالة: جاري التحضير";
    });

    deliveredBtn.addEventListener("click", async () => {
      await updateDoc(orderRef, { status: "تم التوصيل" });
      statusDiv.textContent = "الحالة: تم التوصيل";
    });

    // ====== المنتجات ======
    const itemsContainer = orderDiv.querySelector(".items");

    data.orders?.[0]?.items?.forEach(item => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "item";

      itemDiv.innerHTML = `
        <img src="${item.image}" alt="">
        <div class="item-details">
          <p><strong>${item.title}</strong></p>
          <p>السعر: ${item.price} × ${item.qty}</p>
          ${item.serial ? `<p>Serial: ${item.serial}</p>` : ""}
        </div>
      `;

      itemsContainer.appendChild(itemDiv);
    });

    ordersContainer.appendChild(orderDiv);
  });
}

loadOrders();
