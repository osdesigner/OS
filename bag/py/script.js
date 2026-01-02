// JS - Firebase 9 Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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
const googleSignInBtn = document.getElementById("googleSignIn");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const provinceInput = document.getElementById("province");
const cityInput = document.getElementById("city");
const streetInput = document.getElementById("street");
const ordersContainer = document.getElementById("ordersContainer");
const sendBtn = document.getElementById("sendOrderBtn");
const totalPriceDiv = document.getElementById("totalPrice");

// ===== عرض الأوردرات وحساب التوتال =====
const orders = JSON.parse(localStorage.getItem("orders")) || [];
let totalPrice = 0;

orders.forEach(order => {
  const div = document.createElement("div");
  div.className = "order-card";

  order.items.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "item";
    itemDiv.innerHTML = `
      <img src="${item.image}">
      <div class="item-details">
        <div>اسم المنتج: ${item.title}</div>
        <div>السعر: ${item.price}</div>
        <div>الكمية: ${item.qty}</div>
      </div>
    `;
    div.appendChild(itemDiv);

    totalPrice += item.price * item.qty;
  });

  ordersContainer.appendChild(div);
});

totalPriceDiv.textContent = "الإجمالي: " + totalPrice + " جنيه";

// ===== Google SignIn =====
googleSignInBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    localStorage.setItem("userLoggedIn", "true");
    fillUserData(user);
  } catch (e) {
    console.error(e);
    alert("فشل تسجيل الدخول");
  }
});

function fillUserData(user) {
  const names = user.displayName ? user.displayName.split(" ") : [];
  const firstName = names[0] || "";
  const lastName = names.slice(1).join(" ") || "";

  const email = user.email || "";

  firstNameInput.value = firstName;
  lastNameInput.value = lastName;
  emailInput.value = email;

  googleSignInBtn.style.display = "none";

  // عنوان افتراضي
  if (!provinceInput.value) provinceInput.value = "Beheira";
  if (!cityInput.value) cityInput.value = "Badr";
  if (!streetInput.value) streetInput.value = "Beheira";

  saveUserData(); // نحفظ أي حاجة اتملت
}

function saveUserData() {
  const data = {
    firstName: firstNameInput.value,
    lastName: lastNameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    province: provinceInput.value,
    city: cityInput.value,
    street: streetInput.value
  };
  localStorage.setItem("userData", JSON.stringify(data));
}

window.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(localStorage.getItem("userData"));
  if (!data) return;

  firstNameInput.value = data.firstName || "";
  lastNameInput.value = data.lastName || "";
  emailInput.value = data.email || "";
  phoneInput.value = data.phone || "";
  provinceInput.value = data.province || "";
  cityInput.value = data.city || "";
  streetInput.value = data.street || "";

  googleSignInBtn.style.display = "none";
});

[
  firstNameInput,
  lastNameInput,
  emailInput,
  phoneInput,
  provinceInput,
  cityInput,
  streetInput
].forEach(input => {
  input.addEventListener("input", saveUserData);
});

// ===== عند تحميل الصفحة =====
window.addEventListener("DOMContentLoaded", () => {
  const savedData = JSON.parse(localStorage.getItem("userData"));
  if (savedData) {
    firstNameInput.value = savedData.firstName || "";
    lastNameInput.value = savedData.lastName || "";
    emailInput.value = savedData.email || "";
    phoneInput.value = savedData.phone || "";
    provinceInput.value = savedData.province || "Beheira";
    cityInput.value = savedData.city || "Badr";
    streetInput.value = savedData.street || "Beheira";

    googleSignInBtn.style.display = "none";
  }
});


// ===== التحقق من تسجيل الدخول مسبقاً =====
onAuthStateChanged(auth, user => {
  if (user || localStorage.getItem("userLoggedIn")) {
    googleSignInBtn.style.display = "none";
    if (user) fillUserData(user);
  }
});

// ===== الحصول على الموقع =====
function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(pos => {
      resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, () => resolve(null));
  });
}

// ===== ارسال الأوردر =====
sendBtn.addEventListener("click", async () => {
  if (!firstNameInput.value || !lastNameInput.value || !emailInput.value) {
    alert("اكتب الاسم والبريد الالكتروني");
    return;
  }

  const location = await getLocation();
  const fullAddress = `${provinceInput.value} - ${cityInput.value} - ${streetInput.value}`;

  const orderId = Date.now(); // رقم أوردر فريد

  const docData = {
    customerName: firstNameInput.value + " " + lastNameInput.value,
    firstName: firstNameInput.value,
    lastName: lastNameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    address: fullAddress,
    location: location ? `Lat: ${location.lat}, Lng: ${location.lng}` : "",
    orderId: orderId,
    status: "تم إرسال الطلب",
    orders: orders.map(o => ({
      orderId: o.orderId,
      total: o.total || totalPrice,
      items: o.items.map(i => ({
        id: i.id,
        title: i.title,
        price: i.price,
        qty: i.qty,
        serial: i.serial,
        image: i.image
      }))
    })),
    total: totalPrice
  };

  try {
    // حفظ الأوردر كامل في Firestore مع orderId
    await setDoc(doc(db, "orders", String(orderId)), docData);

    alert("تم إرسال الأوردر بنجاح!");
    localStorage.setItem("lastOrderId", orderId);
    localStorage.removeItem("orders");

    // إفراغ الصفحة
    ordersContainer.innerHTML = "";
    totalPriceDiv.textContent = "";

    // تحويل المستخدم لصفحة الفاتورة مع orderId
    window.location.href = `confirmation/?orderId=${orderId}`;
  } catch (e) {
    console.error(e);
    alert("حدث خطأ أثناء الإرسال");
  }
});

  const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mnu-mobile");

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("active");
  mobileMenu.classList.toggle("active");
});

