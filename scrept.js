  console.log("Firebase Initialized!");
function toggleNav() {
    const nav = document.getElementById("nav");
    nav.classList.toggle("active");

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





var swiper = new Swiper(".mySwiper", {
    slidesPerView: 1,
    spaceBetween: 10,
    loop: true,
    autoplay: {
        delay: 3500, // تغيير كل 3 ثوانٍ
        disableOnInteraction: false, // يستمر في العمل بعد التفاعل
    },
    speed: 2000, // سرعة التبديل
    });
    
    swiper.on('slideChangeTransitionStart', function () {
    var activeSlide = document.querySelector('.swiper-slide-active .overlay');
    if (activeSlide) {
        activeSlide.style.opacity = '0';
        activeSlide.style.transition = 'opacity 0.5s ease-in-out';
    }
    });
    
    swiper.on('slideChangeTransitionEnd', function () {
    var activeSlide = document.querySelector('.swiper-slide-active .overlay');
    if (activeSlide) {
        activeSlide.style.opacity = '1';
        activeSlide.style.transition = 'opacity 0.5s ease-in-out';
    }
    });
    
    // Adjust image sources for mobile devices
    swiper.on('init', function () {
    var slides = document.querySelectorAll('.swiper-slide picture source');
    slides.forEach(function (slide) {
        if (window.innerWidth <= 767) {
            slide.srcset = slide.srcset.replace('img-', 'image-small');
        }
    });
    });
    
    swiper.init();





    