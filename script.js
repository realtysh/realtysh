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
const photosInput = postForm.elements.namedItem("photos");
const existingPostMedia = document.querySelector("#existing-post-media");
const selectedPhotoNames = document.querySelector("#selected-photo-names");
const propertyTableInput = document.querySelector("#property-table-paste");
const propertyTablePreviewWrap = document.querySelector("#property-table-preview-wrap");
const propertyTablePreview = document.querySelector("#property-table-preview");
const propertyTableStatus = document.querySelector("#property-table-status");
const clearPropertyTableButton = document.querySelector("#clear-property-table");
const brokerTablePreview = document.querySelector("#broker-table-preview");
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
  presale: "분양권",
  other: "기타"
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
let currentPropertyTable = [];
let currentBrokerTable = [];
const defaultBrokerTable = [
  ["상호(명칭)", "현진공인중개사사무소"],
  ["소재지", "경기도 시흥시 신천로 100번길36(신천동 782)"],
  ["연락처", "010-3664-1861 / 031-313-1862"],
  ["등록번호", "41390-2024-00025"],
  ["대표자 성명", "정선진"]
];

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

  const detailLink = document.createElement("a");
  detailLink.className = "property-list-link";
  detailLink.href = `post.html?id=${encodeURIComponent(post.id)}`;
  detailLink.setAttribute("aria-label", `${post.title || "매물"} 상세 게시글 보기`);

  const thumbnail = document.createElement("span");
  thumbnail.className = "property-thumbnail";
  const imageUrl = [post.photoUrls?.[0], post.imageUrl]
    .map(safeImageUrl)
    .find(Boolean);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      thumbnail.replaceChildren(createTextElement("span", "property-placeholder", "사진 준비중"));
    }, { once: true });
    thumbnail.append(image);
  } else {
    thumbnail.append(createTextElement("span", "property-placeholder", "사진 준비중"));
  }

  const details = document.createElement("div");
  details.className = "property-list-details";
  const meta = document.createElement("div");
  meta.className = "property-list-meta";
  meta.append(createTextElement("span", "property-type-label", postTypes[post.propertyType] || "매물"));
  meta.append(createTextElement("span", "", dealTypes[post.dealType] || "거래"));

  const title = document.createElement("h3");
  title.textContent = post.title || "제목 없는 매물";
  const price = createTextElement("p", "property-price", post.price);
  const location = createTextElement("p", "property-list-location", post.location || "위치 미입력");
  const views = createTextElement("p", "property-views", `조회 ${post.views || 0}`);
  details.append(meta, title, price, location, ...(isAdmin ? [views] : []));
  if (post.description) {
    details.append(createTextElement("p", "property-list-summary", post.description));
  }
  detailLink.append(thumbnail, details);
  card.append(detailLink);

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
    if (user && !user.isAnonymous) {
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
  propertyTableStatus.textContent = "";
  currentPropertyTable = [];
  currentBrokerTable = post ? normalizePropertyTable(post.brokerTable) : normalizePropertyTable(defaultBrokerTable);
  renderPropertyTablePreview();
  renderBrokerTablePreview();
  postFormTitle.textContent = editingPostId ? "게시글 수정" : "매물 게시글 등록";
  savePostButton.textContent = editingPostId ? "수정 저장" : "게시글 등록";
  existingPostMedia.replaceChildren();
  existingPostMedia.hidden = true;
  selectedPhotoNames.textContent = "선택한 사진이 없습니다.";

  if (post) {
    Object.entries(post).forEach(([key, value]) => {
      const field = postForm.elements.namedItem(key);
      if (field && typeof value === "string") field.value = value;
    });
    currentPropertyTable = normalizePropertyTable(post.propertyTable);
    renderPropertyTablePreview();
    const existingPhotos = Array.isArray(post.photoUrls) ? post.photoUrls : [];
    if (existingPhotos.length) {
      existingPostMedia.hidden = false;
      existingPhotos.forEach((url, index) => {
        const label = document.createElement("label");
        label.className = "existing-photo-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "removePhoto";
        checkbox.value = url;
        const image = document.createElement("img");
        image.src = safeImageUrl(url);
        image.alt = `기존 현장 사진 ${index + 1}`;
        label.append(checkbox, image, createTextElement("span", "", "삭제"));
        existingPostMedia.append(label);
      });
    }
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

photosInput.addEventListener("change", () => {
  const files = [...photosInput.files];
  selectedPhotoNames.textContent = files.length
    ? `${files.length}장 선택됨: ${files.map((file) => file.name).join(", ")}`
    : "선택한 사진이 없습니다.";
});

function validateImageFiles(files, maxCount = Infinity) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (files.length > maxCount) return `사진은 최대 ${maxCount}장까지 업로드할 수 있습니다.`;
  if (files.some((file) => !allowedTypes.includes(file.type))) return "JPG, PNG 또는 WEBP 이미지 파일만 업로드할 수 있습니다.";
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return "이미지 파일은 각각 10MB 이하로 선택해 주세요.";
  return "";
}

function normalizePropertyTable(value) {
  if (!Array.isArray(value)) return [];
  const rows = value
    .map((row) => Array.isArray(row) ? row : row?.cells)
    .filter(Array.isArray)
    .map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  return rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] || ""));
}

function serializePropertyTable(table) {
  return table.map((cells) => ({ cells }));
}

function parsePastedPropertyTable(value) {
  let text = value.replace(/\r\n?/g, "\n");
  if (text.endsWith("\n")) text = text.slice(0, -1);
  if (!text) return [];

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else if (cell.length === 0) {
        inQuotes = true;
      } else {
        cell += character;
      }
    } else if (character === "\t" && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if (character === "\n" && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell);
  rows.push(row);

  const columnCount = Math.max(0, ...rows.map((entry) => entry.length));
  return rows.map((entry) => Array.from({ length: columnCount }, (_, index) => entry[index] || ""));
}

function validatePropertyTable(table) {
  if (table.length > 100) return "매물정보표는 최대 100행까지 입력할 수 있습니다.";
  if ((table[0]?.length || 0) > 20) return "매물정보표는 최대 20열까지 입력할 수 있습니다.";
  const characterCount = table.reduce((total, row) => total + row.reduce((sum, cell) => sum + cell.length, 0), 0);
  if (table.some((row) => row.some((cell) => cell.length > 500)) || characterCount > 20000) {
    return "표 셀은 각각 500자, 전체 20,000자 이내로 입력해 주세요.";
  }
  return "";
}

function renderPropertyTablePreview() {
  propertyTablePreview.replaceChildren();
  propertyTablePreviewWrap.hidden = currentPropertyTable.length === 0;
  currentPropertyTable.forEach((row, rowIndex) => {
    const tableRow = document.createElement("tr");
    row.forEach((value, columnIndex) => {
      const cell = document.createElement(columnIndex % 2 === 0 ? "th" : "td");
      cell.textContent = value;
      cell.contentEditable = "true";
      cell.spellcheck = false;
      cell.dataset.row = String(rowIndex);
      cell.dataset.column = String(columnIndex);
      cell.setAttribute("aria-label", `${rowIndex + 1}행 ${columnIndex + 1}열`);
      tableRow.append(cell);
    });
    propertyTablePreview.append(tableRow);
  });
}

function renderBrokerTablePreview() {
  brokerTablePreview.replaceChildren();
  currentBrokerTable.forEach((row, rowIndex) => {
    const tableRow = document.createElement("tr");
    row.forEach((value, columnIndex) => {
      const cell = document.createElement(columnIndex % 2 === 0 ? "th" : "td");
      cell.textContent = value;
      cell.contentEditable = "true";
      cell.spellcheck = false;
      cell.dataset.row = String(rowIndex);
      cell.dataset.column = String(columnIndex);
      cell.setAttribute("aria-label", `${rowIndex + 1}행 ${columnIndex + 1}열`);
      tableRow.append(cell);
    });
    brokerTablePreview.append(tableRow);
  });
}

propertyTableInput.addEventListener("input", () => {
  currentPropertyTable = parsePastedPropertyTable(propertyTableInput.value);
  renderPropertyTablePreview();
  propertyTableStatus.textContent = validatePropertyTable(currentPropertyTable);
});

brokerTablePreview.addEventListener("input", (event) => {
  const cell = event.target.closest("[data-row][data-column]");
  if (!cell) return;
  currentBrokerTable[Number(cell.dataset.row)][Number(cell.dataset.column)] = cell.textContent;
});

propertyTablePreview.addEventListener("input", (event) => {
  const cell = event.target.closest("[data-row][data-column]");
  if (!cell) return;
  currentPropertyTable[Number(cell.dataset.row)][Number(cell.dataset.column)] = cell.textContent;
  propertyTableStatus.textContent = validatePropertyTable(currentPropertyTable);
});

clearPropertyTableButton.addEventListener("click", () => {
  propertyTableInput.value = "";
  currentPropertyTable = [];
  propertyTableStatus.textContent = "";
  renderPropertyTablePreview();
});

async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "realtysh_upload");

  const createUploadError = (message) => {
    const error = new Error(`${file.name}: ${message}`);
    error.name = "CloudinaryUploadError";
    return error;
  };

  let response;
  try {
    response = await fetch("https://api.cloudinary.com/v1_1/lcrmc4u0/image/upload", {
      method: "POST",
      body: formData
    });
  } catch {
    throw createUploadError("Cloudinary에 연결하지 못했습니다. 네트워크를 확인해 주세요.");
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw createUploadError(result?.error?.message || `Cloudinary 업로드 실패 (${response.status})`);
  }
  if (typeof result?.secure_url !== "string" || !result.secure_url.startsWith("https://res.cloudinary.com/")) {
    throw createUploadError("Cloudinary에서 유효한 보안 이미지 주소를 받지 못했습니다.");
  }
  return result.secure_url;
}

postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database || !isAdmin) {
    postFormStatus.textContent = !isAdmin
      ? "관리자 로그인 후 매물을 등록할 수 있습니다."
      : "Firestore 연결을 확인해 주세요.";
    return;
  }

  const formData = new FormData(postForm);
  const photoFiles = [...photosInput.files];
  const currentPost = editingPostId ? posts.find((post) => post.id === editingPostId) : null;
  const removedPhotos = new Set(formData.getAll("removePhoto"));
  const currentPhotoUrls = Array.isArray(currentPost?.photoUrls) ? currentPost.photoUrls : [];
  const keptPhotoCount = currentPhotoUrls.filter((url) => !removedPhotos.has(url)).length;
  const invalidPhotos = validateImageFiles(photoFiles, Math.max(0, 20 - keptPhotoCount));
  if (invalidPhotos) {
    postFormStatus.textContent = invalidPhotos;
    return;
  }
  const invalidPropertyTable = validatePropertyTable(currentPropertyTable);
  if (invalidPropertyTable) {
    propertyTableStatus.textContent = invalidPropertyTable;
    return;
  }
  const youtubeUrl = formData.get("youtubeUrl").trim();
  if (youtubeUrl) {
    try {
      const url = new URL(youtubeUrl);
      if (!["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(url.hostname)) throw new Error("Invalid YouTube URL");
    } catch {
      postFormStatus.textContent = "올바른 YouTube 영상 URL을 입력해 주세요.";
      return;
    }
  }
  const postData = {
    title: formData.get("title").trim(),
    propertyType: formData.get("propertyType"),
    dealType: formData.get("dealType"),
    price: formData.get("price").trim(),
    location: formData.get("location").trim(),
    description: formData.get("description").trim(),
    youtubeUrl,
    photoUrls: currentPhotoUrls,
    propertyTable: serializePropertyTable(normalizePropertyTable(currentPropertyTable)),
    brokerTable: serializePropertyTable(normalizePropertyTable(currentBrokerTable))
  };
  postData.photoUrls = postData.photoUrls.filter((url) => !removedPhotos.has(url));

  savePostButton.disabled = true;
  postFormStatus.textContent = "저장 중입니다.";

  try {
    const postReference = editingPostId
      ? database.collection("posts").doc(editingPostId)
      : database.collection("posts").doc();
    for (const file of photoFiles) {
      postFormStatus.textContent = `사진 업로드 중입니다... (${file.name})`;
      postData.photoUrls.push(await uploadImage(file));
    }
    postData.imageUrl = postData.photoUrls[0] || (currentPhotoUrls.length ? "" : currentPost?.imageUrl || "");
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    if (editingPostId) {
      await postReference.update({
        ...postData,
        updatedAt: timestamp
      });
      setFirebaseStatus("게시글을 수정했습니다.", "connected");
    } else {
      await postReference.set({
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
    if (error.name === "CloudinaryUploadError") {
      console.error("Cloudinary 현장 사진 업로드에 실패했습니다.", error);
      postFormStatus.textContent = `이미지 업로드에 실패했습니다. Firestore에는 저장하지 않았습니다. ${error.message}`;
    } else {
      console.error("Firestore 게시글 저장에 실패했습니다.", {
        code: error.code || "unknown",
        message: error.message || "상세 오류 메시지가 없습니다.",
        error
      });
      setConnectionError(error);
      const errorCode = typeof error.code === "string" ? ` (${error.code})` : "";
      const errorMessage = typeof error.message === "string" ? error.message : "상세 오류 메시지가 없습니다.";
      postFormStatus.textContent = `저장에 실패했습니다${errorCode}: ${errorMessage}`;
    }
  } finally {
    savePostButton.disabled = false;
  }
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