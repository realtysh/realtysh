const galleryImage = document.querySelector("#gallery-main-image");
const galleryCaption = document.querySelector(".gallery-feature figcaption");
const galleryButtons = [...document.querySelectorAll(".gallery-thumb")];
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");

galleryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    galleryImage.src = button.dataset.image;
    galleryImage.alt = button.dataset.alt;
    galleryCaption.textContent = button.dataset.caption;
    galleryButtons.forEach((thumbnail) => {
      const isSelected = thumbnail === button;
      thumbnail.classList.toggle("is-selected", isSelected);
      thumbnail.setAttribute("aria-pressed", String(isSelected));
    });
  });
});

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "메뉴 열기" : "메뉴 닫기");
  mainNav.classList.toggle("is-open", !isOpen);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "메뉴 열기");
    mainNav.classList.remove("is-open");
  });
});