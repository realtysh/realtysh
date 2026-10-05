# 현진부동산

현진부동산 매물을 종류별로 조회하고, 관리자가 매물을 관리하며 누구나 댓글을 남길 수 있는 정적 웹사이트입니다.

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

### 댓글과 매물

매물은 누구나 읽을 수 있고, 등록·수정·삭제는 `admins/{UID}`에 등록된 관리자만 할 수 있습니다. 매물 상세 페이지에서 누구나 이름과 댓글을 등록할 수 있으며, 댓글은 공개되고 수정·삭제할 수 없습니다. 매물 사진은 공개 접근 가능한 HTTP/HTTPS 이미지 URL을 입력합니다.

## 배포

`main` 브랜치에 변경 사항을 push하면 GitHub Actions가 GitHub Pages에 자동 배포합니다. 저장소의 **Settings > Pages**에서 배포 소스가 **GitHub Actions**인지 확인하세요. 워크플로는 **Actions > Deploy to GitHub Pages**에서 실행 상태를 확인할 수 있습니다.

## 참고

매물 게시글은 사용자가 등록하며, 사진은 공개 접근 가능한 이미지 URL을 사용합니다.
