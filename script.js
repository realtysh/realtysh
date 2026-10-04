const searchForm = document.querySelector("#property-search");
const searchQuery = document.querySelector("#search-query");
const searchDeal = document.querySelector("#search-deal");
const filterButtons = [...document.querySelectorAll(".filter-tab")];
const propertyGrid = document.querySelector("#property-grid");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const firebaseStatus = document.querySelector("#firebase-status");
const postDialog = document.querySelector("#post-dialog");
const postForm = document.querySelector("#post-form");
const postFormTitle = document.querySelector("#post-form-title");
const postFormStatus = document.querySelector("#post-form-status");
const savePostButton = document.querySelector("#save-post");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
const postTypes = {
  apartment: "아파트",
  house: "단독주택",
  commercial: "상가"
};
const dealTypes = {
  sale: "매매",
  lease: "전세",
  monthly: "월세"
};
let database = null;
let currentUser = null;
let posts = [];
let selectedKind = "all";
let editingPostId = null;
let requestedEditHandled = false;

function setFirebaseStatus(message, state) {
  firebaseStatus.textContent = message;
  firebaseStatus.dataset.state = state;
}

function setEmptyState(message) {
  emptyState.textContent = message;
  emptyState.hidden = false;
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "property-card";
  card.dataset.kind = post.propertyType;
  card.dataset.deal = post.dealType;
  card.dataset.search = [post.title, post.location, post.description, postTypes[post.propertyType], dealTypes[post.dealType]]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ko");

  const imageLink = document.createElement("a");
  imageLink.className = "property-image-link";
  imageLink.href = `post.html?id=${encodeURIComponent(post.id)}`;
  imageLink.setAttribute("aria-label", `${post.title} 상세 게시글 보기`);

  const image = document.createElement("img");
  image.src = safeImageUrl(post.imageUrl);
  image.alt = post.title;
  image.loading = "lazy";
  imageLink.append(image);
  imageLink.append(createTextElement("span", "property-tag", `${postTypes[post.propertyType] || "매물"} · ${dealTypes[post.dealType] || "거래"}`));

  const details = document.createElement("div");
  details.className = "property-details";
  const meta = document.createElement("div");
  meta.className = "property-meta";
  meta.append(createTextElement("span", "", post.location));
  meta.append(createTextElement("span", "", `${postTypes[post.propertyType] || "매물"} · ${dealTypes[post.dealType] || "거래"}`));

  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.href = imageLink.href;
  titleLink.textContent = post.title;
  title.append(titleLink);

  const price = createTextElement("p", "property-price", post.price);
  const specs = document.createElement("div");
  specs.className = "property-specs";
  specs.append(createTextElement("span", "", `전용 ${post.area}`));
  specs.append(createTextElement("span", "", `방 ${post.rooms} · 욕실 ${post.bathrooms}`));
  details.append(meta, title, price, specs);
  card.append(imageLink, details);

  if (currentUser && post.authorId === currentUser.uid) {
    const actions = document.createElement("div");
    actions.className = "post-card-actions";
    const editButton = createTextElement("button", "post-edit-button", "수정");
    editButton.type = "button";
    editButton.addEventListener("click", () => openPostForm(post));
    const deleteButton = createTextElement("button", "post-delete-button", "삭제");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deletePost(post.id));
    actions.append(editButton, deleteButton);
    card.append(actions);
  }

  return card;
}

function updateListings() {
  const query = searchQuery.value.trim().toLocaleLowerCase("ko");
  const deal = searchDeal.value;
  let visibleCount = 0;

  [...propertyGrid.children].forEach((card) => {
    const matchesQuery = card.dataset.search.includes(query);
    const matchesDeal = deal === "all" || card.dataset.deal === deal;
    const matchesKind = selectedKind === "all" || card.dataset.kind === selectedKind;
    card.hidden = !(matchesQuery && matchesDeal && matchesKind);
    if (!card.hidden) visibleCount += 1;
  });

  resultCount.textContent = String(visibleCount);
  if (visibleCount > 0) {
    emptyState.hidden = true;
  } else {
    setEmptyState(posts.length ? "조건에 맞는 게시글이 없습니다." : "등록된 게시글이 없습니다. 첫 게시글을 등록해 보세요.");
  }
}

function renderPosts() {
  propertyGrid.replaceChildren(...posts.map(createPostCard));
  updateListings();
  handleRequestedEdit();
}

function setConnectionError(error) {
  console.warn("Firebase 게시판 연결에 실패했습니다.", error);
  const message = error.code === "permission-denied"
    ? "게시글 읽기 규칙을 확인해 주세요."
    : "Firebase 연결을 확인해 주세요.";
  setFirebaseStatus(message, "local");
}

function openPostForm(post = null) {
  if (!database || !currentUser) {
    postFormStatus.textContent = "Firebase 익명 로그인을 활성화해야 게시글을 등록할 수 있습니다.";
    postDialog.showModal();
    return;
  }

  editingPostId = post?.id || null;
  postForm.reset();
  postFormStatus.textContent = "";
  postFormTitle.textContent = editingPostId ? "게시글 수정" : "매물 게시글 등록";
  savePostButton.textContent = editingPostId ? "수정 저장" : "게시글 등록";

  if (post) {
    Object.entries(post).forEach(([key, value]) => {
      const field = postForm.elements.namedItem(key);
      if (field && typeof value === "string") field.value = value;
    });
  }

  postDialog.showModal();
}

async function deletePost(postId) {
  if (!database || !currentUser) return;
  if (!window.confirm("이 게시글을 삭제할까요? 삭제한 게시글은 복구할 수 없습니다.")) return;

  try {
    await database.collection("posts").doc(postId).delete();
    setFirebaseStatus("게시글을 삭제했습니다.", "connected");
  } catch (error) {
    setConnectionError(error);
    window.alert("게시글을 삭제하지 못했습니다. 작성자 권한과 Firestore 규칙을 확인해 주세요.");
  }
}

function handleRequestedEdit() {
  const requestedPostId = new URLSearchParams(window.location.search).get("edit");
  if (!requestedPostId || requestedEditHandled || !currentUser) return;

  const post = posts.find((entry) => entry.id === requestedPostId);
  if (!post) return;
  requestedEditHandled = true;
  if (post.authorId === currentUser.uid) openPostForm(post);
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

document.querySelectorAll(".post-create-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    openPostForm();
  });
});

document.querySelector("#close-post-form").addEventListener("click", () => postDialog.close());
document.querySelector("#cancel-post-form").addEventListener("click", () => postDialog.close());

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database || !currentUser) {
    postFormStatus.textContent = "Firebase 익명 로그인을 활성화해야 게시글을 등록할 수 있습니다.";
    return;
  }

  const formData = new FormData(postForm);
  const postData = Object.fromEntries(formData.entries());
  postData.title = postData.title.trim();
  postData.location = postData.location.trim();
  postData.price = postData.price.trim();
  postData.area = postData.area.trim();
  postData.rooms = postData.rooms.trim();
  postData.bathrooms = postData.bathrooms.trim();
  postData.imageUrl = safeImageUrl(postData.imageUrl);
  postData.description = postData.description.trim();

  if (!postData.imageUrl) {
    postFormStatus.textContent = "http 또는 https 이미지 주소를 입력해 주세요.";
    return;
  }

  savePostButton.disabled = true;
  postFormStatus.textContent = "저장 중입니다.";

  try {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    if (editingPostId) {
      await database.collection("posts").doc(editingPostId).update({
        ...postData,
        updatedAt: timestamp
      });
      setFirebaseStatus("게시글을 수정했습니다.", "connected");
    } else {
      await database.collection("posts").add({
        ...postData,
        authorId: currentUser.uid,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      setFirebaseStatus("게시글을 등록했습니다.", "connected");
    }
    postDialog.close();
    postForm.reset();
    editingPostId = null;
  } catch (error) {
    setConnectionError(error);
    postFormStatus.textContent = error.code === "permission-denied"
      ? "저장 권한이 없습니다. Firestore 규칙을 확인해 주세요."
      : "저장에 실패했습니다. Firebase 연결을 확인해 주세요.";
  } finally {
    savePostButton.disabled = false;
  }
});

postDialog.addEventListener("click", (event) => {
  if (event.target === postDialog) postDialog.close();
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

async function connectFirebase() {
  const config = window.REALTYSH_FIREBASE_CONFIG;
  if (!config || typeof firebase === "undefined") {
    setFirebaseStatus("Firebase 설정 필요 · 게시판 사용 불가", "local");
    setEmptyState("Firebase 설정을 완료하면 게시글이 표시됩니다.");
    return;
  }

  setFirebaseStatus("게시글을 불러오는 중", "loading");
  try {
    if (firebase.apps.length === 0) firebase.initializeApp(config);
    database = firebase.firestore();
    database.collection("posts").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      posts = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      renderPosts();
      if (currentUser) setFirebaseStatus("게시판 연결됨", "connected");
      else setEmptyState(posts.length ? "인증 상태를 확인하고 있습니다." : "등록된 게시글이 없습니다. 첫 게시글을 등록해 보세요.");
    }, setConnectionError);

    try {
      const credential = await firebase.auth().signInAnonymously();
      currentUser = credential.user;
      setFirebaseStatus("게시판 연결됨", "connected");
      renderPosts();
    } catch (error) {
      const message = ["auth/configuration-not-found", "auth/operation-not-allowed"].includes(error.code)
        ? "Firebase Console에서 익명 로그인을 활성화해 주세요."
        : "Firebase 로그인에 실패했습니다.";
      setFirebaseStatus(message, "local");
    }
  } catch (error) {
    setConnectionError(error);
  }
}

connectFirebase();