# 현진부동산

현진부동산 매물을 블로그 글처럼 게시하고, 관리자가 사진과 정보를 관리하며 방문자가 공개 댓글 또는 비밀댓글로 문의할 수 있는 정적 웹사이트입니다.

## 로컬에서 보기

`index.html`을 브라우저에서 열면 됩니다. 빌드 도구나 패키지 설치는 필요하지 않습니다.

## Firebase 게시판

GitHub Actions Variables에 `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`를 설정하면 배포 시 Firebase 설정 파일을 생성합니다. 기존 설정을 지원하기 위해 같은 이름의 Actions Secrets도 읽습니다. `FIREBASE_MEASUREMENT_ID`는 선택 사항입니다. Firebase 웹 설정은 배포된 브라우저에 공개되므로 Variables 사용을 권장하고 서비스 계정 키나 기타 비밀값은 넣지 마세요.

Firebase Console에서 Firestore 데이터베이스를 생성하고 [firestore.rules](firestore.rules)의 규칙을 Firestore Rules에 게시하세요.

### 관리자 설정

1. Firebase Console의 **Authentication > Sign-in method**에서 이메일/비밀번호 로그인을 활성화합니다.
2. **Authentication > Users**에서 관리자 계정을 직접 생성합니다. 사이트에는 회원가입 기능이 없습니다.
3. 생성한 관리자의 UID를 복사한 뒤 Firestore에 `admins/{UID}` 문서를 직접 생성합니다. 예: `admins/AbCdEf...` 문서에 `role: "admin"` 필드를 추가합니다. 이 문서는 클라이언트에서 생성·변경할 수 없습니다.
4. 메인 화면의 **관리자 로그인**에서 해당 이메일과 비밀번호로 로그인하면 매물 추가·수정·삭제 버튼이 표시됩니다. 권한 확인은 화면뿐 아니라 Firestore 규칙에서도 적용됩니다.

### 방문자 댓글

일반 댓글과 비밀댓글 모두 방문자 로그인을 요구하지 않습니다. 비밀댓글은 댓글을 작성한 방문자도 다시 읽을 수 없고 관리자만 확인할 수 있습니다.

일반 댓글은 `posts/{postId}/comments`에 공개 저장됩니다. 비밀댓글 본문은 별도의 `posts/{postId}/privateComments`에 저장되며, Firestore 규칙은 `admins/{UID}` 관리자의 읽기만 허용합니다. 비밀댓글 컬렉션은 공개 댓글 쿼리와 분리되어 방문자가 본문을 다운로드할 수 없습니다. 관리자는 두 댓글 종류를 삭제할 수 있고, 방문자는 수정·삭제할 수 없습니다.

### 이미지 업로드 및 매물 데이터

이미지는 Firebase Storage 대신 Cloudinary unsigned upload preset을 사용해 브라우저에서 업로드합니다. 현재 사이트는 cloud name `lcrmc4u0`, preset `realtysh_upload`를 사용하며, Cloudinary preset의 asset folder는 `realtysh`로 설정되어 있어야 합니다. API Key와 API Secret은 브라우저 코드에 사용하지 않습니다. Cloudinary Console에서 unsigned preset이 활성화되어 있는지 확인하세요.

관리자는 Excel에서 매물정보 셀을 복사해 등록창의 **매물정보표** 입력란에 붙여넣습니다. 탭과 줄바꿈을 행·열 구조로 읽어 브라우저에서는 2차원 문자열 배열로 다루고, Firestore에는 배열 안에 배열을 넣을 수 없는 제한을 지키기 위해 `propertyTable: [{ cells: ["항목", "내용"] }]` 형태로 저장합니다. 새 게시글에는 별도의 편집 가능한 중개사무소 정보 기본표도 `brokerTable`로 함께 저장합니다. 기존 게시글 수정 시에는 해당 문서에 저장된 중개사무소 표를 사용하며 현재 기본값으로 덮어쓰지 않습니다. 상세 화면은 두 데이터를 실제 HTML 텍스트 표로 연속 표시합니다. 표 데이터는 이미지로 변환하거나 Cloudinary에 업로드하지 않습니다. 현장 사진만 Cloudinary로 업로드하며(각 최대 10MB, 최대 20장), 응답의 `secure_url`을 `photoUrls`로 저장하고 첫 현장 사진은 기존 `imageUrl` 대표 썸네일 필드에도 저장합니다. 기존 게시글의 이미지 필드와 `imageUrl` 기반 표시를 하위 호환하므로 예전 게시글도 계속 표시됩니다. 새 `propertyType` 값으로 `other`가 추가됩니다.

게시글 작성/수정/삭제와 이미지 업로드 화면은 기존 `admins/{UID}` 관리자 인증을 그대로 사용합니다. Cloudinary unsigned preset은 브라우저에서 호출 가능하므로 preset 제한과 업로드 정책은 Cloudinary Console에서 설정하세요. Firebase Storage는 사용하지 않습니다.

## 배포

`main` 브랜치에 변경 사항을 push하면 GitHub Actions가 GitHub Pages에 자동 배포합니다. 저장소의 **Settings > Pages**에서 배포 소스가 **GitHub Actions**인지 확인하세요. 워크플로는 **Actions > Deploy to GitHub Pages**에서 실행 상태를 확인할 수 있습니다.

## 참고

Firebase 웹 설정은 공개 클라이언트 설정이며 비밀 키가 아닙니다. 데이터 접근 통제는 Authentication과 Firestore Rules가 담당합니다.
