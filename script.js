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
