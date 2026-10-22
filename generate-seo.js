// generate-seo.js
// 현진부동산 Firestore 매물 -> /posts/<문서ID>.html + sitemap.xml 자동 생성
// 실행: node generate-seo.js
const fs=require("fs"), path=require("path");
const ROOT=__dirname, POSTS_DIR=path.join(ROOT,"posts");
const PROJECT_ID="realtysh-51b01", SITE="https://realtysh.com";
const FIRESTORE_URL=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/posts`;

function esc(v=""){return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function fv(v){if(!v||typeof v!=="object")return ""; if("stringValue"in v)return v.stringValue;if("integerValue"in v)return Number(v.integerValue);if("doubleValue"in v)return v.doubleValue;if("booleanValue"in v)return v.booleanValue;if("timestampValue"in v)return v.timestampValue;if("nullValue"in v)return null;if("arrayValue"in v)return(v.arrayValue.values||[]).map(fv);if("mapValue"in v)return fields(v.mapValue.fields||{});return ""}
function fields(o={}){const r={};for(const[k,v]of Object.entries(o))r[k]=fv(v);return r}
const PROPERTY_TYPES={apartment:"아파트",house:"단독주택",commercial:"상가",warehouse:"공장/창고",presale:"분양권",land:"토지",other:"기타"};
const DEAL_TYPES={sale:"매매",lease:"전세",monthly:"월세"};
function rows(v){return Array.isArray(v)?v.map(r=>Array.isArray(r)?r:(r&&Array.isArray(r.cells)?r.cells:[])).filter(r=>r.length):[]}
function pairs(table){const out=[];for(const row of rows(table)){for(let i=0;i<row.length-1;i+=2){const k=String(row[i]??"").trim(),v=String(row[i+1]??"").trim();if(k&&v)out.push([k,v])}}return out}
function publicText(p){return [p.title,p.location,PROPERTY_TYPES[p.propertyType],DEAL_TYPES[p.dealType],p.price,p.description,...pairs(p.propertyTable).flat()].filter(v=>String(v??"").trim()).join(" ").replace(/\s+/g," ").trim()}
function desc(p){const text=publicText(p);return (text||"현진부동산 매물 상세정보입니다.").slice(0,300)}
function keywords(p){return [...new Set([p.location,PROPERTY_TYPES[p.propertyType],DEAL_TYPES[p.dealType],p.title,...pairs(p.propertyTable).flatMap(([k,v])=>[k,v])].filter(Boolean).map(v=>String(v).trim()).filter(Boolean))].join(", ").slice(0,1000)}
function propertyTableHtml(p){const ps=pairs(p.propertyTable);if(!ps.length)return "";return ps.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
function jsonLd(id,p,canonical){const image=[p.representativePhotoUrl,...(Array.isArray(p.photoUrls)?p.photoUrls:[]),p.imageUrl].filter(Boolean);return JSON.stringify({"@context":"https://schema.org","@type":"RealEstateListing",name:p.title||"시흥 부동산 매물",description:desc(p),url:canonical,image,offers:{"@type":"Offer",priceSpecification:{"@type":"PriceSpecification",description:p.price||"가격 문의"}},address:p.location||"시흥시",additionalProperty:pairs(p.propertyTable).map(([name,value])=>({"@type":"PropertyValue",name,value}))}).replace(/</g,"\u003c")}

function html(id,p){
 const title=esc(p.title||"시흥 부동산 매물"), price=esc(p.price||"가격 문의"), location=esc(p.location||"시흥시"), description=esc(desc(p));
 const canonical=`${SITE}/posts/${encodeURIComponent(id)}.html`;
 const kw=esc(keywords(p)), tableHtml=propertyTableHtml(p), hasTable=Boolean(tableHtml);
 const typeName=esc(PROPERTY_TYPES[p.propertyType]||"매물"), dealName=esc(DEAL_TYPES[p.dealType]||"거래");
 const image=[p.representativePhotoUrl,...(Array.isArray(p.photoUrls)?p.photoUrls:[]),p.imageUrl].find(Boolean);
 return `<!doctype html>
<html lang="ko">
<head>
<base href="/">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f7f8f4">
<meta name="description" content="${description}">
<meta name="keywords" content="${kw}">
<title>${title} | 현진부동산</title>
<meta property="og:title" content="${title} | 현진부동산">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
${image?`<meta property="og:image" content="${esc(image)}">`:""}
<script type="application/ld+json" id="property-jsonld">${jsonLd(id,p,canonical)}</script>
<link rel="canonical" id="canonical-url" href="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css?v=__BUILD_ID__">
<link rel="stylesheet" href="posts.css?v=__BUILD_ID__">
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js" defer></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js" defer></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js" defer></script>
<script src="firebase-config.js?v=__BUILD_ID__" defer></script>
<script src="../post.js?v=__BUILD_ID__" defer></script>
</head>
<body>
<a class="skip-link" href="#main">본문으로 건너뛰기</a>
<header class="site-header"><a class="wordmark" href="index.html" aria-label="현진부동산 홈"><span class="wordmark-icon" aria-hidden="true">현</span><span>현진부동산</span></a><nav class="main-nav" aria-label="주요 메뉴"><a href="index.html#homes">매물 목록</a><a href="index.html#contact">상담 문의</a></nav></header>
<main class="post-page" id="main"><div class="post-page-shell">
<a class="post-back-link" href="index.html#homes">← 게시글 목록으로</a>
<p class="post-page-status" id="post-page-status" role="status" aria-live="polite">게시글을 불러오는 중입니다.</p>
<article class="post-detail" id="post-detail" hidden>
<div class="post-detail-heading"><div class="detail-tags" id="post-detail-tags"><span>${typeName}</span><span>${dealName}</span></div><h1 id="post-detail-title">${title}</h1><p class="post-detail-price" id="post-detail-price">${price}</p><p class="post-detail-location" id="post-detail-location">${location}</p><p class="post-detail-views" id="post-detail-views"></p><div class="post-owner-actions admin-only" id="post-owner-actions" hidden><a class="post-edit-link" id="post-edit-link" href="index.html">수정</a><button class="post-delete-button" id="post-delete-button" type="button">삭제</button></div></div>
<section class="post-property-table-section" id="post-property-table-section" aria-labelledby="post-property-table-title"${hasTable?"":" hidden"}><p class="eyebrow">PROPERTY DETAILS</p><h2 id="post-property-table-title">매물 주요정보</h2><div class="property-table-scroll"><table class="property-info-table"><tbody id="post-property-table">${tableHtml}</tbody></table></div></section>
<section class="post-property-table-section broker-table-section" id="broker-table-section" aria-labelledby="broker-table-title" hidden><p class="eyebrow">BROKER DETAILS</p><h2 id="broker-table-title">중개사무소 정보</h2><div class="property-table-scroll"><table class="property-info-table"><tbody id="post-broker-table"></tbody></table></div></section>
<figure class="post-info-image" id="post-info-image-container" hidden><img id="post-info-image" alt="매물정보표 이미지" loading="lazy"></figure>
<div class="post-photo-gallery" id="post-photo-gallery"></div>
<section class="post-description"><p class="eyebrow">PROPERTY STORY</p><h2>매물 상세 설명</h2><p id="post-detail-description">${esc(p.description||"상세 설명이 없습니다.")}</p></section>
<section class="post-video-section" id="post-video-section" hidden><p class="eyebrow">VIDEO TOUR</p><h2>영상으로 둘러보기</h2><div class="post-video-frame"><iframe id="post-video" title="매물 소개 영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></section>
</article>
<section class="comments-section" id="comments-section" aria-labelledby="comments-title" hidden><div class="comments-heading"><p class="eyebrow">YOUR THOUGHTS</p><h2 id="comments-title">문의 및 댓글</h2><p>일반 댓글은 공개되며, 비밀댓글은 관리자만 확인할 수 있습니다.</p></div><form class="comment-form" id="comment-form"><label class="post-field"><span>댓글</span><textarea name="message" required maxlength="1000" rows="4" placeholder="매물에 대해 궁금한 점을 남겨주세요."></textarea></label><label class="comment-secret-toggle"><input name="isSecret" type="checkbox"><span>비밀댓글 (관리자만 확인)</span></label><p class="comment-form-status" id="comment-form-status" role="status" aria-live="polite"></p><button class="form-submit" id="comment-submit" type="submit">댓글 등록</button></form><p class="comments-status" id="comments-status" role="status" aria-live="polite">댓글을 불러오는 중입니다.</p><ol class="comment-list" id="comment-list"></ol><div class="private-comments" id="private-comments" hidden><h3>비밀댓글 <span class="admin-only" id="private-comments-admin-label" hidden>(관리자 전용)</span></h3><p class="private-comments-status" id="private-comments-status" role="status" aria-live="polite"></p><ol class="private-comment-list" id="private-comment-list"></ol></div></section>
</div></main>
<footer class="site-footer"><a class="wordmark footer-wordmark" href="index.html"><span class="wordmark-icon" aria-hidden="true">현</span><span>현진부동산</span></a><p>매물 정보와 이미지는 현진 공인중개사사무소가 제공합니다.</p><span class="copyright">© 2026 현진 공인중개사사무소</span></footer>
</body></html>`;
}
async function allPosts(){const a=[];let token="";do{const u=new URL(FIRESTORE_URL);u.searchParams.set("pageSize","300");if(token)u.searchParams.set("pageToken",token);const r=await fetch(u);if(!r.ok)throw new Error(`Firestore 읽기 실패 (${r.status}): ${await r.text()}`);const d=await r.json();for(const doc of d.documents||[]){const id=doc.name.split("/").pop();a.push({id,...fields(doc.fields||{})})}token=d.nextPageToken||""}while(token);return a}
function sitemap(posts){const urls=[`${SITE}/`,...posts.map(p=>`${SITE}/posts/${encodeURIComponent(p.id)}.html`)];return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`}
async function main(){console.log("현진부동산 SEO 자동 생성 시작...");const posts=await allPosts();if(!posts.length)throw new Error("Firestore에서 매물을 찾지 못했습니다.");fs.mkdirSync(POSTS_DIR,{recursive:true});const keep=new Set();for(const p of posts){const f=`${p.id}.html`;keep.add(f);fs.writeFileSync(path.join(POSTS_DIR,f),html(p.id,p),"utf8")}for(const f of fs.readdirSync(POSTS_DIR)){if(f.endsWith(".html")&&!keep.has(f))fs.unlinkSync(path.join(POSTS_DIR,f))}fs.writeFileSync(path.join(ROOT,"sitemap.xml"),sitemap(posts),"utf8");console.log(`완료: ${posts.length}개 매물 SEO 페이지 생성`);console.log("완료: sitemap.xml 갱신");console.log("검토 후 Firebase Hosting을 배포하세요.")}
main().catch(e=>{console.error("\nSEO 자동 생성 실패:");console.error(e.message||e);process.exitCode=1});
