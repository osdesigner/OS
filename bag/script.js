const dropdown = document.getElementById("dropdown");
const select = document.getElementById("country-select");
const closeBtn = document.getElementById("close-dropdown");

// ===== إظهار / إخفاء حسب وجود محافظة =====
const hasGovernorate =
  localStorage.getItem("selectedGovernorateCode") ||
  localStorage.getItem("country");

if (hasGovernorate) {
  dropdown.style.display = "none";
} else {
  dropdown.style.display = "flex";
}

// ===== إغلاق مؤقت =====
function closeDropdown() {
  dropdown.style.display = "none";
}

// ===== اختيار Other =====
select.addEventListener("change", () => {
  if (select.value === "other") {
    window.location.href = "other-country/index.html";
  }
});

// ===== حفظ الاختيار =====
function continueSite() {
  const country = select.value;

  if (!country || country === "other") {
    alert("اختار منطقه صحيحه");
    return;
  }

  localStorage.setItem("selectedGovernorateCode", country);
  localStorage.setItem("country", country);

  dropdown.style.display = "none";
}

// ===== قائمة الموبايل =====
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mnu-mobile");

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("active");
  mobileMenu.classList.toggle("active");
});

// ===== تحديث الصفحة بعد 30 دقيقة =====
const now = new Date().getTime();
const lastVisit = localStorage.getItem("lastVisit");

if (lastVisit && now - lastVisit > 30 * 60 * 1000) {
  location.reload();
}

localStorage.setItem("lastVisit", now);

// ===== السلة =====
const products = document.getElementById("products");
const bag = JSON.parse(localStorage.getItem("cart")) || [];

// عرض المنتجات
let html = "";

bag.forEach(item => {

html += `
<div class="product-item" data-id="${item.id}">

<div class="img-box">
<img src="${item.image}">
</div>

<h3 class="title">${item.title}</h3>

<select class="qty-select" data-id="${item.id}">
<option value="1" ${item.qty==1?'selected':''}>1</option>
<option value="2" ${item.qty==2?'selected':''}>2</option>
<option value="3" ${item.qty==3?'selected':''}>3</option>
<option value="4" ${item.qty==4?'selected':''}>4</option>
<option value="5" ${item.qty==5?'selected':''}>5</option>
<option value="6" ${item.qty==6?'selected':''}>6</option>
<option value="7" ${item.qty==7?'selected':''}>7</option>
<option value="8" ${item.qty==8?'selected':''}>8</option>
<option value="9" ${item.qty==9?'selected':''}>9</option>
<option value="10" ${item.qty>=10?'selected':''}>+10</option>
</select>

<span class="price">${item.sellPrice} جنيه</span>

<button class="remove-btn" data-id="${item.id}">حذف</button>

</div>
<hr>
`;

});

products.innerHTML = html;

// ===== وظائف السلة =====

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// ===== حساب الإجمالي =====
function calculateTotal() {

  const cart = getCart();
  let total = 0;

  cart.forEach(item => {
    total += item.sellPrice * item.qty;
  });

  document.getElementById("totalPrice").textContent =
    total.toLocaleString("ar-EG") + " جنيه";
}

// ===== تغيير الكمية =====
document.addEventListener("change", (e) => {

if (e.target.classList.contains("qty-select")) {

const id = e.target.dataset.id;
const qty = parseInt(e.target.value);

let cart = getCart();

cart = cart.map(item =>
item.id === id ? { ...item, qty } : item
);

saveCart(cart);
calculateTotal();

}

});

// ===== حذف المنتج =====
document.addEventListener("click", (e) => {

if (e.target.classList.contains("remove-btn")) {

const id = e.target.dataset.id;

let cart = getCart();
cart = cart.filter(item => item.id !== id);

saveCart(cart);

e.target.closest(".product-item").remove();

calculateTotal();

}

});

// ===== حساب أول ما الصفحة تفتح =====
calculateTotal();

document.getElementById("saveOrder").addEventListener("click", () => {

  const cart = getCart();

  if (cart.length === 0) {
    alert("السلة فاضية");
    return;
  }

  let total = 0;

  cart.forEach(item => {
    total += item.sellPrice * item.qty;
  });

  const orderId = Date.now();

  const newOrder = {
    orderId: orderId,
    items: cart,
    total: total,
    date: new Date().toLocaleString("ar-EG")
  };

  // حفظ طلب واحد فقط
  localStorage.setItem("orders", JSON.stringify(newOrder));

  // الانتقال لصفحة الدفع
  window.location.href = `py/?orderId=${orderId}`;

});

// ===== عداد السلة =====
function updateCartCount() {

const cart = JSON.parse(localStorage.getItem("cart")) || [];

const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

document.getElementById("cartCount").textContent = totalItems;

}

// ===== إضافة للسلة =====
function addToCart(product) {

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => String(item.id) === String(product.id));

  // لو المنتج موجود
  if (existing) {

    existing.qty += 1; // زيادة الكمية

  } else {

    // إضافة منتج جديد
    cart.push({
      id: product.id,
      title: product.title,
      image: product.image,
      sellPrice: product.sellPrice,
      qty: 1
    });

  }

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount();
  calculateTotal();
}