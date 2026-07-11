        const swiper = new Swiper('.mySwiper', {
            // ===== الإعدادات الأساسية =====
            slidesPerView: 1.2,
            spaceBetween: 24,
            centeredSlides: true,
            loop: false, // إلغاء التكرار

            // ===== التنقل =====
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },

            // ===== نقاط الترقيم =====
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: false,
            },

            // ===== التأثيرات =====
            effect: 'slide',
            speed: 600,
            grabCursor: true,

            // ===== التجاوب الكامل =====
            breakpoints: {
                0: {
                    slidesPerView: 1.1,
                    spaceBetween: 12,
                    centeredSlides: true,
                },
                480: {
                    slidesPerView: 1.2,
                    spaceBetween: 16,
                    centeredSlides: true,
                },
                768: {
                    slidesPerView: 1.5,
                    spaceBetween: 20,
                    centeredSlides: true,
                },
                1024: {
                    slidesPerView: 1.8,
                    spaceBetween: 24,
                    centeredSlides: true,
                },
                1280: {
                    slidesPerView: 2.2,
                    spaceBetween: 30,
                    centeredSlides: true,
                },
                1600: {
                    slidesPerView: 2.5,
                    spaceBetween: 35,
                    centeredSlides: true,
                }
            },

            // ===== إعدادات إضافية =====
            watchSlidesProgress: true,
            autoHeight: false,
        });
