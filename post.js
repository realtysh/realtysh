const postStatus = document.querySelector("#post-page-status");
const postDetail = document.querySelector("#post-detail");
const ownerActions = document.querySelector("#post-owner-actions");
const deleteButton = document.querySelector("#post-delete-button");
const commentsSection = document.querySelector("#comments-section");
const commentForm = document.querySelector("#comment-form");
const commentList = document.querySelector("#comment-list");
const commentsStatus = document.querySelector("#comments-status");
const commentFormStatus = document.querySelector("#comment-form-status");
const commentSubmit = document.querySelector("#comment-submit");
const privateComments = document.querySelector("#private-comments");
const privateCommentList = document.querySelector("#private-comment-list");
const privateCommentsStatus = document.querySelector("#private-comments-status");
const privateCommentsAdminLabel = document.querySelector("#private-comments-admin-label");
const postId = new URLSearchParams(window.location.search).get("id");
let database = null;
let auth = null;
let unsubscribePost = null;
let unsubscribeComments = null;
let unsubscribePrivateComments = null;
let isAdmin = false;
let authUser = null;
let postExists = false;

const propertyTypes = {
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

function setPostStatus(message) {
  postStatus.textContent = message;
  postStatus.hidden = false;
  postDetail.hidden = true;
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function appendImage(container, url, title, className) {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) return;
  const image = document.createElement("img");
  image.src = safeUrl;
  image.alt = title;
  image.loading = "lazy";
  image.className = className;
  container.append(image);
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

function youtubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      const videoId = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.split("/").filter(Boolean).pop();
      return videoId && /^[\w-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
    }
    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean).pop();
      return videoId && /^[\w-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

function renderPost(post) {
  if (!post) {
    postExists = false;
    setPostStatus("게시글을 찾을 수 없거나 삭제되었습니다.");
    return;
  }
  postExists = true;

  const typeTag = document.createElement("span");
  typeTag.textContent = propertyTypes[post.propertyType] || "매물";
  const dealTag = document.createElement("span");
  dealTag.textContent = dealTypes[post.dealType] || "거래";
  document.querySelector("#post-detail-tags").replaceChildren(typeTag, dealTag);
  document.querySelector("#post-detail-title").textContent = post.title || "제목 없는 게시글";
  document.querySelector("#post-detail-location").textContent = post.location || "지역 미입력";
  document.querySelector("#post-detail-description").textContent = post.description || "상세 설명이 없습니다.";
  document.querySelector("#post-detail-price").textContent = post.price || "가격 문의";

  const propertyTable = normalizePropertyTable(post.propertyTable);
  const hasPropertyTable = propertyTable.some((row) => row.some((cell) => cell.trim() !== ""));
  const propertyTableSection = document.querySelector("#post-property-table-section");
  const propertyTableBody = document.querySelector("#post-property-table");
  propertyTableBody.replaceChildren();
  propertyTableSection.hidden = !hasPropertyTable;
  if (hasPropertyTable) {
    propertyTable.forEach((row) => {
      const tableRow = document.createElement("tr");
      row.forEach((value, index) => {
        const cell = document.createElement(index % 2 === 0 ? "th" : "td");
        cell.textContent = value;
        tableRow.append(cell);
      });
      propertyTableBody.append(tableRow);
    });
  }

  const brokerTable = normalizePropertyTable(post.brokerTable);
  const hasBrokerTable = brokerTable.some((row) => row.some((cell) => cell.trim() !== ""));
  const brokerTableSection = document.querySelector("#broker-table-section");
  const brokerTableBody = document.querySelector("#post-broker-table");
  brokerTableBody.replaceChildren();
  brokerTableSection.hidden = !hasBrokerTable;
  if (hasBrokerTable) {
    brokerTable.forEach((row) => {
      const tableRow = document.createElement("tr");
      row.forEach((value, index) => {
        const cell = document.createElement(index % 2 === 0 ? "th" : "td");
        cell.textContent = value;
        tableRow.append(cell);
      });
      brokerTableBody.append(tableRow);
    });
  }

  const infoImageUrl = post.infoImageUrl || (!hasPropertyTable ? post.imageUrl : "");
  const infoImageContainer = document.querySelector("#post-info-image-container");
  const infoImage = document.querySelector("#post-info-image");
  const safeInfoImageUrl = safeImageUrl(infoImageUrl);
  infoImageContainer.hidden = hasPropertyTable || !safeInfoImageUrl;
  if (safeInfoImageUrl) {
    infoImage.src = safeInfoImageUrl;
    infoImage.alt = `${post.title || "매물"} 매물정보표`;
  } else {
    infoImage.removeAttribute("src");
  }

  const photoGallery = document.querySelector("#post-photo-gallery");
  photoGallery.replaceChildren();
  const photos = Array.isArray(post.photoUrls) ? post.photoUrls : [];
  photos.forEach((url, index) => appendImage(photoGallery, url, `${post.title || "매물"} 현장 사진 ${index + 1}`, "post-gallery-image"));
  if (!photos.length && post.imageUrl && post.imageUrl !== (post.infoImageUrl || (!hasPropertyTable ? post.imageUrl : ""))) {
    appendImage(photoGallery, post.imageUrl, `${post.title || "매물"} 사진`, "post-gallery-image");
  }

  const videoUrl = youtubeEmbedUrl(post.youtubeUrl);
  const videoSection = document.querySelector("#post-video-section");
  const video = document.querySelector("#post-video");
  videoSection.hidden = !videoUrl;
  if (videoUrl) video.src = videoUrl;
  else video.removeAttribute("src");

  ownerActions.hidden = !isAdmin;
  document.querySelector("#post-edit-link").href = `index.html?edit=${encodeURIComponent(postId)}#homes`;
  deleteButton.onclick = async () => {
    if (!isAdmin || !window.confirm("이 매물을 삭제할까요? 삭제한 매물은 복구할 수 없습니다.")) return;
    try {
      await database.collection("posts").doc(postId).delete();
      window.location.href = "index.html#homes";
    } catch (error) {
      console.error("게시글 삭제에 실패했습니다.", error);
      window.alert("게시글을 삭제하지 못했습니다. Firestore 규칙을 확인해 주세요.");
    }
  };

  document.title = `${post.title || "매물 게시글"} | 현진부동산`;
  postStatus.hidden = true;
  postDetail.hidden = false;
  commentsSection.hidden = false;
  connectPrivateComments();
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleString("ko-KR") : "방금 등록";
}

function createCommentItem(documentSnapshot, isPrivate) {
  const comment = documentSnapshot.data();
  const item = document.createElement("li");
  item.className = "comment-item";
  const heading = document.createElement("div");
  heading.className = "comment-meta";
  const author = document.createElement("strong");
  author.textContent = comment.author || comment.name || comment.nickname || "익명";
  const date = document.createElement("time");
  date.textContent = formatDate(comment.createdAt);
  heading.append(author, date);
  const message = document.createElement("p");
  message.textContent = comment.message || "";
  item.append(heading, message);

  if (isAdmin) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "comment-delete-button";
    removeButton.textContent = "댓글 삭제";
    removeButton.addEventListener("click", async () => {
      if (!window.confirm("이 댓글을 삭제할까요?")) return;
      const collection = isPrivate ? "privateComments" : "comments";
      try {
        await database.collection("posts").doc(postId).collection(collection).doc(documentSnapshot.id).delete();
      } catch (error) {
        console.error("댓글 삭제에 실패했습니다.", error);
        window.alert("댓글을 삭제하지 못했습니다. Firestore 규칙을 확인해 주세요.");
      }
    });
    item.append(removeButton);
  }
  return item;
}

function renderComments(snapshot) {
  const comments = snapshot.docs;
  commentList.replaceChildren(...comments.map((document) => createCommentItem(document, false)));
  commentsStatus.hidden = comments.length > 0;
  commentsStatus.textContent = comments.length ? "" : "아직 등록된 댓글이 없습니다.";
}

function renderPrivateComments(snapshot) {
  const comments = snapshot.docs;
  privateCommentList.replaceChildren(...comments.map((document) => createCommentItem(document, true)));
  privateComments.hidden = comments.length === 0 && !isAdmin;
  privateCommentsStatus.textContent = comments.length ? "" : "확인할 비밀댓글이 없습니다.";
}

function connectPrivateComments() {
  if (!postExists || !isAdmin || unsubscribePrivateComments) return;
  const comments = database.collection("posts").doc(postId).collection("privateComments");
  privateCommentsAdminLabel.hidden = false;
  unsubscribePrivateComments = comments.orderBy("createdAt", "desc").onSnapshot(renderPrivateComments, (error) => {
    console.error("비밀댓글 조회에 실패했습니다.", error);
    privateCommentsStatus.textContent = `비밀댓글을 불러오지 못했습니다 (${error.code || "unknown"}): ${error.message || "상세 오류가 없습니다."}`;
    privateComments.hidden = false;
  });
}

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!database || !postExists) {
    commentFormStatus.textContent = "댓글을 등록할 수 없습니다. 잠시 후 다시 시도해 주세요.";
    return;
  }
  const formData = new FormData(commentForm);
  const message = String(formData.get("message") || "").trim();
  const isSecret = formData.get("isSecret") === "on";
  if (!message) {
    commentFormStatus.textContent = "댓글 내용을 입력해 주세요.";
    return;
  }

  commentSubmit.disabled = true;
  commentFormStatus.textContent = "댓글 등록 중입니다.";
  try {
    const comment = {
      message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const collection = isSecret ? "privateComments" : "comments";
    await database.collection("posts").doc(postId).collection(collection).add(comment);
    commentForm.reset();
    commentFormStatus.textContent = isSecret
      ? "비밀댓글을 등록했습니다. 관리자만 내용을 확인할 수 있습니다."
      : "댓글을 등록했습니다.";
  } catch (error) {
    console.error("댓글 등록에 실패했습니다.", {
      code: error.code || "unknown",
      message: error.message || "상세 오류 메시지가 없습니다.",
      collection: `posts/${postId}/${isSecret ? "privateComments" : "comments"}`,
      error
    });
    const code = error.code || "unknown";
    const message = error.message || "상세 오류 메시지가 없습니다.";
    commentFormStatus.textContent = `댓글 등록에 실패했습니다 (${code}): ${message}`;
  } finally {
    commentSubmit.disabled = false;
  }
});

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
    auth = firebase.auth();
    unsubscribeComments = database.collection("posts").doc(postId).collection("comments")
      .orderBy("createdAt", "desc")
      .onSnapshot(renderComments, (error) => {
        console.error("댓글 조회에 실패했습니다.", error);
        commentsStatus.textContent = "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        commentsStatus.hidden = false;
      });
    auth.onAuthStateChanged(async (user) => {
      if (authUser?.uid !== user?.uid) {
        unsubscribePrivateComments?.();
        unsubscribePrivateComments = null;
        privateCommentList.replaceChildren();
        privateComments.hidden = true;
      }
      authUser = user;
      isAdmin = false;
      if (user && !user.isAnonymous) {
        try {
          const adminSnapshot = await database.collection("admins").doc(user.uid).get();
          if (auth.currentUser?.uid !== user.uid) return;
          isAdmin = adminSnapshot.exists;
        } catch (error) {
          console.error("관리자 권한 확인에 실패했습니다.", error);
        }
      }
      ownerActions.hidden = !isAdmin;
      if (isAdmin) {
        unsubscribePrivateComments?.();
        unsubscribePrivateComments = null;
      } else {
        privateComments.hidden = true;
      }
      connectPrivateComments();
    });
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

window.addEventListener("pagehide", () => {
  unsubscribePost?.();
  unsubscribeComments?.();
  unsubscribePrivateComments?.();
});
connectPostPage();
