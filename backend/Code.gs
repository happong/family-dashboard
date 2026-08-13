/* =========================================================
   가족 계모임 모듈
   - Apps Script 웹앱에서 거래내역을 불러와 표시
   - 새 내역 등록 (수입/지출)
   - 기여도 = 각 등록자의 누적 수입 / 전체 수입 총합 * 100
     (계모임에 얼마나 "보탰는지"를 보여주는 값으로 정의했습니다.
      다른 기준으로 바꾸고 싶으면 calcContribution() 함수만 고치면 됩니다.)
   ========================================================= */

// ⚠️ 여기에 본인의 Apps Script 웹 앱 URL을 붙여넣으세요.
const FINANCE_API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

let financeRows = [];

async function loadFinance() {
  const listEl = document.getElementById('finance-list');
  const statusEl = document.getElementById('finance-status');
  statusEl.textContent = '불러오는 중...';

  if (FINANCE_API_URL.startsWith('YOUR_')) {
    statusEl.textContent = 'API_URL이 아직 설정되지 않았어요 (modules/finance.js 상단 확인)';
    return;
  }

  try {
    const res = await fetch(FINANCE_API_URL);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');

    financeRows = data.rows;
    renderFinanceSummary(financeRows);
    renderFinanceList(financeRows);
    renderContribution(financeRows);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderFinanceSummary(rows) {
  const income = rows.filter(r => r['구분'] === '수입').reduce((sum, r) => sum + Number(r['금액']), 0);
  const expense = rows.filter(r => r['구분'] === '지출').reduce((sum, r) => sum + Number(r['금액']), 0);
  const balance = income - expense;

  document.getElementById('finance-income').textContent = formatWon(income);
  document.getElementById('finance-expense').textContent = formatWon(expense);
  document.getElementById('finance-balance').textContent = formatWon(balance);
}

function renderFinanceList(rows) {
  const listEl = document.getElementById('finance-list');
  if (rows.length === 0) {
    listEl.innerHTML = '<p class="placeholder-note">아직 등록된 내역이 없어요.</p>';
    return;
  }

  const sorted = [...rows].sort((a, b) => new Date(b['날짜']) - new Date(a['날짜']));

  listEl.innerHTML = sorted.map(r => `
    <div class="finance-row" data-type="${r['구분']}">
      <div class="finance-row-main">
        <span class="finance-tag" data-type="${r['구분']}">${r['구분']}</span>
        <span class="finance-item">${escapeHtml(r['항목'])}</span>
        <span class="finance-note">${escapeHtml(r['메모'] || '')}</span>
      </div>
      <div class="finance-row-side">
        <span class="finance-amount" data-type="${r['구분']}">${r['구분'] === '지출' ? '-' : '+'}${formatWon(r['금액'])}</span>
        <span class="finance-meta">${formatDate(r['날짜'])} · ${escapeHtml(r['등록자'])}</span>
      </div>
    </div>
  `).join('');
}

function renderContribution(rows) {
  const el = document.getElementById('finance-contribution');
  const incomeRows = rows.filter(r => r['구분'] === '수입');
  const total = incomeRows.reduce((sum, r) => sum + Number(r['금액']), 0);

  if (total === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 수입 내역이 없어서 기여도를 계산할 수 없어요.</p>';
    return;
  }

  const byPerson = {};
  incomeRows.forEach(r => {
    byPerson[r['등록자']] = (byPerson[r['등록자']] || 0) + Number(r['금액']);
  });

  const sortedPeople = Object.entries(byPerson).sort((a, b) => b[1] - a[1]);

  el.innerHTML = sortedPeople.map(([name, amount]) => {
    const pct = ((amount / total) * 100).toFixed(1);
    return `
      <div class="contribution-row">
        <div class="contribution-label">
          <span>${escapeHtml(name)}</span>
          <span class="contribution-pct">${pct}%</span>
        </div>
        <div class="contribution-bar-track">
          <div class="contribution-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- 새 내역 등록 ----------

function initFinanceForm() {
  const form = document.getElementById('finance-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('finance-form-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      '날짜': form.date.value,
      '구분': form.type.value,
      '항목': form.item.value,
      '금액': form.amount.value,
      '등록자': (window.currentUserName || '알 수 없음'),
      '메모': form.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';

    try {
      const res = await fetch(FINANCE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script CORS 우회용
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '등록 실패');

      statusEl.textContent = '등록됐어요.';
      form.reset();
      await loadFinance();
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---------- 유틸 ----------

function formatWon(n) {
  return Number(n).toLocaleString('ko-KR') + '원';
}

function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
