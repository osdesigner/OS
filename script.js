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
