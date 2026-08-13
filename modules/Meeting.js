/* =========================================================
   가족회의 모듈
   - 회의 이슈(문제) 목록/등록
   - 진행도는 "로그" 방식: 새 진행도를 기록하면 최신 값이 현재 진행도
   - 논의 기록: 날짜별 논의내용 + 다음 아젠다
   - 할일: 담당자별 할일 등록, 완료 처리(완료 로그를 추가하는 방식 — 되돌리기는 없음)
   - 기여도: 완료한 할일 수 기준 (전체 이슈 통틀어 계산)
   ========================================================= */

const MEETING_API_URL = FINANCE_API_URL; // 같은 Apps Script 웹앱을 공유

let issues = [];
let selectedIssueId = null;
let allTodos = [];
let allCompletions = [];

async function loadIssues() {
  const statusEl = document.getElementById('meeting-status');
  statusEl.textContent = '불러오는 중...';

  try {
    const [issuesRes, todosRes, completionsRes] = await Promise.all([
      fetch(`${MEETING_API_URL}?type=issues`),
      fetch(`${MEETING_API_URL}?type=todos`),
      fetch(`${MEETING_API_URL}?type=todoCompletions`)
    ]);
    const issuesData = await issuesRes.json();
    const todosData = await todosRes.json();
    const completionsData = await completionsRes.json();

    if (!issuesData.ok) throw new Error(issuesData.error || '불러오기 실패');

    issues = issuesData.rows;
    allTodos = todosData.ok ? todosData.rows : [];
    allCompletions = completionsData.ok ? completionsData.rows.map(c => String(c['할일ID'])) : [];

    // 각 이슈의 최신 진행도를 미리 가져와서 카드에 표시
    await Promise.all(issues.map(async (issue) => {
      const res = await fetch(`${MEETING_API_URL}?type=progress&filterId=${encodeURIComponent(issue['이슈ID'])}`);
      const data = await res.json();
      issue._latestProgress = (data.ok && data.rows.length) ? getLatestProgress(data.rows) : 0;
    }));

    renderIssueList(issues);
    renderContributionBoard();
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function getLatestProgress(progressRows) {
  const sorted = [...progressRows].sort((a, b) => new Date(a['날짜']) - new Date(b['날짜']));
  return Number(sorted[sorted.length - 1]['진행도'] || 0);
}

function renderIssueList(list) {
  const el = document.getElementById('issue-list');
  if (list.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 등록된 회의 안건이 없어요.</p>';
    return;
  }

  el.innerHTML = list.map(issue => {
    const progress = issue._latestProgress || 0;
    return `
      <button class="issue-card ${issue['이슈ID'] === selectedIssueId ? 'is-selected' : ''}" data-issue-id="${issue['이슈ID']}">
        <span class="issue-title">${escapeMeetingHtml(issue['제목'])}</span>
        <span class="issue-desc">${escapeMeetingHtml(issue['설명'] || '')}</span>
        <span class="issue-progress-track">
          <span class="issue-progress-fill" style="width:${progress}%"></span>
        </span>
        <span class="issue-progress-label">${progress}%</span>
      </button>
    `;
  }).join('');

  el.querySelectorAll('.issue-card').forEach(card => {
    card.addEventListener('click', () => selectIssue(card.dataset.issueId));
  });
}

function selectIssue(issueId) {
  selectedIssueId = issueId;
  renderIssueList(issues);

  const issue = issues.find(i => String(i['이슈ID']) === String(issueId));
  document.getElementById('issue-panel').hidden = false;
  document.getElementById('issue-empty').hidden = true;
  document.getElementById('issue-panel-title').textContent = issue ? issue['제목'] : '';

  loadDiscussions(issueId);
  loadProgress(issueId);
  renderIssueTodos(issueId);
}

async function loadDiscussions(issueId) {
  const statusEl = document.getElementById('discussion-status');
  statusEl.textContent = '불러오는 중...';
  try {
    const res = await fetch(`${MEETING_API_URL}?type=discussions&filterId=${encodeURIComponent(issueId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');
    renderDiscussions(data.rows);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderDiscussions(rows) {
  const el = document.getElementById('discussion-list');
  if (rows.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 논의 기록이 없어요.</p>';
    return;
  }
  const sorted = [...rows].sort((a, b) => new Date(b['날짜']) - new Date(a['날짜']));
  el.innerHTML = sorted.map(r => `
    <div class="discussion-row">
      <p class="discussion-date">${formatMeetingDate(r['날짜'])}</p>
      <p class="discussion-content">${escapeMeetingHtml(r['논의내용'])}</p>
      ${r['다음아젠다'] ? `<p class="discussion-next">다음 아젠다: ${escapeMeetingHtml(r['다음아젠다'])}</p>` : ''}
    </div>
  `).join('');
}

async function loadProgress(issueId) {
  try {
    const res = await fetch(`${MEETING_API_URL}?type=progress&filterId=${encodeURIComponent(issueId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    renderProgressHistory(data.rows);
  } catch (err) {
    document.getElementById('progress-history').textContent = '불러오기 실패';
  }
}

function renderProgressHistory(rows) {
  const el = document.getElementById('progress-history');
  if (rows.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 진행도 기록이 없어요.</p>';
    return;
  }
  const sorted = [...rows].sort((a, b) => new Date(b['날짜']) - new Date(a['날짜']));
  el.innerHTML = sorted.map(r => `
    <div class="progress-log-row">
      <span class="progress-log-date">${formatMeetingDate(r['날짜'])}</span>
      <span class="progress-log-value">${r['진행도']}%</span>
      ${r['메모'] ? `<span class="progress-log-note">${escapeMeetingHtml(r['메모'])}</span>` : ''}
    </div>
  `).join('');
}

function renderIssueTodos(issueId) {
  const el = document.getElementById('todo-list');
  const todos = allTodos.filter(t => String(t['이슈ID']) === String(issueId));

  if (todos.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 등록된 할 일이 없어요.</p>';
    return;
  }

  el.innerHTML = todos.map(t => {
    const done = allCompletions.includes(String(t['할일ID']));
    return `
      <div class="todo-row ${done ? 'is-done' : ''}">
        <div class="todo-row-main">
          <span class="todo-assignee">${escapeMeetingHtml(t['담당자'])}</span>
          <span class="todo-content">${escapeMeetingHtml(t['내용'])}</span>
          ${t['마감일'] ? `<span class="todo-due">마감 ${formatMeetingDate(t['마감일'])}</span>` : ''}
        </div>
        ${done
          ? '<span class="todo-done-badge">완료</span>'
          : `<button class="btn-text todo-complete-btn" data-todo-id="${t['할일ID']}">완료 처리</button>`
        }
      </div>
    `;
  }).join('');

  el.querySelectorAll('.todo-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => completeTodo(btn.dataset.todoId));
  });
}

async function completeTodo(todoId) {
  try {
    await postToSheet({ type: 'todoCompletions', '할일ID': todoId, '완료일': new Date().toISOString().slice(0, 10) });
    allCompletions.push(String(todoId));
    renderIssueTodos(selectedIssueId);
    renderContributionBoard();
  } catch (err) {
    alert('완료 처리에 실패했어요: ' + err.message);
  }
}

function renderContributionBoard() {
  const el = document.getElementById('meeting-contribution');
  const completedTodos = allTodos.filter(t => allCompletions.includes(String(t['할일ID'])));

  if (completedTodos.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 완료된 할 일이 없어서 기여도를 계산할 수 없어요.</p>';
    return;
  }

  const byPerson = {};
  completedTodos.forEach(t => {
    byPerson[t['담당자']] = (byPerson[t['담당자']] || 0) + 1;
  });

  const total = completedTodos.length;
  const sortedPeople = Object.entries(byPerson).sort((a, b) => b[1] - a[1]);

  el.innerHTML = sortedPeople.map(([name, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    return `
      <div class="contribution-row">
        <div class="contribution-label">
          <span>${escapeMeetingHtml(name)} (완료 ${count}건)</span>
          <span class="contribution-pct">${pct}%</span>
        </div>
        <div class="contribution-bar-track">
          <div class="contribution-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- 폼 초기화 ----------

function initMeetingForms() {
  const issueForm = document.getElementById('issue-form');
  issueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('issue-form-status');
    const submitBtn = issueForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'issues',
      '이슈ID': 'I' + Date.now(),
      '제목': issueForm.title.value,
      '설명': issueForm.desc.value,
      '등록일': new Date().toISOString().slice(0, 10)
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      issueForm.reset();
      await loadIssues();
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const discussionForm = document.getElementById('discussion-form');
  discussionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedIssueId) return;
    const statusEl = document.getElementById('discussion-form-status');
    const submitBtn = discussionForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'discussions',
      '이슈ID': selectedIssueId,
      '날짜': discussionForm.date.value,
      '논의내용': discussionForm.content.value,
      '다음아젠다': discussionForm.nextAgenda.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      discussionForm.reset();
      await loadDiscussions(selectedIssueId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const progressForm = document.getElementById('progress-form');
  progressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedIssueId) return;
    const statusEl = document.getElementById('progress-form-status');
    const submitBtn = progressForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'progress',
      '이슈ID': selectedIssueId,
      '날짜': new Date().toISOString().slice(0, 10),
      '진행도': progressForm.value_.value,
      '메모': progressForm.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '기록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '기록됐어요.';
      progressForm.reset();
      await loadProgress(selectedIssueId);
      await loadIssues();
      selectIssue(selectedIssueId);
    } catch (err) {
      statusEl.textContent = '기록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const todoForm = document.getElementById('todo-form');
  todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedIssueId) return;
    const statusEl = document.getElementById('todo-form-status');
    const submitBtn = todoForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'todos',
      '할일ID': 'W' + Date.now(),
      '이슈ID': selectedIssueId,
      '담당자': todoForm.assignee.value,
      '내용': todoForm.content.value,
      '마감일': todoForm.due.value,
      '등록일': new Date().toISOString().slice(0, 10)
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      todoForm.reset();
      await loadIssues();
      renderIssueTodos(selectedIssueId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---------- 유틸 ----------

function formatMeetingDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function escapeMeetingHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
