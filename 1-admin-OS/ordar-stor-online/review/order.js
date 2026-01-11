import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB_ycbGn27inIzFd-hkOxJ3aHauJTlc2IE",
  authDomain: "ordar-and-bay.firebaseapp.com",
  projectId: "ordar-and-bay",
  storageBucket: "ordar-and-bay.firebasestorage.app",
  messagingSenderId: "933547150906",
  appId: "1:933547150906:web:d4bebfb4905b318769af03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const box = document.getElementById("orderBox");

// 🔹 جلب رقم آخر طلب من LocalStorage
const lastOrderId = Number(localStorage.getItem("lastOrderId"));

if (!lastOrderId) {
  box.innerHTML = "❌ لا يوجد طلب محفوظ";
} else {
  loadOrder(lastOrderId);
}

async function loadOrder(orderId) {
  const q = query(
    collection(db, "orders"),
    where("orderId", "==", orderId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    box.innerHTML = "❌ لم يتم العثور على الطلب";
    return;
  }
snap.forEach(doc => {
  const data = doc.data();
  const order = data.orders[0];

  let itemsHTML = "";
  order.items.forEach(item => {
    itemsHTML += `
      <tr>
        <td>${item.title}</td>
        <td>${item.qty}</td>
        <td>${item.price * item.qty} ج.م</td>
      </tr>
    `;
  });

  box.innerHTML = `
    <div class="title">مرحباً ${data.customerName}</div>
    <div class="sub">تفاصيل طلبك موضحة بالأسفل</div>

    <div class="section">
      <h3>المنتجات</h3>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="total">
        إجمالي الطلب: ${data.total} ج.م
      </div>
    </div>

    <div class="info">
      <div>رقم الطلب: <b>${data.orderId}</b></div>
      <div class="status">حالة الطلب: ${data.status}</div>
    </div>

    <div class="footer">
      — فريق براند فون
    </div>
  `;
});
}