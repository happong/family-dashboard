# 우리집 다이어리 (family-dashboard)

가족 계모임 · 여행 계획 · 가족회의를 관리하는 개인용 대시보드 뼈대입니다.
현재는 **화면 구조 + Google 로그인 인증**만 구현되어 있고, 각 모듈(계모임/여행/회의)의
실제 데이터 기능은 다음 단계에서 채웁니다.

## 파일 구조

```
family-dashboard/
├── index.html   # 화면 골격 (로그인 화면 + 4개 탭)
├── style.css    # 화이트/베이지 톤 디자인
├── config.js    # Firebase 설정값 + 접근 허용 이메일 목록 (직접 채워야 함)
├── auth.js      # Google 로그인 + 이메일 화이트리스트 체크
└── app.js       # 탭 전환 라우팅
```

## 셋업 방법 (Firebase Google 로그인)

1. https://console.firebase.google.com 에서 새 프로젝트 생성
2. 왼쪽 메뉴 Authentication → 로그인 방법 → **Google** 활성화
3. 프로젝트 설정(⚙️) → 일반 → "내 앱"에서 웹 앱 추가 → `firebaseConfig` 값 복사
4. `config.js`의 `firebaseConfig`에 붙여넣기
5. `config.js`의 `ALLOWED_EMAILS`에 접속을 허용할 가족 구성원 Gmail 주소 입력
6. Firebase Console → Authentication → 설정 → **승인된 도메인**에 GitHub Pages 주소
   (예: `yourname.github.io`) 추가 — 이거 안 하면 로그인 팝업이 막힙니다.

## GitHub Pages 배포

```
git init
git add .
git commit -m "family dashboard skeleton"
git remote add origin <레포 주소>
git push -u origin main
```
그 다음 레포 Settings → Pages → Branch를 `main`으로 지정하면 배포됩니다.

## ⚠️ 보안 관련 주의 (정확히 알아두어야 할 부분)

- `ALLOWED_EMAILS` 체크는 **브라우저(클라이언트) 안에서** 실행됩니다.
  즉, 개발자도구로 코드를 보면 이 목록 자체는 누구나 읽을 수 있고,
  로그인 성공 후 이 체크를 우회하는 것도 기술적으로는 가능합니다.
- 가족끼리 쓰는 용도로는 이 정도로 충분하지만, **계좌번호·주민번호 같은
  진짜 민감한 정보를 저장할 계획이라면 이 방식만으로는 부족**합니다.
  그 경우엔 데이터 저장소(Firestore 등)의 보안 규칙에서도 같은
  이메일 화이트리스트를 검사하도록 서버 쪽 규칙을 추가해야 합니다.
- `firebaseConfig`의 `apiKey`는 비밀키가 아니라 프로젝트 식별용 공개 값이라
  GitHub 공개 레포에 올려도 괜찮습니다 (Google 공식 안내 기준).

## 계모임 모듈 셋업

1. Google Sheets에서 새 스프레드시트를 만들고 시트 이름을 `거래내역`으로 변경
2. 1행에 헤더를 순서대로 입력: `날짜 | 구분 | 항목 | 금액 | 등록자 | 메모`
3. 확장 프로그램 → Apps Script → `backend/Code.gs` 내용을 그대로 붙여넣기
4. 배포 → 새 배포 → 웹 앱으로 배포 (실행 계정: 나 / 액세스: 전체 허용)
5. 배포된 웹 앱 URL을 `modules/finance.js` 맨 위 `FINANCE_API_URL`에 붙여넣기

기여도는 **각자의 누적 수입 ÷ 전체 수입 총합 × 100**으로 계산했어요.
다른 기준(예: 지출도 포함해서 계산)으로 바꾸고 싶으면 `modules/finance.js`의
`renderContribution()` 함수만 고치면 됩니다.

## 다음 단계

아래 중 무엇부터 채울지 정해주시면 이어서 만들겠습니다.
- 계모임: 수입/지출 내역, 기여도 계산
- 여행: 사전계획/실제일정, 방문 맛집 평점(재방문의사 카운트 포함), 사진 5~10장 큐레이션
- 가족회의: 문제/논의/담당자/기여도/다음 아젠다
- 알림: 할 일·일정 알림 (브라우저 알림의 한계와 대안도 함께 설명 예정)

데이터 저장은 Google Sheets + Apps Script 백엔드를 재사용하는 방식을 제안드립니다
(이미 익숙하신 스택이라 빠르게 붙일 수 있어요). 원하시면 Firestore 방식도 가능합니다.
