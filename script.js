const dropdown = document.getElementById("dropdown");
const select = document.getElementById("country-select");
const closeBtn = document.getElementById("close-dropdown");

// لو فيه بلد مخزنة قبل كده → نخفي الـ dropdown
if (localStorage.getItem("country")) {
  dropdown.style.display = "none";
}

// دالة اغلاق الـ dropdown (مش مخزن حاجة في اللوكل)
function closeDropdown() {
  dropdown.style.display = "none";
}

// تغيير النص حسب الاختيار
select.addEventListener("change", () => {
  const value = select.value;

  if (value === "other") {
    window.location.href = "other-country/index.html"; // نروح للصفحة التانية
  }
});

function continueSite() {
  const country = select.value;
  if (!country || country === "other") {
    alert("اختار بلد صحيح أو اضغط Other للذهاب للصفحة التانية");
    return;
  }

  localStorage.setItem("country", country); // نخزن البلد
  dropdown.style.display = "none"; // نخفي الـ dropdown بعد الحفظ
  alert("تم الحفظ!");
}

// ربط زر الإغلاق بالـ دالة
closeBtn.addEventListener("click", closeDropdown);



























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
