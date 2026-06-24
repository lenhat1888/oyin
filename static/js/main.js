// Mobile menu toggle
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const navMain = document.querySelector(".nav-main");

  if (menuToggle && navMain) {
    menuToggle.addEventListener("click", function () {
      navMain.classList.toggle("active");
    });
  }
});
