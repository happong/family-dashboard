/* =========================================================
   여기에 본인의 Firebase 프로젝트 값을 채워넣으세요.
   Firebase Console > 프로젝트 설정 > 일반 > 내 앱 에서 확인 가능합니다.
   ⚠️ apiKey는 "비밀키"가 아니라 프로젝트 식별용 공개 값이라
      GitHub에 올려도 되지만, 실제 접근 제어는 아래
      ALLOWED_EMAILS만으로는 100% 안전하지 않습니다.
      (자세한 내용은 README.md의 "보안 관련 주의" 참고)
   ========================================================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
};

// 접속을 허용할 가족 구성원의 Google 계정 이메일
const ALLOWED_EMAILS = [
   "eun1009sin@gmail.com",
  // "example1@gmail.com",
  // "example2@gmail.com",
];
