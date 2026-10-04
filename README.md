# RealtySH

부동산 게시글을 등록하고 조회하는 RealtySH 정적 웹사이트입니다. 매물 목록과 상세 페이지, 작성자 전용 수정·삭제 기능을 제공합니다.

## 로컬에서 보기

`index.html`을 브라우저에서 열면 됩니다. 빌드 도구나 패키지 설치는 필요하지 않습니다.

## Firebase 게시판

GitHub Actions Variables에 `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`를 설정하면 배포 시 Firebase 설정 파일을 생성합니다. 기존 설정을 지원하기 위해 같은 이름의 Actions Secrets도 읽습니다. `FIREBASE_MEASUREMENT_ID`는 선택 사항입니다. Firebase 웹 설정은 배포된 브라우저에 공개되므로 Variables 사용을 권장하고 서비스 계정 키나 기타 비밀값은 넣지 마세요.

Firebase Console에서 **Authentication > Sign-in method > Anonymous**를 활성화하고 Firestore 데이터베이스를 생성하세요. [firestore.rules](firestore.rules)의 규칙을 Firestore Rules에 게시해야 게시글을 읽고 쓸 수 있습니다.

Firestore 게시글은 공개 읽기이며 익명 인증 사용자만 등록할 수 있습니다. 수정과 삭제는 게시글 작성자만 가능합니다. 매물 사진은 공개 접근 가능한 이미지 URL을 입력합니다.

## 배포

`main` 브랜치에 변경 사항을 push하면 GitHub Actions가 GitHub Pages에 자동 배포합니다. 저장소의 **Settings > Pages**에서 배포 소스가 **GitHub Actions**인지 확인하세요. 워크플로는 **Actions > Deploy to GitHub Pages**에서 실행 상태를 확인할 수 있습니다.

## 참고

매물 게시글은 사용자가 등록하며, 사진은 공개 접근 가능한 이미지 URL을 사용합니다.
