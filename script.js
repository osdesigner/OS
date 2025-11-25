const slider = document.getElementById("slider");

// موبايل Touch
slider.addEventListener("touchstart", (e) => {
  isDown = true;
  startX = e.touches[0].pageX - slider.offsetLeft;
  scrollLeft = slider.scrollLeft;
});
slider.addEventListener("touchend", () => { isDown = false; });
slider.addEventListener("touchmove", (e) => {
  if (!isDown) return;
  const x = e.touches[0].pageX - slider.offsetLeft;
  const walk = (x - startX) * 2;
  slider.scrollLeft = scrollLeft - walk;
});

// الأسهم يمين / شمال
document.querySelector(".right").onclick = () => {
  slider.scrollLeft += 200;
};
document.querySelector(".left").onclick = () => {
  slider.scrollLeft -= 200;
};


document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", function (e) {
        e.preventDefault(); // منع الانتقال

        let product = {
            id: this.dataset.id,
            name: this.dataset.name,
            img: this.dataset.img,
            price: this.dataset.price
        };

        // قراءة السلة القديمة
        let cart = JSON.parse(localStorage.getItem("cart")) || [];

        // إضافة المنتج
        cart.push(product);

        // حفظ السلة
        localStorage.setItem("cart", JSON.stringify(cart));

        alert("تمت إضافة المنتج إلى السلة!");
    });
});
