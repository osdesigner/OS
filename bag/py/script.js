// ===== Firebase 9 Modular =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyB_ycbGn27inIzFd-hkOxJ3aHauJTlc2IE",
  authDomain: "ordar-and-bay.firebaseapp.com",
  projectId: "ordar-and-bay",
  storageBucket: "ordar-and-bay.firebasestorage.app",
  messagingSenderId: "933547150906",
  appId: "1:933547051923:web:d4bebfb4905b318769af03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== عناصر الصفحة =====
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const phoneInput = document.getElementById("phone");
const provinceInput = document.getElementById("province");
const cityInput = document.getElementById("city");
const streetInput = document.getElementById("street");
const ordersContainer = document.getElementById("ordersContainer");
const sendBtn = document.getElementById("sendOrderBtn");
const totalPriceDiv = document.getElementById("totalPrice");

// ===== جلب الأوردرات من localStorage بعد توحيد الشكل =====
const rawOrders = JSON.parse(localStorage.getItem("orders")) || [];
let currentOrders = [];
if (Array.isArray(rawOrders)) {
    // عدة طلبات
    rawOrders.forEach(order => {
        if (order.items) currentOrders.push(...order.items);
    });
} else if (rawOrders.items) {
    // طلب واحد
    currentOrders = rawOrders.items;
}

// ===== عرض الأوردرات وحساب الإجمالي =====
let totalPrice = 0;
ordersContainer.innerHTML = ""; // مسح أي محتوى قديم

if (currentOrders.length === 0) {
    ordersContainer.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد منتجات في سلة الشراء.</p>';
} else {
    currentOrders.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";

        const itemPrice = item.sellPrice || item.price || 0;
        const itemQty = item.qty || 1;
        const itemTotal = itemPrice * itemQty;
        totalPrice += itemTotal;

        itemDiv.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.title || 'منتج'}">
            <div class="item-details">
                <div>${item.title || 'منتج'}</div>
                <div>السعر: ${itemPrice} جنيه</div>
                <div>الكمية: ${itemQty}</div>
                <div>الإجمالي: ${itemTotal} جنيه</div>
            </div>
        `;
        ordersContainer.appendChild(itemDiv);
    });
}

// عرض الإجمالي النهائي
totalPriceDiv.textContent = `الإجمالي الكلي: ${totalPrice} جنيه`;

// ===== حفظ واسترجاع بيانات المستخدم من localStorage =====
function saveUserData() {
    const data = {
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        phone: phoneInput.value,
        province: provinceInput.value,
        city: cityInput.value,
        street: streetInput.value
    };
    localStorage.setItem("userData", JSON.stringify(data));
}

function loadUserData() {
    const data = JSON.parse(localStorage.getItem("userData"));
    if (data) {
        firstNameInput.value = data.firstName || "";
        lastNameInput.value = data.lastName || "";
        phoneInput.value = data.phone || "";
        provinceInput.value = data.province || "";
        cityInput.value = data.city || "";
        streetInput.value = data.street || "";
    }
}

// استرجاع البيانات عند تحميل الصفحة
loadUserData();

// حفظ البيانات عند التغيير
[firstNameInput, lastNameInput, phoneInput, provinceInput, cityInput, streetInput].forEach(input => {
    if (input) input.addEventListener("input", saveUserData);
});

// ===== الحصول على الموقع (اختياري) =====
function getLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null)
        );
    });
}

// ===== ارسال الأوردر =====
sendBtn.addEventListener("click", async () => {
    if (!firstNameInput.value || !lastNameInput.value || !phoneInput.value) {
        alert("يرجى إدخال الاسم الأول والأخير ورقم الهاتف.");
        return;
    }

    if (currentOrders.length === 0) {
        alert("سلة الشراء فارغة. أضف منتجات أولاً.");
        return;
    }

    const location = await getLocation();
    const fullAddress = `${provinceInput.value} - ${cityInput.value} - ${streetInput.value}`.replace(/^ - - $/, '');

    const orderId = Date.now(); // رقم أوردر فريد

    const docData = {
        customerName: `${firstNameInput.value} ${lastNameInput.value}`,
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        phone: phoneInput.value,
        address: fullAddress || "لم يذكر",
        location: location ? `Lat: ${location.lat}, Lng: ${location.lng}` : "",
        orderId: orderId,
        status: "تم إرسال الطلب",
        orders: currentOrders,
        total: totalPrice,
        createdAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "orders", String(orderId)), docData);
        alert("✅ تم إرسال الأوردر بنجاح!");
        localStorage.setItem("lastOrderId", orderId);
        localStorage.removeItem("orders");
        localStorage.removeItem("cart");
        window.location.href = `confirmation/?orderId=${orderId}`;
    } catch (e) {
        console.error("خطأ في الإرسال:", e);
        alert("❌ حدث خطأ أثناء الإرسال. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
    }
});

// ===== قائمة الموبايل =====
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mnu-mobile");
if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
        menuBtn.classList.toggle("active");
        mobileMenu.classList.toggle("active");
    });
}