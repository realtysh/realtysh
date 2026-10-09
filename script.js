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
const legalAdStatus = document.querySelector("#legal-ad-status");
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
  land: "토지",
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
  if (inquiryManageButton) inquiryManageButton.hidden = !isAdmin;
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
  legalAdStatus.textContent = "";
  currentPropertyTable = [];
  currentBrokerTable = post ? normalizePropertyTable(post.brokerTable) : normalizePropertyTable(defaultBrokerTable);
  renderPropertyTablePreview();
  renderBrokerTablePreview();
  postFormTitle.textContent = editingPostId ? "게시글 수정" : "매물 게시글 등록";
  setLegalFieldVisibility();
  savePostButton.textContent = editingPostId ? "수정 저장" : "게시글 등록";
  existingPostMedia.replaceChildren();
  existingPostMedia.hidden = true;
  selectedPhotoNames.textContent = "선택한 사진이 없습니다.";

  if (post) {
    Object.entries(post).forEach(([key, value]) => {
      const field = postForm.elements.namedItem(key);
      if (field && typeof value === "string") field.value = value;
    });
    currentPropertyTable = stripLegalRows(normalizePropertyTable(post.propertyTable));
    fillLegalFieldsFromTable(post.propertyTable);
    setLegalFieldVisibility();
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

const legalManagedLabels = new Set([
  "면적","건축물 용도","총 층수","해당 층","사용승인일 등","방 수","욕실 수","입주 가능일","주차대수","관리비","방향",
  "관리비 세부내역","지목","용도지역","도로접면","토지면적","건물면적","공장·창고 사양",
  "분양 대상 종류","단지·사업명","입주 예정","분양가","프리미엄 P","동·호/층 정보"
]);

const legalTypeConfig = {
  apartment: { group:"residential", note:"아파트: 주거용 건축물 광고 필수사항을 빠짐없이 입력합니다. 방향은 거실 또는 안방 기준을 함께 표시합니다." },
  house: { group:"residential", note:"주택: 주거용 건축물 광고 필수사항을 빠짐없이 입력합니다. 대장상 용도와 면적을 확인해 주세요." },
  commercial: { group:"nonres", note:"상가: 비주거용 건축물 기준으로 입력합니다. 방향은 주된 출입구 기준으로 표시합니다." },
  warehouse: { group:"warehouse", note:"공장·창고: 비주거용 건축물 필수사항에 더해 토지·건물면적, 층고·전력 등 실무정보를 함께 관리합니다." },
  land: { group:"land", note:"토지: 토지 광고에 맞춰 면적·지목을 확인하고, 용도지역·도로접면은 실무 확인정보로 관리합니다." },
  presale: { group:"presale", note:"분양권: 완성된 기존 건축물과 동일한 항목을 억지로 요구하지 않고, 권리의 대상·면적·가격·사업명·입주예정 등 분양권 정보 중심으로 확인합니다." },
  other: { group:"nonres", note:"기타 건축물: 실제 중개대상물의 법적 종류를 먼저 확인한 뒤 해당 표시사항을 입력해 주세요." }
};

function setLegalFieldVisibility() {
  const type = postForm.elements.namedItem("propertyType").value;
  const group = (legalTypeConfig[type] || legalTypeConfig.other).group;
  document.querySelectorAll(".legal-residential,.legal-nonres,.legal-warehouse,.legal-land,.legal-presale").forEach(el => { el.hidden = true; });
  if(group === "residential") document.querySelectorAll(".legal-residential").forEach(el => { el.hidden=false; });
  if(group === "nonres") document.querySelectorAll(".legal-nonres").forEach(el => { el.hidden=false; });
  if(group === "warehouse") document.querySelectorAll(".legal-nonres,.legal-warehouse").forEach(el => { el.hidden=false; });
  if(group === "land") document.querySelectorAll(".legal-land").forEach(el => { el.hidden=false; });
  if(group === "presale") document.querySelectorAll(".legal-presale").forEach(el => { el.hidden=false; });
  const note=document.querySelector("#legal-ad-type-note"); if(note) note.textContent=(legalTypeConfig[type]||legalTypeConfig.other).note;
}

function tableValue(table, label) {
  for (const row of normalizePropertyTable(table)) {
    for (let i = 0; i < row.length - 1; i += 2) if (row[i].trim() === label) return row[i + 1].trim();
  }
  return "";
}

function fillLegalFieldsFromTable(table) {
  const mapping={legalArea:"면적",landCategory:"지목",zoning:"용도지역",roadAccess:"도로접면",siteArea:"토지면적",buildingArea:"건물면적",factorySpecs:"공장·창고 사양",presaleUse:"분양 대상 종류",complexName:"단지·사업명",expectedMoveIn:"입주 예정",salePrice:"분양가",premium:"프리미엄 P",unitInfo:"동·호/층 정보"};
  Object.entries(mapping).forEach(([name,label])=>{const f=postForm.elements.namedItem(name);if(f)f.value=tableValue(table,label);});
  const residential={buildingUse:"건축물 용도",totalFloors:"총 층수",currentFloor:"해당 층",approvalDate:"사용승인일 등",roomCount:"방 수",bathroomCount:"욕실 수",moveInDate:"입주 가능일",parking:"주차대수",managementFee:"관리비",managementFeeDetails:"관리비 세부내역"};
  const nonres={nonresBuildingUse:"건축물 용도",nonresTotalFloors:"총 층수",nonresCurrentFloor:"해당 층",nonresApprovalDate:"사용승인일 등",nonresRoomCount:"방 수",nonresBathroomCount:"욕실 수",nonresMoveInDate:"입주 가능일",nonresParking:"주차대수",nonresManagementFee:"관리비"};
  [residential,nonres].forEach(m=>Object.entries(m).forEach(([name,label])=>{const f=postForm.elements.namedItem(name);if(f)f.value=tableValue(table,label);}));
  const directionText=tableValue(table,"방향"); const dm=directionText.match(/^(동향|서향|남향|북향|북동향|남동향|남서향|북서향)(?:\s*\((.+)\))?$/);
  ["direction","nonresDirection"].forEach(n=>{const f=postForm.elements.namedItem(n);if(f)f.value=dm?.[1]||"";});
  ["directionBasis","nonresDirectionBasis"].forEach(n=>{const f=postForm.elements.namedItem(n);if(f)f.value=dm?.[2]||"";});
}

function stripLegalRows(table) { return normalizePropertyTable(table).filter(row => !legalManagedLabels.has((row[0]||"").trim())); }
function requiredValue(fd,name,label){ if(!(fd.get(name)||"").trim()) return `${label}을(를) 입력해 주세요.`; return ""; }
function validateSquareMeters(value,label="면적") {
  const text=String(value||"").trim();
  if(!text) return `${label}을(를) 입력해 주세요.`;
  if(!/[0-9]/.test(text) || !/(㎡|m²|m2)/i.test(text)) return `${label}은(는) 숫자와 제곱미터(㎡) 단위를 함께 입력해 주세요. 예: 전용 75.9㎡`;
  return "";
}

function validateLegalAd(fd) {
  const type=fd.get("propertyType"), group=(legalTypeConfig[type]||legalTypeConfig.other).group;
  let err=validateSquareMeters(fd.get("legalArea"),"면적"); if(err)return err;
  if(!fd.get("legalAdConfirmed")) return "표시·광고 내용 확인란에 체크해 주세요.";
  const price=(fd.get("price")||"").trim(); if(/문의|협의|부터|이상|이하|~|∼/.test(price)) return "가격은 '문의/협의/범위'가 아닌 현재 거래예정 단일가격으로 입력해 주세요.";
  if(group==="land") return requiredValue(fd,"landCategory","지목");
  if(group==="warehouse") {
    for (const [name,label] of [["siteArea","토지면적"],["buildingArea","건물면적"]]) {
      const v=(fd.get(name)||"").trim();
      if(v){ err=validateSquareMeters(v,label); if(err)return err; }
    }
  }
  if(group==="presale") { for(const x of [["presaleUse","분양 대상 종류"],["complexName","단지·사업명"],["expectedMoveIn","입주 예정"]]){err=requiredValue(fd,...x);if(err)return err;} return ""; }
  const prefix=group==="residential"?"":"nonres";
  const names=group==="residential"?
    [["buildingUse","건축물 용도"],["totalFloors","총 층수"],["currentFloor","해당 층"],["approvalDate","사용승인일 등"],["roomCount","방 수"],["bathroomCount","욕실 수"],["moveInDate","입주 가능일"],["parking","주차대수"],["managementFee","관리비"],["direction","방향"],["directionBasis","방향 기준"]]:
    [["nonresBuildingUse","건축물 용도"],["nonresTotalFloors","총 층수"],["nonresCurrentFloor","해당 층"],["nonresApprovalDate","사용승인일 등"],["nonresRoomCount","방 수"],["nonresBathroomCount","욕실 수"],["nonresMoveInDate","입주 가능일"],["nonresParking","주차대수"],["nonresDirection","방향"],["nonresDirectionBasis","방향 기준"]];
  for(const x of names){err=requiredValue(fd,...x);if(err)return err;} return "";
}

function buildLegalRows(fd) {
  const type=fd.get("propertyType"), group=(legalTypeConfig[type]||legalTypeConfig.other).group, rows=[["면적",(fd.get("legalArea")||"").trim()]];
  if(group==="land") rows.push(["지목",fd.get("landCategory")||""],["용도지역",fd.get("zoning")||""],["도로접면",fd.get("roadAccess")||""]);
  else if(group==="presale") rows.push(["분양 대상 종류",fd.get("presaleUse")||""],["단지·사업명",fd.get("complexName")||""],["입주 예정",fd.get("expectedMoveIn")||""],["분양가",fd.get("salePrice")||""],["프리미엄 P",fd.get("premium")||""],["동·호/층 정보",fd.get("unitInfo")||""]);
  else {
    const pre=group==="residential"?"":"nonres"; const get=n=>fd.get(pre+n)||"";
    rows.push(["건축물 용도",get(group==="residential"?"buildingUse":"BuildingUse")],["총 층수",get(group==="residential"?"totalFloors":"TotalFloors")],["해당 층",get(group==="residential"?"currentFloor":"CurrentFloor")],["사용승인일 등",get(group==="residential"?"approvalDate":"ApprovalDate")],["방 수",get(group==="residential"?"roomCount":"RoomCount")],["욕실 수",get(group==="residential"?"bathroomCount":"BathroomCount")],["입주 가능일",get(group==="residential"?"moveInDate":"MoveInDate")],["주차대수",get(group==="residential"?"parking":"Parking")],["관리비",get(group==="residential"?"managementFee":"ManagementFee")],...(group==="residential" && (fd.get("managementFeeDetails")||"").trim() ? [["관리비 세부내역",fd.get("managementFeeDetails")]] : []),["방향",`${get(group==="residential"?"direction":"Direction")} (${get(group==="residential"?"directionBasis":"DirectionBasis")})`]);
    if(group==="warehouse") { const sa=fd.get("siteArea")||"", ba=fd.get("buildingArea")||""; rows.push(["토지면적",sa],["건물면적",ba],["공장·창고 사양",fd.get("factorySpecs")||""]); }
  }
  return rows.filter(r=>String(r[1]).trim());
}

postForm.elements.namedItem("propertyType").addEventListener("change", setLegalFieldVisibility);

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
  const invalidLegalAd = validateLegalAd(formData);
  legalAdStatus.textContent = invalidLegalAd;
  if (invalidLegalAd) return;
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
    propertyTable: serializePropertyTable([...buildLegalRows(formData), ...normalizePropertyTable(currentPropertyTable)]),
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
    legalAdStatus.textContent = "";
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
// Customer listing intake: customer-owned records + admin management
const inquiryDialog = document.querySelector("#inquiry-dialog");
const inquiryForm = document.querySelector("#inquiry-form");
const inquiryStatus = document.querySelector("#inquiry-status");
const inquirySuccess = document.querySelector("#inquiry-success");
const inquiryManageButton = document.querySelector("#inquiry-manage");
const inquiryListDialog = document.querySelector("#inquiry-list-dialog");
const inquiryList = document.querySelector("#inquiry-list");
const inquiryListStatus = document.querySelector("#inquiry-list-status");
const myInquiryDialog = document.querySelector("#my-inquiry-dialog");
const myInquiryList = document.querySelector("#my-inquiry-list");
const myInquiryStatus = document.querySelector("#my-inquiry-status");
const myInquiryUnlock = document.querySelector("#my-inquiry-unlock");
let unlockedPinHash = "";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ensureCustomerAuth() {
  if (!auth) throw new Error("인증 연결 전입니다.");
  if (auth.currentUser) return auth.currentUser;
  const result = await auth.signInAnonymously();
  return result.user;
}
function openInquiryForm() {
  inquiryForm.hidden = false; inquirySuccess.hidden = true; inquiryForm.reset(); inquiryStatus.textContent = ""; inquiryDialog.showModal();
}
document.querySelector("#open-inquiry")?.addEventListener("click", openInquiryForm);
document.querySelector('a[href="#inquiry"]')?.addEventListener("click", (event) => {
  event.preventDefault(); mainNav.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); openInquiryForm();
});
document.querySelector("#close-inquiry")?.addEventListener("click", () => inquiryDialog.close());
document.querySelector("#cancel-inquiry")?.addEventListener("click", () => inquiryDialog.close());
document.querySelector("#close-inquiry-list")?.addEventListener("click", () => inquiryListDialog.close());
document.querySelector("#close-my-inquiry")?.addEventListener("click", () => myInquiryDialog.close());
document.querySelector("#open-my-inquiries")?.addEventListener("click", () => {
  inquiryDialog.close(); myInquiryList.replaceChildren(); myInquiryStatus.textContent = ""; myInquiryUnlock.reset(); myInquiryDialog.showModal();
});
document.querySelector("#open-my-inquiries-nav")?.addEventListener("click", () => {
  mainNav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  myInquiryList.replaceChildren();
  myInquiryStatus.textContent = "";
  myInquiryUnlock.reset();
  myInquiryDialog.showModal();
});

inquiryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database) { inquiryStatus.textContent = "잠시 후 다시 시도해 주세요."; return; }
  const button = document.querySelector("#submit-inquiry"); const fd = new FormData(inquiryForm);
  const pin = String(fd.get("pin") || "");
  if (!/^\d{4}$/.test(pin)) { inquiryStatus.textContent = "확인 비밀번호는 숫자 4자리로 입력해 주세요."; return; }
  button.disabled = true; inquiryStatus.textContent = "접수 중입니다.";
  try {
    const user = await ensureCustomerAuth(); const pinHash = await sha256(pin);
    await database.collection("listingInquiries").add({
      ownerUid: user.uid, pinHash, name: fd.get("name").trim(), phone: fd.get("phone").trim(), propertyType: fd.get("propertyType"),
      address: fd.get("address").trim(), area: fd.get("area").trim(), price: fd.get("price").trim(), notes: fd.get("notes").trim(),
      status: "new", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    inquiryForm.reset();
    inquiryStatus.textContent = "";
    inquiryForm.hidden = true;
    inquirySuccess.hidden = false;
  } catch (error) {
    console.error("매물 접수 실패", error);
    inquiryStatus.textContent = error?.code === "auth/operation-not-allowed" ? "Firebase에서 익명 로그인을 먼저 활성화해야 합니다." : "접수하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  } finally { button.disabled = false; }
});


document.querySelector("#confirm-inquiry-success")?.addEventListener("click", () => {
  inquirySuccess.hidden = true;
  inquiryForm.hidden = false;
  inquiryDialog.close();
});

const statusLabels = { new:"신규", consulting:"상담중", listed:"매물등록", hold:"보류", completed:"완료" };
const activeInquiriesButton = document.querySelector("#active-inquiries-button");
const completedInquiriesButton = document.querySelector("#completed-inquiries-button");
let inquiryListMode = "active";
function buildInquiryRows(data) {
  const grid = document.createElement("div"); grid.className = "inquiry-item-grid";
  [["종류",postTypes[data.propertyType]||data.propertyType],["면적",data.area],["가격",data.price],["주소",data.address,"wide"],["기타",data.notes,"wide"],["상태",statusLabels[data.status]||"신규"]].forEach(([label,value,cls])=>{
    const p=document.createElement("p"); if(cls)p.className=cls; const b=document.createElement("strong"); b.textContent=`${label}: `; p.append(b,document.createTextNode(value||"-")); grid.append(p);
  }); return grid;
}
async function loadInquiryList(mode = "active") {
  if (!database || !isAdmin) return;
  inquiryListMode = mode;
  activeInquiriesButton?.classList.toggle("is-active", mode === "active");
  completedInquiriesButton?.classList.toggle("is-active", mode === "completed");
  inquiryList.replaceChildren();
  inquiryListStatus.textContent = mode === "completed" ? "완료 내역을 불러오는 중입니다." : "진행중 접수를 불러오는 중입니다.";
  try {
    const snapshot = await database.collection("listingInquiries").orderBy("createdAt", "desc").limit(200).get();
    const docs = snapshot.docs.filter((doc) => mode === "completed" ? doc.data().status === "completed" : doc.data().status !== "completed");
    inquiryListStatus.textContent = docs.length ? (mode === "completed" ? `완료 ${docs.length}건 · 필요할 때만 완전 삭제하세요.` : `진행중 ${docs.length}건`) : (mode === "completed" ? "완료 처리된 접수가 없습니다." : "현재 진행중인 접수가 없습니다.");
    docs.forEach((doc) => {
      const data=doc.data(), item=document.createElement("article"); item.className="inquiry-item";
      const head=document.createElement("div"); head.className="inquiry-item-head"; const title=document.createElement("h3"); title.textContent=`${data.name||""} · ${data.phone||""}`;
      const time=document.createElement("time"); time.textContent=data.createdAt?.toDate?data.createdAt.toDate().toLocaleString("ko-KR"):"접수 직후"; head.append(title,time);
      const grid=buildInquiryRows(data);
      const actions=document.createElement("div"); actions.className="inquiry-admin-actions";
      if (mode === "active") {
        const select=document.createElement("select"); select.className="inquiry-status-select";
        Object.entries(statusLabels).forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;o.selected=(data.status||"new")===value;select.append(o)});
        select.addEventListener("change", async()=>{
          const next=select.value;
          if(next === "completed" && !confirm("이 접수를 완료 처리할까요? 완료하면 진행중 목록에서 사라지고 ‘완료 내역 보기’에 보관됩니다.")){select.value=data.status||"new";return;}
          select.disabled=true;
          try{await doc.ref.update({status:next,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}); await loadInquiryList("active");}
          catch(e){console.error(e);alert("상태를 변경하지 못했습니다.");select.value=data.status||"new";}
          finally{select.disabled=false;}
        });
        actions.append(select);
      } else {
        const restore=document.createElement("button"); restore.type="button"; restore.className="customer-check-button"; restore.textContent="진행중으로 복원";
        restore.addEventListener("click", async()=>{try{await doc.ref.update({status:"consulting",updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await loadInquiryList("completed");}catch(e){console.error(e);alert("복원하지 못했습니다.");}});
        const del=document.createElement("button"); del.type="button"; del.className="inquiry-delete-button"; del.textContent="완전 삭제";
        del.addEventListener("click", async()=>{if(!confirm("정말 완전히 삭제할까요? 삭제한 접수는 복구할 수 없습니다."))return;try{await doc.ref.delete();await loadInquiryList("completed");}catch(e){console.error(e);alert("삭제하지 못했습니다.");}});
        actions.append(restore,del);
      }
      item.append(head,grid,actions); inquiryList.append(item);
    });
  } catch (error) { console.error(error); inquiryListStatus.textContent = "접수 내역을 불러오지 못했습니다."; }
}
async function openInquiryList() {
  if (!database || !isAdmin) return;
  inquiryListDialog.showModal();
  await loadInquiryList("active");
}

inquiryManageButton?.addEventListener("click", openInquiryList);
activeInquiriesButton?.addEventListener("click", () => loadInquiryList("active"));
completedInquiriesButton?.addEventListener("click", () => loadInquiryList("completed"));

myInquiryUnlock?.addEventListener("submit", async (event) => {
  event.preventDefault(); myInquiryList.replaceChildren(); myInquiryStatus.textContent="확인 중입니다.";
  const pin=String(new FormData(myInquiryUnlock).get("pin")||""); if(!/^\d{4}$/.test(pin)){myInquiryStatus.textContent="숫자 4자리를 입력해 주세요.";return;}
  try {
    const user=await ensureCustomerAuth(); unlockedPinHash=await sha256(pin);
    const snapshot=await database.collection("listingInquiries").where("ownerUid","==",user.uid).get();
    const docs=snapshot.docs.filter((d)=>d.data().pinHash===unlockedPinHash).sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
    myInquiryStatus.textContent=docs.length?`내 접수 ${docs.length}건` : "일치하는 접수 내역이 없습니다. 접수한 기기와 비밀번호를 확인해 주세요.";
    docs.forEach(renderMyInquiry);
  } catch(error){console.error(error);myInquiryStatus.textContent=error?.code==="auth/operation-not-allowed"?"Firebase에서 익명 로그인을 먼저 활성화해야 합니다.":"접수 내역을 확인하지 못했습니다.";}
});
function renderMyInquiry(doc) {
  const data=doc.data(), item=document.createElement("article"); item.className="inquiry-item";
  const head=document.createElement("div"); head.className="inquiry-item-head"; const title=document.createElement("h3"); title.textContent=`${postTypes[data.propertyType]||"매물"} · ${statusLabels[data.status]||"신규"}`;
  const time=document.createElement("time");time.textContent=data.createdAt?.toDate?data.createdAt.toDate().toLocaleString("ko-KR"):"접수 직후";head.append(title,time);
  const form=document.createElement("form"); form.className="inquiry-edit-grid";
  const fields=[["name","성명",data.name],["phone","전화번호",data.phone],["area","면적",data.area],["price","희망 가격",data.price],["address","매물 주소",data.address,"wide"],["notes","기타 사항",data.notes,"wide","textarea"]];
  fields.forEach(([name,label,value,cls,type])=>{const wrap=document.createElement("label");wrap.className=`post-field ${cls||""}`;const span=document.createElement("span");span.textContent=label;const input=document.createElement(type==="textarea"?"textarea":"input");input.name=name;input.value=value||"";if(type==="textarea")input.rows=4;wrap.append(span,input);form.append(wrap);});
  const actions=document.createElement("div");actions.className="inquiry-edit-actions wide";const save=document.createElement("button");save.className="form-submit";save.type="submit";save.textContent="수정 저장";actions.append(save);form.append(actions);
  form.addEventListener("submit",async(e)=>{e.preventDefault();save.disabled=true;const fd=new FormData(form);try{await doc.ref.update({name:fd.get("name").trim(),phone:fd.get("phone").trim(),area:fd.get("area").trim(),price:fd.get("price").trim(),address:fd.get("address").trim(),notes:fd.get("notes").trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});save.textContent="저장 완료";setTimeout(()=>save.textContent="수정 저장",1200);}catch(err){console.error(err);alert("수정하지 못했습니다.");}finally{save.disabled=false;}});
  item.append(head,form);myInquiryList.append(item);
}


connectFirebase();
