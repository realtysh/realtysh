const postStatus = document.querySelector("#post-page-status");
const postDetail = document.querySelector("#post-detail");
const ownerActions = document.querySelector("#post-owner-actions");
const deleteButton = document.querySelector("#post-delete-button");
const postId = new URLSearchParams(window.location.search).get("id");
let database = null;
let unsubscribePost = null;

const propertyTypes = {
  apartment: "아파트",
  house: "단독주택",
  commercial: "상가"
};

const dealTypes = {
  sale: "매매",
  lease: "전세",
  monthly: "월세"
};

function setPostStatus(message) {
  postStatus.textContent = message;
  postStatus.hidden = false;
  postDetail.hidden = true;
}

function appendFact(list, label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const definition = document.createElement("dd");
  term.textContent = label;
  definition.textContent = value || "미입력";
  row.append(term, definition);
  list.append(row);
}

function renderPost(post) {
  if (!post) {
    setPostStatus("게시글을 찾을 수 없거나 삭제되었습니다.");
    return;
  }

  const typeTag = document.createElement("span");
  typeTag.textContent = propertyTypes[post.propertyType] || "매물";
  const dealTag = document.createElement("span");
  dealTag.textContent = dealTypes[post.dealType] || "거래";
  document.querySelector("#post-detail-tags").replaceChildren(typeTag, dealTag);
  document.querySelector("#post-detail-title").textContent = post.title || "제목 없는 게시글";
  document.querySelector("#post-detail-location").textContent = post.location || "지역 미입력";
  document.querySelector("#post-detail-description").textContent = post.description || "상세 설명이 없습니다.";
  document.querySelector("#post-detail-price").textContent = post.price || "가격 문의";

  const image = document.querySelector("#post-detail-image");
  try {
    const imageUrl = new URL(post.imageUrl);
    image.src = ["https:", "http:"].includes(imageUrl.protocol) ? imageUrl.href : "";
  } catch {
    image.removeAttribute("src");
  }
  image.alt = post.title || "매물 사진";

  const facts = document.querySelector("#post-detail-facts");
  facts.replaceChildren();
  appendFact(facts, "매물 종류", propertyTypes[post.propertyType] || "미입력");
  appendFact(facts, "거래 유형", dealTypes[post.dealType] || "미입력");
  appendFact(facts, "전용 면적", post.area);
  appendFact(facts, "방 개수", post.rooms);
  appendFact(facts, "욕실 개수", post.bathrooms);

  ownerActions.hidden = false;
  document.querySelector("#post-edit-link").href = `index.html?edit=${encodeURIComponent(postId)}`;
  deleteButton.onclick = async () => {
    if (!window.confirm("공개 게시판입니다. 이 게시글을 삭제할까요? 삭제한 게시글은 복구할 수 없습니다.")) return;
    try {
      await database.collection("posts").doc(postId).delete();
      window.location.href = "index.html#homes";
    } catch (error) {
      console.error("게시글 삭제에 실패했습니다.", error);
      window.alert("게시글을 삭제하지 못했습니다. Firestore 규칙을 확인해 주세요.");
    }
  };

  document.title = `${post.title || "매물 게시글"} | RealtySH`;
  postStatus.hidden = true;
  postDetail.hidden = false;
}

function connectPostPage() {
  if (!postId) {
    setPostStatus("게시글 주소가 올바르지 않습니다.");
    return;
  }

  const config = window.REALTYSH_FIREBASE_CONFIG;
  if (!config || typeof firebase === "undefined") {
    setPostStatus("Firebase 설정이 없어 게시글을 불러올 수 없습니다.");
    return;
  }

  try {
    if (firebase.apps.length === 0) firebase.initializeApp(config);
    database = firebase.firestore();
    unsubscribePost = database.collection("posts").doc(postId).onSnapshot((snapshot) => {
      renderPost(snapshot.exists ? snapshot.data() : null);
    }, (error) => {
      console.error("게시글 조회에 실패했습니다.", error);
      setPostStatus(error.code === "permission-denied"
        ? "게시글 읽기 권한이 없습니다. Firestore 규칙을 확인해 주세요."
        : "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    });

  } catch (error) {
    console.error("Firebase 초기화에 실패했습니다.", error);
    setPostStatus("Firebase 연결을 확인해 주세요.");
  }
}

window.addEventListener("pagehide", () => unsubscribePost?.());
connectPostPage();