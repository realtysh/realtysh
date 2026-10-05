const searchForm = document.querySelector("#property-search");
const searchQuery = document.querySelector("#search-query");
const searchDeal = document.querySelector("#search-deal");
const filterButtons = [...document.querySelectorAll(".category-button")];
const propertyGrid = document.querySelector("#property-grid");
const resultCount = document.querySelector("#result-count");
const homesTitle = document.querySelector("#homes-title");
const emptyState = document.querySelector("#empty-state");
const firebaseStatus = document.querySelector("#firebase-status");
const postDialog = document.querySelector("#post-dialog");
const adminDialog = document.querySelector("#admin-dialog");
const postForm = document.querySelector("#post-form");
const adminForm = document.querySelector("#admin-form");
const adminFormStatus = document.querySelector("#admin-form-status");
const postFormTitle = document.querySelector("#post-form-title");
const postFormStatus = document.querySelector("#post-form-status");
const savePostButton = document.querySelector("#save-post");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector("#main-nav");
const adminAccess = document.querySelector("#admin-access");
const postCreateButton = document.querySelector("#post-create");
const homeView = document.querySelector("#home-view");
const listingView = document.querySelector("#listing-view");
const officeCardSection = document.querySelector("#contact");
const postTypes = {
  all: "전체",
  apartment: "아파트",
  house: "단독주택",
  commercial: "상가",
  warehouse: "공장/창고",
  presale: "분양권"
};
const dealTypes = {
  sale: "매매",
  lease: "전세",
  monthly: "월세"
};
let database = null;
let auth = null;
let posts = [];
let isAdmin = false;
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

  const actions = document.createElement("div");
  actions.className = "post-card-actions admin-only";
  actions.hidden = !isAdmin;
  const editButton = createTextElement("button", "post-edit-button", "수정");
  editButton.type = "button";
  editButton.addEventListener("click", () => openPostForm(post));
  const deleteButton = createTextElement("button", "post-delete-button", "삭제");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => deletePost(post.id));
  actions.append(editButton, deleteButton);
  card.append(actions);

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

function showListings(kind = selectedKind) {
  selectedKind = kind;
  homeView.hidden = true;
  listingView.hidden = false;
  officeCardSection.hidden = true;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === selectedKind;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  homesTitle.textContent = `${postTypes[selectedKind]} 매물`;
  updateListings();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  homeView.hidden = false;
  listingView.hidden = true;
  officeCardSection.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPosts() {
  propertyGrid.replaceChildren(...posts.map(createPostCard));
  updateListings();
  handleRequestedEdit();
}

function updateAdminControls() {
  adminAccess.textContent = isAdmin ? "관리자 로그아웃" : "관리자 로그인";
  postCreateButton.hidden = !isAdmin;
  renderPosts();
}

function connectAdminAuth() {
  auth.onAuthStateChanged(async (user) => {
    isAdmin = false;
    if (user) {
      try {
        const adminSnapshot = await database.collection("admins").doc(user.uid).get();
        if (auth.currentUser?.uid !== user.uid) return;
        if (adminSnapshot.exists) {
          isAdmin = true;
        } else {
          await auth.signOut();
          adminFormStatus.textContent = "관리자 권한이 확인되지 않는 계정입니다.";
          adminDialog.showModal();
        }
      } catch (error) {
        console.error("관리자 권한 확인에 실패했습니다.", error);
        adminFormStatus.textContent = "관리자 권한을 확인하지 못했습니다. Firestore 규칙을 확인해 주세요.";
      }
    }
    updateAdminControls();
  });
}

function setConnectionError(error) {
  console.warn("Firebase 게시판 연결에 실패했습니다.", error);
  const message = error.code === "permission-denied"
    ? "게시글 읽기 규칙을 확인해 주세요."
    : "Firebase 연결을 확인해 주세요.";
  setFirebaseStatus(message, "local");
}

function openPostForm(post = null) {
  if (!database || !isAdmin) {
    postFormStatus.textContent = isAdmin ? "Firebase 게시판 연결을 확인해 주세요." : "관리자 로그인 후 매물을 등록할 수 있습니다.";
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
  if (!database || !isAdmin) return;
  if (!window.confirm("이 게시글을 삭제할까요? 삭제한 게시글은 복구할 수 없습니다.")) return;

  try {
    await database.collection("posts").doc(postId).delete();
    setFirebaseStatus("게시글을 삭제했습니다.", "connected");
  } catch (error) {
    setConnectionError(error);
    window.alert("게시글을 삭제하지 못했습니다. Firestore 연결과 규칙을 확인해 주세요.");
  }
}

function handleRequestedEdit() {
  const requestedPostId = new URLSearchParams(window.location.search).get("edit");
  if (!requestedPostId || requestedEditHandled) return;

  const post = posts.find((entry) => entry.id === requestedPostId);
  if (!post || !isAdmin) return;
  requestedEditHandled = true;
  openPostForm(post);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateListings();
  document.querySelector("#homes").scrollIntoView({ behavior: "smooth", block: "start" });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showListings(button.dataset.filter);
    if (window.location.hash !== "#homes") window.history.pushState(null, "", "#homes");
  });
});

document.querySelectorAll('a[href="#homes"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showListings("all");
    if (window.location.hash !== "#homes") window.history.pushState(null, "", "#homes");
  });
});

document.querySelectorAll('a[href="#top"], a[href="#contact"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showHome();
    if (window.location.hash !== link.hash) window.history.pushState(null, "", link.hash);
    if (link.hash === "#contact") officeCardSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("popstate", () => {
  if (window.location.hash === "#homes") showListings("all");
  else {
    showHome();
    if (window.location.hash === "#contact") officeCardSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

if (window.location.hash === "#homes") showListings("all");

postCreateButton.addEventListener("click", () => openPostForm());

adminAccess.addEventListener("click", async () => {
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  if (isAdmin) {
    try {
      await auth.signOut();
      adminFormStatus.textContent = "";
    } catch (error) {
      console.error("관리자 로그아웃에 실패했습니다.", error);
      setFirebaseStatus("관리자 로그아웃에 실패했습니다.", "local");
    }
    return;
  }
  adminForm.reset();
  adminFormStatus.textContent = "";
  adminDialog.showModal();
});

document.querySelector("#close-admin-dialog").addEventListener("click", () => adminDialog.close());
document.querySelector("#cancel-admin-login").addEventListener("click", () => adminDialog.close());

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) {
    adminFormStatus.textContent = "Firebase 설정을 완료해야 관리자 로그인을 사용할 수 있습니다.";
    return;
  }
  const submitButton = document.querySelector("#admin-login-submit");
  const formData = new FormData(adminForm);
  submitButton.disabled = true;
  adminFormStatus.textContent = "로그인 중입니다.";
  try {
    const credential = await auth.signInWithEmailAndPassword(formData.get("email").trim(), formData.get("password"));
    const adminSnapshot = await database.collection("admins").doc(credential.user.uid).get();
    if (!adminSnapshot.exists) {
      await auth.signOut();
      adminFormStatus.textContent = "관리자 권한이 없는 계정입니다.";
      return;
    }
    adminDialog.close();
    adminForm.reset();
  } catch (error) {
    console.error("관리자 로그인에 실패했습니다.", error);
    adminFormStatus.textContent = error.code === "auth/invalid-credential"
      ? "이메일 또는 비밀번호를 확인해 주세요."
      : "로그인에 실패했습니다. Firebase Authentication 설정을 확인해 주세요.";
  } finally {
    submitButton.disabled = false;
  }
});

adminDialog.addEventListener("click", (event) => {
  if (event.target === adminDialog) adminDialog.close();
});

document.querySelector("#close-post-form").addEventListener("click", () => postDialog.close());
document.querySelector("#cancel-post-form").addEventListener("click", () => postDialog.close());

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database) {
    postFormStatus.textContent = "Firebase 게시판 연결을 확인해 주세요.";
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
    auth = firebase.auth();
    connectAdminAuth();
    database.collection("posts").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
      posts = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      renderPosts();
      setFirebaseStatus("공개 게시판 연결됨", "connected");
    }, setConnectionError);
  } catch (error) {
    setConnectionError(error);
  }
}

connectFirebase();