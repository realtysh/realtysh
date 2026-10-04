const searchForm = document.querySelector("#property-search");
const searchQuery = document.querySelector("#search-query");
const searchDeal = document.querySelector("#search-deal");
const propertyCards = [...document.querySelectorAll(".property-card")];
const filterButtons = [...document.querySelectorAll(".filter-tab")];
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
let selectedKind = "all";

function updateListings() {
  const query = searchQuery.value.trim().toLocaleLowerCase("ko");
  const deal = searchDeal.value;
  let visibleCount = 0;

  propertyCards.forEach((card) => {
    const matchesQuery = card.dataset.search.toLocaleLowerCase("ko").includes(query);
    const matchesDeal = deal === "all" || card.dataset.deal === deal;
    const matchesKind = selectedKind === "all" || card.dataset.kind === selectedKind;
    const isVisible = matchesQuery && matchesDeal && matchesKind;

    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  resultCount.textContent = String(visibleCount);
  emptyState.hidden = visibleCount > 0;
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateListings();
  document.querySelector("#homes").scrollIntoView({ behavior: "smooth", block: "start" });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedKind = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    updateListings();
  });
});

document.querySelectorAll(".favorite-button").forEach((button) => {
  button.addEventListener("click", () => {
    const isSaved = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isSaved));
    button.setAttribute("aria-label", isSaved ? "관심 매물에 추가" : "관심 매물에서 삭제");
    button.textContent = isSaved ? "♡" : "♥";
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