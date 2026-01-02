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
  dropdown.style.display = "flex"; // أو block حسب الستايل عندك
}

// ===== إغلاق مؤقت بزر X =====
function closeDropdown() {
  dropdown.style.display = "none";
}

// ===== لو اختار Other =====
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

  // نخزن كـ محافظة
  localStorage.setItem("selectedGovernorateCode", country);

  // اختياري (لو محتاج country)
  localStorage.setItem("country", country);

  dropdown.style.display = "none";
}

const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mnu-mobile");

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("active");
  mobileMenu.classList.toggle("active");
});

// نجيب الوقت الحالي بالميلي ثانية
const now = new Date().getTime();

// نجيب آخر وقت زيارة مخزن
const lastVisit = localStorage.getItem("lastVisit");

// لو فيه وقت مخزن ومر عليه أكتر من 30 دقيقة → نعمل ريفرش
if (lastVisit && now - lastVisit > 30 * 60 * 1000) { // 30 دقيقة × 60 ثانية × 1000 ملي
  location.reload();
}

// نخزن الوقت الحالي كآخر زيارة
localStorage.setItem("lastVisit", now);


const products = document.getElementById("products");
const bag = JSON.parse(localStorage.getItem("cart")) || [];

bag.forEach(item => {
   products.innerHTML += `
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

  <span class="price">$${item.price}.00</span>

  <!-- زر الحذف -->
  <button class="remove-btn" data-id="${item.id}">حذف</button>
</div>
<hr>

`})

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* حساب الإجمالي */
function calculateTotal() {
  const cart = getCart();
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
  });

  document.getElementById("totalPrice").textContent = total.toLocaleString("ar-EG");
}

/* تغيير الكمية */
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("qty-select")) {
    const id = e.target.dataset.id;
    const qty = parseInt(e.target.value);

    let cart = getCart();
    cart = cart.map(item =>
      item.id === id ? { ...item, qty } : item
    );

    saveCart(cart);
    calculateTotal(); // 🔥 يتحسب لوحده
  }
});

/* حذف المنتج */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;

    let cart = getCart();
    cart = cart.filter(item => item.id !== id);

    saveCart(cart);

    // إزالة العنصر من الصفحة
    e.target.closest(".product-item").remove();

    calculateTotal(); // 🔥 تحديث الإجمالي
  }
});

/* حساب أول ما الصفحة تفتح */
calculateTotal();



document.getElementById("saveOrder").addEventListener("click", () => {
  const cart = getCart();

  if (cart.length === 0) {
    alert("السلة فاضية");
    return;
  }

  let total = 0;
  cart.forEach(item => {
    total += item.price * item.qty;
  });

  const orderId = Date.now();

  const newOrder = {
    orderId: orderId,
    items: cart,
    total: total,
    date: new Date().toLocaleString("ar-EG")
  };

  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders.push(newOrder);
  localStorage.setItem("orders", JSON.stringify(orders));

  // تفريغ السلة
  localStorage.removeItem("cart");

  // ⬅️ تحويل لصفحة تانية مع رقم الطلب
  window.location.href = `py/?orderId=${orderId}`;
});

