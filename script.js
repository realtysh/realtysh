const searchForm = document.querySelector("#property-search");
const searchQuery = document.querySelector("#search-query");
const searchDeal = document.querySelector("#search-deal");
const propertyCards = [...document.querySelectorAll(".property-card")];
const filterButtons = [...document.querySelectorAll(".filter-tab")];
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
const firebaseStatus = document.querySelector("#firebase-status");
const favoriteButtons = [...document.querySelectorAll(".favorite-button")];
const favoritePropertyIds = new Set(propertyCards.map((card) => card.dataset.id));
const favoritesStorageKey = "realtysh-favorites";
let selectedKind = "all";
let savedFavorites = readSavedFavorites();
let favoritesDocument = null;
let cloudWriteQueue = Promise.resolve();

function readSavedFavorites() {
  try {
    const storedFavorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
    return new Set(storedFavorites.filter((id) => favoritePropertyIds.has(id)));
  } catch {
    return new Set();
  }
}

function setFirebaseStatus(message, state) {
  firebaseStatus.textContent = message;
  firebaseStatus.dataset.state = state;
}

function renderFavoriteButtons() {
  favoriteButtons.forEach((button) => {
    const isSaved = savedFavorites.has(button.closest(".property-card").dataset.id);
    button.setAttribute("aria-pressed", String(isSaved));
    button.setAttribute("aria-label", isSaved ? "관심 매물에서 삭제" : "관심 매물에 추가");
    button.textContent = isSaved ? "♥" : "♡";
  });
}

function persistLocalFavorites() {
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify([...savedFavorites]));
  } catch {
    setFirebaseStatus("브라우저 저장을 사용할 수 없음", "local");
  }
}

function persistCloudFavorites() {
  if (!favoritesDocument) return;

  setFirebaseStatus("Firebase 저장 중", "loading");
  cloudWriteQueue = cloudWriteQueue
    .catch(() => {})
    .then(() => favoritesDocument.set({
      favorites: [...savedFavorites],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }))
    .then(() => setFirebaseStatus("Firebase 동기화됨", "connected"))
    .catch((error) => {
      console.warn("Firebase favorites could not be saved.", error);
      setFirebaseStatus("클라우드 저장 실패 · 기기에 보관", "local");
    });
}

async function connectFirebase() {
  const config = window.REALTYSH_FIREBASE_CONFIG;
  if (!config || typeof firebase === "undefined") {
    const reason = config ? "Firebase SDK를 불러오지 못함" : "Firebase 설정 없음";
    setFirebaseStatus(`${reason} · 기기에 저장`, "local");
    return;
  }

  setFirebaseStatus("Firebase 연결 중", "loading");

  try {
    if (firebase.apps.length === 0) firebase.initializeApp(config);
    const credential = await firebase.auth().signInAnonymously();
    const userFavoritesDocument = firebase.firestore()
      .collection("users")
      .doc(credential.user.uid);
    const snapshot = await userFavoritesDocument.get();
    const cloudFavorites = snapshot.exists && Array.isArray(snapshot.data().favorites)
      ? snapshot.data().favorites.filter((id) => favoritePropertyIds.has(id))
      : [];

    savedFavorites = new Set([...savedFavorites, ...cloudFavorites]);
    favoritesDocument = userFavoritesDocument;
    persistLocalFavorites();
    renderFavoriteButtons();
    persistCloudFavorites();
  } catch (error) {
    console.warn("Firebase favorites are unavailable; using this device instead.", error);
    favoritesDocument = null;
    setFirebaseStatus("Firebase 연결 실패 · 기기에 저장", "local");
  }
}

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

favoriteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const propertyId = button.closest(".property-card").dataset.id;
    if (savedFavorites.has(propertyId)) {
      savedFavorites.delete(propertyId);
    } else {
      savedFavorites.add(propertyId);
    }
    persistLocalFavorites();
    renderFavoriteButtons();
    persistCloudFavorites();
  });
});

renderFavoriteButtons();
connectFirebase();

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