/* =========================================================
   알림 모듈

   ⚠️ 정직하게 말씀드리는 한계:
   브라우저 알림(Notification API)은 이 사이트 탭을 열어두고 있을 때만
   작동합니다. 앱을 꺼두거나 컴퓨터를 끄면 알림이 오지 않아요.
   확실한 알림이 필요하면 backend/Code.gs의 sendDailyDigest() 함수를
   Apps Script 트리거로 등록해서 매일 이메일로 받는 방식을 권장합니다
   (README 참고).

   이 모듈은:
   1) 브라우저 알림 권한 요청 + on/off 저장(localStorage)
   2) 앱이 열려있는 동안, 마감이 임박한 회의 할일 / 다가오는 여행을
      모아서 화면에 보여주고, 알림이 켜져 있으면 브라우저 알림도 띄움
   ========================================================= */

const ALERT_PREF_KEY = 'family-dashboard:notifications-enabled';

function initAlerts() {
  const toggleBtn = document.getElementById('notif-toggle-btn');
  const statusEl = document.getElementById('notif-toggle-status');

  updateToggleUI();

  toggleBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      statusEl.textContent = '이 브라우저는 알림 기능을 지원하지 않아요.';
      return;
    }

    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        statusEl.textContent = '알림 권한이 거부됐어요. 브라우저 설정에서 다시 허용할 수 있어요.';
        return;
      }
    }

    const current = localStorage.getItem(ALERT_PREF_KEY) === 'on';
    localStorage.setItem(ALERT_PREF_KEY, current ? 'off' : 'on');
    updateToggleUI();
  });

  loadUpcoming();
}

function updateToggleUI() {
  const toggleBtn = document.getElementById('notif-toggle-btn');
  const statusEl = document.getElementById('notif-toggle-status');
  const enabled = localStorage.getItem(ALERT_PREF_KEY) === 'on';

  toggleBtn.textContent = enabled ? '알림 끄기' : '알림 켜기';
  statusEl.textContent = enabled
    ? '이 탭을 열어두고 있는 동안 알림이 표시돼요.'
    : '알림이 꺼져 있어요.';
}

async function loadUpcoming() {
  const statusEl = document.getElementById('upcoming-status');
  statusEl.textContent = '불러오는 중...';

  try {
    const [tripsRes, todosRes, completionsRes] = await Promise.all([
      fetch(`${FINANCE_API_URL}?type=trips`),
      fetch(`${FINANCE_API_URL}?type=todos`),
      fetch(`${FINANCE_API_URL}?type=todoCompletions`)
    ]);
    const tripsData = await tripsRes.json();
    const todosData = await todosRes.json();
    const completionsData = await completionsRes.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7days = new Date(today);
    in7days.setDate(in7days.getDate() + 7);

    const upcomingTrips = (tripsData.ok ? tripsData.rows : []).filter(t => {
      const start = new Date(t['시작일']);
      return start >= today && start <= in7days;
    });

    const completedIds = (completionsData.ok ? completionsData.rows : []).map(c => String(c['할일ID']));
    const upcomingTodos = (todosData.ok ? todosData.rows : []).filter(t => {
      if (completedIds.includes(String(t['할일ID']))) return false;
      if (!t['마감일']) return false;
      const due = new Date(t['마감일']);
      return due <= in7days;
    });

    renderUpcoming(upcomingTrips, upcomingTodos);
    maybeNotify(upcomingTrips, upcomingTodos);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderUpcoming(trips, todos) {
  const el = document.getElementById('upcoming-list');
  const items = [
    ...trips.map(t => ({ type: '여행', label: `${t['여행지']} 출발`, date: t['시작일'] })),
    ...todos.map(t => ({ type: '할일', label: `[${t['담당자']}] ${t['내용']}`, date: t['마감일'] }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (items.length === 0) {
    el.innerHTML = '<p class="placeholder-note">앞으로 7일 안에 예정된 일정/마감이 없어요.</p>';
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="upcoming-row">
      <span class="upcoming-tag" data-type="${item.type}">${item.type}</span>
      <span class="upcoming-label">${escapeAlertHtml(item.label)}</span>
      <span class="upcoming-date">${formatAlertDate(item.date)}</span>
    </div>
  `).join('');
}

function maybeNotify(trips, todos) {
  const enabled = localStorage.getItem(ALERT_PREF_KEY) === 'on';
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return;

  const dDayTrips = trips.filter(t => isSameDay(new Date(t['시작일']), new Date()));
  const dDayTodos = todos.filter(t => t['마감일'] && isSameDay(new Date(t['마감일']), new Date()));

  dDayTrips.forEach(t => {
    new Notification('오늘 여행 출발일이에요', { body: `${t['여행지']} 여행이 오늘 시작돼요.` });
  });
  dDayTodos.forEach(t => {
    new Notification('오늘 마감인 할 일이 있어요', { body: `[${t['담당자']}] ${t['내용']}` });
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatAlertDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function escapeAlertHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
