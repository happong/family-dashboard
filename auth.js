/* =========================================================
   인증: Google 로그인 + 이메일 화이트리스트
   주의: 이 체크는 "클라이언트 측"이라 코드를 볼 줄 아는 사람은
   우회할 수 있습니다. 가족용으로는 충분하지만, 정말 민감한
   데이터(계좌번호 등)를 다룬다면 백엔드(Firestore 보안 규칙 등)
   에서도 같은 화이트리스트를 강제해야 합니다.
   ========================================================= */

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const loginScreen = document.getElementById('login-screen');
const appRoot = document.getElementById('app');
const loginError = document.getElementById('login-error');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');
const userPhotoEl = document.getElementById('user-photo');

googleLoginBtn.addEventListener('click', () => {
  loginError.hidden = true;
  auth.signInWithPopup(provider).catch((err) => {
    showLoginError('로그인에 실패했어요: ' + err.message);
  });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    showLogin();
    return;
  }

  const email = (user.email || '').toLowerCase();
  const isAllowed = ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email);

  if (!isAllowed) {
    showLoginError(`${user.email} 계정은 아직 등록되지 않았어요. 가족 관리자에게 요청하세요.`);
    auth.signOut();
    return;
  }

  userNameEl.textContent = user.displayName || user.email;
  userPhotoEl.src = user.photoURL || '';
  showApp();
});

function showLogin() {
  loginScreen.hidden = false;
  appRoot.hidden = true;
}

function showApp() {
  loginScreen.hidden = true;
  appRoot.hidden = false;
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.hidden = false;
}
