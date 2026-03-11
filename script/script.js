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


 // تحديث عداد السلة
        function updateCartCount() {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
            document.getElementById('cartCount').textContent = totalItems;
        }

        // إضافة إلى السلة
        function addToCart(product) {
            let cart = JSON.parse(localStorage.getItem("cart")) || [];

            const existing = cart.find(item => item.id === product.id);
            if (existing) {
                existing.qty += 1;
                showNotification(`تم زيادة الكمية لـ ${product.title} في السلة`);
            } else {
                cart.push({ ...product, qty: 1 });
                showNotification(`تم إضافة ${product.title} إلى السلة`);
            }

            localStorage.setItem("cart", JSON.stringify(cart));
            updateCartCount();
        }



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


  // تحميل المنتجات عند بدء الصفحة
        document.addEventListener('DOMContentLoaded', () => {
            updateCartCount();
        });