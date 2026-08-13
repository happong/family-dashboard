/* =========================================================
   화면 전환 로직
   각 탭 = data-view 값과 같은 id(view-xxx)를 가진 <section>을 보여줌
   다음 단계에서 실제 모듈(계모임/여행/회의)을 채울 때
   이 파일을 finance.js / travel.js / meeting.js 로 쪼개도 됩니다.
   ========================================================= */

const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');

function goToView(viewName) {
  views.forEach(v => {
    v.hidden = v.dataset.view !== viewName;
  });
  tabs.forEach(t => {
    if (t.dataset.view === viewName) {
      t.setAttribute('aria-current', 'page');
    } else {
      t.removeAttribute('aria-current');
    }
  });
  window.location.hash = viewName;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => goToView(tab.dataset.view));
});

window.addEventListener('hashchange', () => {
  const target = window.location.hash.replace('#', '') || 'home';
  goToView(target);
});

// 처음 로드 시 해시가 있으면 그 화면으로, 없으면 홈으로
window.addEventListener('DOMContentLoaded', () => {
  const initial = window.location.hash.replace('#', '') || 'home';
  goToView(initial);
});
