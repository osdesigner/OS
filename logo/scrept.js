function toggleNav() {
    const nav = document.getElementById("nav");
    const header2 = document.querySelector(".header2");

    nav.classList.toggle("active");

    if (nav.classList.contains("active")) {
        header.style.marginTop = "100vh"; // اجعل `header2` ينزل أسفل القائمة
    } else {
        header.style.marginTop = "0px"; // أعد `header2` لمكانه الطبيعي عند إغلاق القائمة
    }
}




document.addEventListener("DOMContentLoaded", function () {
    const columns = document.querySelectorAll(".footer-column h4");
    columns.forEach(column => {
        column.addEventListener("click", function () {
            let parent = this.parentElement;
            parent.classList.toggle("open");
        });
    });
});





const header = document.getElementById('mainHeader');
  const blackSection = document.getElementById('blackSection');

  window.addEventListener('scroll', () => {
    const sectionTop = blackSection.getBoundingClientRect().top;
    const sectionBottom = blackSection.getBoundingClientRect().bottom;

    // لو الهيدر فوق الجزء الأسود (يعني أي جزء من الهيدر داخل الـ div الأسود)
    if (sectionTop <= 50 && sectionBottom > 50) {
      header.classList.add('white');
    } else {
      header.classList.remove('white');
    }
  });



