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

// 🔹 جلب رقم الفاتورة من الرابط ?id=
const params = new URLSearchParams(window.location.search);
const orderId = Number(params.get("id"));

// دالة لتنسيق التاريخ
function formatDate(dateString) {
  if (!dateString) return "غير محدد";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

if (!orderId) {
  box.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-exclamation-circle" style="font-size: 50px; color: #f44336; margin-bottom: 20px;"></i>
      <h2>❌ رقم الفاتورة غير موجود</h2>
      <p style="color: #666; margin-top: 10px;">يرجى التأكد من رابط الطلب</p>
      <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 30px; background: #000; color: white; text-decoration: none; border-radius: 8px;">العودة للرئيسية</a>
    </div>
  `;
} else {
  loadOrder(orderId);
}

async function loadOrder(orderId) {
  try {
    // إظهار حالة التحميل
    box.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #0a7cff; margin-bottom: 20px;"></i>
        <h3>جاري تحميل الطلب...</h3>
      </div>
    `;

    const q = query(
      collection(db, "orders"),
      where("orderId", "==", orderId)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      box.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <i class="fas fa-search" style="font-size: 50px; color: #ff9800; margin-bottom: 20px;"></i>
          <h2>❌ لم يتم العثور على الطلب</h2>
          <p style="color: #666; margin-top: 10px;">لا يوجد طلب بهذا الرقم: #${orderId}</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 30px; background: #000; color: white; text-decoration: none; border-radius: 8px;">العودة للرئيسية</a>
        </div>
      `;
      return;
    }

    snap.forEach(doc => {
      const data = doc.data();
      
      // التحقق من وجود orders
      if (!data.orders || !Array.isArray(data.orders) || data.orders.length === 0) {
        box.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 50px; color: #ff9800; margin-bottom: 20px;"></i>
            <h2>⚠️ لا توجد منتجات في هذا الطلب</h2>
            <p style="color: #666; margin-top: 10px;">رقم الطلب: #${data.orderId}</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 30px; background: #000; color: white; text-decoration: none; border-radius: 8px;">العودة للرئيسية</a>
          </div>
        `;
        return;
      }

      // المنتجات موجودة مباشرة في orders (كما في بياناتك)
      const items = data.orders;
      
      // حساب المجموع إذا لم يكن موجوداً
      const total = data.total || items.reduce((sum, item) => {
        return sum + ((item.sellPrice || item.price || 0) * (item.qty || 1));
      }, 0);

      // تنسيق حالة الطلب
      const status = data.status || "قيد المراجعة";
      let statusColor = "#ff9800"; // برتقالي
      let statusIcon = "fa-clock";
      
      if (status === "جاري التحضير") {
        statusColor = "#2196f3"; // أزرق
        statusIcon = "fa-utensils";
      } else if (status === "تم التوصيل") {
        statusColor = "#4caf50"; // أخضر
        statusIcon = "fa-check-circle";
      } else if (status === "ملغى") {
        statusColor = "#f44336"; // أحمر
        statusIcon = "fa-times-circle";
      }

      // إنشاء HTML للمنتجات
      let itemsHTML = "";
      items.forEach((item, index) => {
        const price = item.sellPrice || item.price || 0;
        const qty = item.qty || 1;
        const itemTotal = price * qty;
        
        itemsHTML += `
          <tr>
            <td style="display: flex; align-items: center; gap: 10px;">
              <img src="${item.image || 'https://via.placeholder.com/50x50/e0e0e0/607d8b?text=No+Image'}" 
                   style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;"
                   onerror="this.src='https://via.placeholder.com/50x50/e0e0e0/607d8b?text=No+Image'">
              <span>${item.title || `منتج ${index + 1}`}</span>
            </td>
            <td style="text-align: center;">${qty}</td>
            <td style="text-align: center;">${price.toLocaleString('ar-EG')} ج.م</td>
            <td style="text-align: center; font-weight: bold; color: #0a7cff;">${itemTotal.toLocaleString('ar-EG')} ج.م</td>
          </tr>
        `;
      });

      // اسم العميل
      const customerName = data.customerName || 
                          `${data.firstName || ''} ${data.lastName || ''}`.trim() || 
                          'عميل';

      // العنوان
      const address = data.address || (data.location ? `الموقع: ${data.location}` : 'غير محدد');

      box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <div class="title">مرحباً ${customerName}</div>
            <div class="sub">تفاصيل طلبك موضحة بالأسفل</div>
          </div>
          <div class="status" style="background: ${statusColor}; display: flex; align-items: center; gap: 5px;">
            <i class="fas ${statusIcon}"></i>
            ${status}
          </div>
        </div>

        <div class="info" style="background: #f9fafb; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            <div>
              <i class="fas fa-user" style="color: #666; margin-left: 5px;"></i>
              <strong>العميل:</strong> ${customerName}
            </div>
            <div>
              <i class="fas fa-phone" style="color: #666; margin-left: 5px;"></i>
              <strong>الهاتف:</strong> ${data.phone || 'غير محدد'}
            </div>
            <div>
              <i class="fas fa-calendar" style="color: #666; margin-left: 5px;"></i>
              <strong>التاريخ:</strong> ${formatDate(data.createdAt)}
            </div>
          </div>
          <div style="margin-top: 10px;">
            <i class="fas fa-map-marker-alt" style="color: #666; margin-left: 5px;"></i>
            <strong>العنوان:</strong> ${address}
          </div>
        </div>

        <div class="section">
          <h3 style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-box" style="color: #0a7cff;"></i>
            المنتجات (${items.length})
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f0f2f5;">
                <th style="padding: 10px; text-align: right;">المنتج</th>
                <th style="padding: 10px; text-align: center;">الكمية</th>
                <th style="padding: 10px; text-align: center;">سعر الوحدة</th>
                <th style="padding: 10px; text-align: center;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div style="margin-top: 20px; text-align: left; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: bold; color: #0a7cff;">
              الإجمالي الكلي: ${total.toLocaleString('ar-EG')} ج.م
            </div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">
              <i class="fas fa-credit-card"></i> طريقة الدفع: الدفع عند الاستلام
            </div>
          </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
          <a href="/" style="background: #000; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fas fa-home"></i> العودة للرئيسية
          </a>
          <button onclick="window.print()" style="background: white; color: #000; padding: 12px 30px; border-radius: 8px; border: 2px solid #eee; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fas fa-print"></i> طباعة الفاتورة
          </button>
        </div>

        <div class="footer" style="margin-top: 30px; text-align: center; color: #888; font-size: 13px; padding-top: 20px; border-top: 1px solid #eee;">
          <i class="fas fa-truck" style="margin-left: 5px;"></i>
          شكراً لتسوقك مع متجر OS - فريق براند فون
        </div>
      `;
    });

  } catch (error) {
    console.error("Error loading order:", error);
    box.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 50px; color: #f44336; margin-bottom: 20px;"></i>
        <h2>❌ حدث خطأ</h2>
        <p style="color: #666; margin-top: 10px;">${error.message || 'تعذر تحميل الطلب'}</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 30px; background: #000; color: white; border: none; border-radius: 8px; cursor: pointer;">
          <i class="fas fa-sync-alt"></i> إعادة المحاولة
        </button>
      </div>
    `;
  }
}

// إضافة بعض الأنماط للطباعة
const style = document.createElement('style');
style.textContent = `
  @media print {
    button, a[href="/"] { display: none; }
    .status { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
document.head.appendChild(style);