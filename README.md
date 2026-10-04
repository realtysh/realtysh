# RealtySH

부동산을 찾는 사람과 공간을 잇는 RealtySH의 정적 웹사이트입니다. 매물 검색, 관심 매물 UI, 아파트 상세 페이지를 제공하며, 매물 데이터는 화면 확인을 위한 예시입니다.

## 로컬에서 보기

`index.html`을 브라우저에서 열면 됩니다. 빌드 도구나 패키지 설치는 필요하지 않습니다.

## Firebase 관심 매물

GitHub Actions Variables에 `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`를 설정하면 배포 시 Firebase 설정 파일을 생성합니다. 기존 설정을 지원하기 위해 같은 이름의 Actions Secrets도 읽습니다. `FIREBASE_MEASUREMENT_ID`는 선택 사항입니다. Firebase 웹 설정은 배포된 브라우저에 공개되므로 Variables 사용을 권장하고 서비스 계정 키나 기타 비밀값은 넣지 마세요.

Firebase Console에서 **Authentication > Sign-in method > Anonymous**를 활성화하고 Firestore 데이터베이스를 생성하세요. [firestore.rules](firestore.rules)의 규칙을 Firestore Rules에 게시해야 사용자별 관심 매물 저장이 허용됩니다. 익명 사용자의 관심 목록은 해당 브라우저에 유지됩니다. Firebase 설정이 없거나 연결되지 않으면 기기의 브라우저 저장소를 사용합니다.

## 배포

`main` 브랜치에 변경 사항을 push하면 GitHub Actions가 GitHub Pages에 자동 배포합니다. 저장소의 **Settings > Pages**에서 배포 소스가 **GitHub Actions**인지 확인하세요. 워크플로는 **Actions > Deploy to GitHub Pages**에서 실행 상태를 확인할 수 있습니다.

## 참고

표시된 매물과 가격은 예시이며 실제 매물 정보가 아닙니다.
