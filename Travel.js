/* =========================================================
   가족 여행 모듈 (1단계: 사전계획 + 실제일정)
   - 여행 목록 조회/등록
   - 여행 선택 시 사전계획/실제일정 일정 조회/등록
   - 맛집 평점, 사진은 다음 단계에서 추가 예정
   ========================================================= */

const TRAVEL_API_URL = FINANCE_API_URL; // 같은 Apps Script 웹앱을 공유

let trips = [];
let selectedTripId = null;

async function loadTrips() {
  const statusEl = document.getElementById('travel-status');
  statusEl.textContent = '불러오는 중...';

  if (TRAVEL_API_URL.startsWith('YOUR_')) {
    statusEl.textContent = 'API_URL이 아직 설정되지 않았어요 (modules/finance.js 상단 확인)';
    return;
  }

  try {
    const res = await fetch(`${TRAVEL_API_URL}?type=trips`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');

    trips = data.rows;
    renderTripList(trips);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderTripList(list) {
  const el = document.getElementById('trip-list');
  if (list.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 등록된 여행이 없어요.</p>';
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b['시작일']) - new Date(a['시작일']));

  el.innerHTML = sorted.map(t => `
    <button class="trip-card ${t['여행ID'] === selectedTripId ? 'is-selected' : ''}" data-trip-id="${t['여행ID']}">
      <span class="trip-status" data-status="${t['상태']}">${escapeTravelHtml(t['상태'] || '계획중')}</span>
      <span class="trip-name">${escapeTravelHtml(t['여행지'])}</span>
      <span class="trip-dates">${formatTravelDate(t['시작일'])} ~ ${formatTravelDate(t['종료일'])}</span>
    </button>
  `).join('');

  el.querySelectorAll('.trip-card').forEach(card => {
    card.addEventListener('click', () => selectTrip(card.dataset.tripId));
  });
}

function selectTrip(tripId) {
  selectedTripId = tripId;
  renderTripList(trips);

  const trip = trips.find(t => String(t['여행ID']) === String(tripId));
  document.getElementById('itinerary-panel').hidden = false;
  document.getElementById('itinerary-empty').hidden = true;
  document.getElementById('itinerary-trip-name').textContent = trip ? trip['여행지'] : '';

  loadItinerary(tripId);
  loadRestaurants(tripId);
  loadTripRatings(tripId);
  loadPhotos(tripId);
}

async function loadItinerary(tripId) {
  const statusEl = document.getElementById('itinerary-status');
  statusEl.textContent = '불러오는 중...';

  try {
    const res = await fetch(`${TRAVEL_API_URL}?type=itinerary&filterId=${encodeURIComponent(tripId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');

    renderItinerary(data.rows);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderItinerary(rows) {
  const planEl = document.getElementById('itinerary-plan-list');
  const actualEl = document.getElementById('itinerary-actual-list');

  const sortByDateTime = (a, b) => {
    const da = `${a['날짜']} ${a['시간'] || ''}`;
    const db = `${b['날짜']} ${b['시간'] || ''}`;
    return da.localeCompare(db);
  };

  const plan = rows.filter(r => r['구분'] === '사전계획').sort(sortByDateTime);
  const actual = rows.filter(r => r['구분'] === '실제일정').sort(sortByDateTime);

  planEl.innerHTML = plan.length
    ? plan.map(itineraryRowHtml).join('')
    : '<p class="placeholder-note">아직 사전계획이 없어요.</p>';

  actualEl.innerHTML = actual.length
    ? actual.map(itineraryRowHtml).join('')
    : '<p class="placeholder-note">아직 실제일정 기록이 없어요.</p>';
}

function itineraryRowHtml(r) {
  return `
    <div class="itinerary-row">
      <div class="itinerary-row-time">
        <span>${formatTravelDate(r['날짜'])}</span>
        ${r['시간'] ? `<span class="itinerary-time">${escapeTravelHtml(r['시간'])}</span>` : ''}
      </div>
      <div class="itinerary-row-main">
        <span class="itinerary-place">${escapeTravelHtml(r['장소'])}</span>
        ${r['메모'] ? `<span class="itinerary-note">${escapeTravelHtml(r['메모'])}</span>` : ''}
      </div>
    </div>
  `;
}

// ---------- 맛집 평점 ----------

async function loadRestaurants(tripId) {
  const statusEl = document.getElementById('restaurant-status');
  statusEl.textContent = '불러오는 중...';
  try {
    const res = await fetch(`${TRAVEL_API_URL}?type=restaurants&filterId=${encodeURIComponent(tripId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');
    renderRestaurants(data.rows);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderRestaurants(rows) {
  const el = document.getElementById('restaurant-list');
  if (rows.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 등록된 맛집이 없어요.</p>';
    return;
  }

  // 상점명별로 그룹핑 — 가족 여러 명이 각각 평점을 남길 수 있으므로
  const byShop = {};
  rows.forEach(r => {
    const key = r['상점명'];
    if (!byShop[key]) byShop[key] = [];
    byShop[key].push(r);
  });

  el.innerHTML = Object.entries(byShop).map(([shop, entries]) => {
    const avgRating = (entries.reduce((s, e) => s + Number(e['별점'] || 0), 0) / entries.length).toFixed(1);
    const revisitYes = entries.filter(e => e['재방문의사'] === '예').length;
    const menus = [...new Set(entries.map(e => e['메뉴']).filter(Boolean))];

    return `
      <div class="restaurant-card">
        <div class="restaurant-card-head">
          <span class="restaurant-name">${escapeTravelHtml(shop)}</span>
          <span class="restaurant-rating">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5 - Math.round(avgRating))} ${avgRating}</span>
        </div>
        ${menus.length ? `<p class="restaurant-menu">메뉴: ${menus.map(escapeTravelHtml).join(', ')}</p>` : ''}
        <p class="restaurant-revisit">재방문 의사 ${revisitYes}/${entries.length}명</p>
      </div>
    `;
  }).join('');
}

// ---------- 여행지 별점 ----------

async function loadTripRatings(tripId) {
  try {
    const res = await fetch(`${TRAVEL_API_URL}?type=tripRatings&filterId=${encodeURIComponent(tripId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');
    renderTripRating(data.rows);
  } catch (err) {
    document.getElementById('trip-rating-summary').textContent = '불러오기 실패';
  }
}

function renderTripRating(rows) {
  const el = document.getElementById('trip-rating-summary');
  if (rows.length === 0) {
    el.textContent = '아직 별점이 없어요.';
    return;
  }
  const avg = (rows.reduce((s, r) => s + Number(r['별점'] || 0), 0) / rows.length).toFixed(1);
  el.innerHTML = `${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))} <span class="trip-rating-num">${avg}</span> (${rows.length}명 참여)`;
}

// ---------- 사진/동영상 ----------

async function loadPhotos(tripId) {
  const statusEl = document.getElementById('photo-status');
  statusEl.textContent = '불러오는 중...';
  try {
    const res = await fetch(`${TRAVEL_API_URL}?type=photos&filterId=${encodeURIComponent(tripId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '불러오기 실패');
    renderPhotos(data.rows);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = '불러오는 데 실패했어요: ' + err.message;
  }
}

function renderPhotos(rows) {
  const el = document.getElementById('photo-grid');
  const countEl = document.getElementById('photo-count');
  countEl.textContent = `${rows.length}/10`;
  countEl.classList.toggle('is-over', rows.length > 10);

  if (rows.length === 0) {
    el.innerHTML = '<p class="placeholder-note">아직 등록된 사진/동영상이 없어요.</p>';
    return;
  }

  el.innerHTML = rows.map(r => `
    <a class="photo-item" href="${escapeTravelHtml(r['URL'])}" target="_blank" rel="noopener">
      <span class="photo-type">${r['유형'] === '동영상' ? '🎬' : '🖼️'}</span>
      <span class="photo-desc">${escapeTravelHtml(r['설명'] || '(설명 없음)')}</span>
    </a>
  `).join('');
}

// ---------- 폼 초기화 ----------

function initTravelForms() {
  const tripForm = document.getElementById('trip-form');
  tripForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('trip-form-status');
    const submitBtn = tripForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'trips',
      '여행ID': 'T' + Date.now(),
      '여행지': tripForm.destination.value,
      '시작일': tripForm.startDate.value,
      '종료일': tripForm.endDate.value,
      '상태': tripForm.status.value,
      '메모': tripForm.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      tripForm.reset();
      await loadTrips();
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const itineraryForm = document.getElementById('itinerary-form');
  itineraryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    const statusEl = document.getElementById('itinerary-form-status');
    const submitBtn = itineraryForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'itinerary',
      '여행ID': selectedTripId,
      '구분': itineraryForm.kind.value,
      '날짜': itineraryForm.date.value,
      '시간': itineraryForm.time.value,
      '장소': itineraryForm.place.value,
      '메모': itineraryForm.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      itineraryForm.reset();
      await loadItinerary(selectedTripId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const restaurantForm = document.getElementById('restaurant-form');
  restaurantForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    const statusEl = document.getElementById('restaurant-form-status');
    const submitBtn = restaurantForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'restaurants',
      '여행ID': selectedTripId,
      '상점명': restaurantForm.shopName.value,
      '메뉴': restaurantForm.menu.value,
      '별점': restaurantForm.rating.value,
      '등록자': (window.currentUserName || '알 수 없음'),
      '재방문의사': restaurantForm.revisit.value,
      '메모': restaurantForm.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      restaurantForm.reset();
      await loadRestaurants(selectedTripId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const tripRatingForm = document.getElementById('trip-rating-form');
  tripRatingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    const statusEl = document.getElementById('trip-rating-form-status');
    const submitBtn = tripRatingForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'tripRatings',
      '여행ID': selectedTripId,
      '등록자': (window.currentUserName || '알 수 없음'),
      '별점': tripRatingForm.rating.value,
      '메모': tripRatingForm.note.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      tripRatingForm.reset();
      await loadTripRatings(selectedTripId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const photoForm = document.getElementById('photo-form');
  photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedTripId) return;

    const statusEl = document.getElementById('photo-form-status');
    const submitBtn = photoForm.querySelector('button[type="submit"]');

    const payload = {
      type: 'photos',
      '여행ID': selectedTripId,
      'URL': photoForm.url.value,
      '설명': photoForm.desc.value,
      '유형': photoForm.kind.value
    };

    submitBtn.disabled = true;
    statusEl.textContent = '등록 중...';
    try {
      await postToSheet(payload);
      statusEl.textContent = '등록됐어요.';
      photoForm.reset();
      await loadPhotos(selectedTripId);
    } catch (err) {
      statusEl.textContent = '등록 실패: ' + err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function postToSheet(payload) {
  const res = await fetch(TRAVEL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script CORS 우회용
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '요청 실패');
  return data;
}

// ---------- 유틸 ----------

function formatTravelDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return d;
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function escapeTravelHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
