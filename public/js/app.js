const authCard = document.querySelector('#auth-card');
const authSwitchBtns = document.querySelectorAll('.auth-switch-btn');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginMessage = document.querySelector('#login-message');
const registerMessage = document.querySelector('#register-message');
const appMain = document.querySelector('#app-main');
const headerAvatar = document.querySelector('#header-avatar');

// LocalStorage 工具函數
const Storage = {
  setAuthToken: (token) => localStorage.setItem('auth_token', token),
  getAuthToken: () => localStorage.getItem('auth_token'),
  clearAuthToken: () => localStorage.removeItem('auth_token'),
  
  setUser: (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('auth_user');
    return user ? JSON.parse(user) : null;
  },
  clearUser: () => localStorage.removeItem('auth_user'),
  
  clearAll: () => {
    Storage.clearAuthToken();
    Storage.clearUser();
  }
};

const activityForm = document.querySelector('#activity-form');
const activityMessage = document.querySelector('#activity-message');
const activityList = document.querySelector('#activity-list');
const activityListSection = document.querySelector('#activity-list-card');
const publicList = document.querySelector('#public-activity-list');
const activitySubmitButton = document.querySelector('#activity-submit');
const cancelEditButton = document.querySelector('#cancel-edit');
const activityShareCheckbox = document.querySelector('#is-public');
const dateInput = document.querySelector('#date');
const sportInput = document.querySelector('#sport');
const durationInput = document.querySelector('#duration');
const intensitySelect = document.querySelector('#intensity');
const notesInput = document.querySelector('#notes');
const photoInput = document.querySelector('#photo');
const activityFormSection = activityForm?.closest('section');
let activityFormToggleButton = null;
let activityFormBodyContainer = null;

const weatherLocation = document.querySelector('.weather-location');
const weatherTemp = document.querySelector('.weather-temp');
const weatherCondition = document.querySelector('.weather-condition');
const weatherExtra = document.querySelector('.weather-extra');
const weatherUpdated = document.querySelector('.weather-updated');

const calendarLabel = document.querySelector('#calendar-label');
const calendarDays = document.querySelector('#calendar-days');
const calendarSummary = document.querySelector('#calendar-summary');
const calendarPrevButton = document.querySelector('#calendar-prev');
const calendarNextButton = document.querySelector('#calendar-next');

const loginUsernameInput = document.querySelector('#login-username');
const loginPasswordInput = document.querySelector('#login-password');
const registerUsernameInput = document.querySelector('#register-username');
const toggleHistoryButton = document.querySelector('#toggle-history-btn');

const today = new Date();

const state = {
  token: null,
  user: null,
  weather: null,
  activities: [],
  activitiesByDate: new Map(),
  publicFeed: [],
  editingActivityId: null,
  calendarMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedCalendarDate: null
};

let authMode = 'login';
const defaultCalendarMessage = 'Select a highlighted date to see a summary.';

function setAuthMode(mode) {
  authMode = mode;
  loginForm.hidden = mode !== 'login';
  registerForm.hidden = mode !== 'register';

  const unauthenticated = !document.body.classList.contains('is-authenticated');
  if (mode === 'login') {
    setMessage(registerMessage, '', null);
    if (unauthenticated && loginUsernameInput) {
      setTimeout(() => loginUsernameInput.focus(), 0);
    }
  } else {
    setMessage(loginMessage, '', null);
    if (registerUsernameInput) {
      setTimeout(() => registerUsernameInput.focus(), 0);
    }
  }
}

function setMessage(element, text, variant) {
  if (!element) return;
  element.textContent = text;
  element.className = 'form-message';
  if (variant) {
    element.classList.add(variant);
  }
}

function setActivityFormExpanded(expanded, { focusField = false, reason = 'user' } = {}) {
  if (!activityFormSection || !activityFormToggleButton) return;

  activityFormSection.classList.toggle('is-collapsed', !expanded);
  activityFormToggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  activityFormToggleButton.classList.toggle('primary', !expanded);
  activityFormToggleButton.classList.toggle('secondary', expanded);
  if (expanded && focusField) {
    const fieldForFocus =
      reason === 'edit'
        ? sportInput || dateInput
        : dateInput || sportInput || activityForm.querySelector('input, select, textarea');
    if (fieldForFocus) {
      setTimeout(() => fieldForFocus.focus(), 0);
    }
  }
}

function initializeActivityFormToggle() {
  if (!activityForm || !activityFormSection) return;
  activityFormSection.classList.add('activity-form-card', 'is-collapsed');
  if (!activityFormSection.id) {
    activityFormSection.id = 'activity-form-card';
  }

  const header = document.createElement('div');
  header.className = 'activity-form-header';

  const heading = activityFormSection.querySelector('h2');
  if (heading) {
    header.appendChild(heading);
  }

  activityFormToggleButton = document.createElement('button');
  activityFormToggleButton.id = 'toggle-activity-form';
  activityFormToggleButton.type = 'button';
  activityFormToggleButton.className = 'primary toggle-activity-form';
  activityFormToggleButton.setAttribute('aria-expanded', 'false');
  activityFormToggleButton.setAttribute('aria-controls', 'activity-form');
  header.appendChild(activityFormToggleButton);

  activityFormBodyContainer = document.createElement('div');
  activityFormBodyContainer.className = 'activity-form-body';
  activityFormSection.insertBefore(header, activityForm);
  activityFormSection.insertBefore(activityFormBodyContainer, activityForm);
  activityFormBodyContainer.appendChild(activityForm);

  activityFormToggleButton.addEventListener('click', () => {
    const isCollapsed = activityFormSection.classList.contains('is-collapsed');
    if (isCollapsed) {
      setMessage(activityMessage, '', null);
      setActivityFormExpanded(true, { focusField: true, reason: 'create' });
      return;
    }

    if (state.editingActivityId) {
      setMessage(activityMessage, '請先完成或取消編輯後再收起表單。', 'info');
      return;
    }

    resetActivityForm();
    setActivityFormExpanded(false);
  });

  setActivityFormExpanded(false);
}

function resetActivityForm({ keepMessage = false } = {}) {
  if (activityForm) {
    activityForm.reset();
    activityForm.dataset.mode = 'create';
  }
  if (activityShareCheckbox) {
    activityShareCheckbox.checked = false;
  }
  if (photoInput) {
    photoInput.value = '';
  }
  state.editingActivityId = null;
  if (activitySubmitButton) {
    activitySubmitButton.textContent = '儲存';
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = true;
  }
  if (!keepMessage) {
    setMessage(activityMessage, '', null);
  }
}

function startEditing(activity) {
  state.editingActivityId = activity.id;
  if (activityForm) {
    activityForm.dataset.mode = 'edit';
  }
  setActivityFormExpanded(true, { focusField: true, reason: 'edit' });
  if (dateInput) {
    dateInput.value = activity.date || '';
  }
  if (sportInput) {
    sportInput.value = activity.sport || '';
  }
  if (durationInput) {
    durationInput.value = activity.durationMinutes ?? '';
  }
  if (intensitySelect) {
    intensitySelect.value = activity.intensity || 'moderate';
  }
  if (notesInput) {
    notesInput.value = activity.notes || '';
  }
  if (activityShareCheckbox) {
    activityShareCheckbox.checked = Boolean(activity.isPublic);
  }
  if (photoInput) {
    photoInput.value = '';
  }
  if (activitySubmitButton) {
    activitySubmitButton.textContent = '更新紀錄';
  }
  if (cancelEditButton) {
    cancelEditButton.hidden = false;
  }
  setMessage(
    activityMessage,
    '編輯模式：更新欄位並提交。留空照片可保持現有照片。',
    'info'
  );
  if (activityForm) {
    activityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function renderCalendar() {
  if (!calendarDays) return;
  const monthStart = getMonthStart(state.calendarMonth || today);
  state.calendarMonth = monthStart;
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const startDay = monthStart.getDay();
  const label = `${year} / ${String(month + 1).padStart(2, '0')}`;

  if (calendarLabel) {
    calendarLabel.textContent = label;
  }

  const firstVisible = new Date(year, month, 1 - startDay);
  const fragment = document.createDocumentFragment();
  const todayIso = toISODate(today);

  calendarDays.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(firstVisible);
    cellDate.setDate(firstVisible.getDate() + index);
    const iso = toISODate(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const hasActivities = state.activitiesByDate.has(iso);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.dataset.date = iso;
    const labelText = `${iso}${hasActivities ? ', has activity' : ''}`;
    button.setAttribute('aria-label', labelText);

    if (!isCurrentMonth) button.classList.add('outside');
    if (iso === todayIso) button.classList.add('today');
    if (hasActivities) button.classList.add('has-activity');
    if (state.selectedCalendarDate === iso) button.classList.add('selected');

    const numberSpan = document.createElement('span');
    numberSpan.className = 'calendar-day-number';
    numberSpan.textContent = String(cellDate.getDate());
    button.appendChild(numberSpan);

    if (hasActivities) {
      const dot = document.createElement('span');
      dot.className = 'calendar-day-dot';
      dot.setAttribute('aria-hidden', 'true');
      button.appendChild(dot);
    }

    fragment.appendChild(button);
  }

  calendarDays.appendChild(fragment);
}

function updateCalendarSummary(dateIso) {
  if (!calendarSummary) return;
  if (!dateIso) {
    calendarSummary.textContent = defaultCalendarMessage;
    return;
  }
  const activities = state.activitiesByDate.get(dateIso) ?? [];
  if (!activities.length) {
    calendarSummary.textContent = `${dateIso}: no records.`;
    return;
  }
  const previews = activities.slice(0, 3).map((activity) => {
    const duration = Number(activity.durationMinutes) || 0;
    return `${activity.sport} (${duration} min)`;
  });
  if (activities.length > 3) {
    previews.push(`…${activities.length} entries`);
  }
  calendarSummary.textContent = `${dateIso}: ${previews.join(', ')}`;
}

function changeCalendarMonth(offset) {
  const base = getMonthStart(state.calendarMonth || today);
  const next = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  state.calendarMonth = next;
  if (offset !== 0) {
    state.selectedCalendarDate = null;
  }
  renderCalendar();
  updateCalendarSummary(state.selectedCalendarDate);
}

function selectCalendarDate(dateIso) {
  const parsed = parseISODate(dateIso);
  if (!parsed) return;
  state.selectedCalendarDate = dateIso;
  state.calendarMonth = getMonthStart(parsed);
  renderCalendar();
  updateCalendarSummary(dateIso);
}

function resetCalendarView() {
  state.calendarMonth = getMonthStart(today);
  state.selectedCalendarDate = null;
  state.activitiesByDate = new Map();
  renderCalendar();
  updateCalendarSummary(null);
}

function setWeatherPlaceholder(message = 'Sign in to see weather info.') {
  weatherLocation.textContent = 'Location: --';
  weatherTemp.textContent = 'Temperature: -- °C';
  weatherCondition.textContent = `Condition: ${message}`;
  weatherExtra.textContent = 'Humidity: --  |  Wind: -- km/h';
  weatherUpdated.textContent = 'Updated: --';
}

function setWeatherLoading() {
  weatherLocation.textContent = 'Location: --';
  weatherTemp.textContent = 'Temperature: loading...';
  weatherCondition.textContent = 'Condition: please wait';
  weatherExtra.textContent = 'Humidity: --  |  Wind: -- km/h';
  weatherUpdated.textContent = 'Updated: --';
}

function renderWeather(weather) {
  if (!weather) {
    setWeatherPlaceholder();
    return;
  }
  const location = weather.location ?? '--';
  const hasTemperature = typeof weather.temperatureC === 'number';
  const hasHumidity = typeof weather.humidity === 'number';
  const hasWind = typeof weather.windKph === 'number';
  const condition = weather.summary || weather.condition || 'Weather';
  const updatedAt = weather.lastUpdated
    ? new Date(weather.lastUpdated).toLocaleString()
    : '--';

  weatherLocation.textContent = `Location: ${location}`;
  weatherTemp.textContent = `Temperature: ${hasTemperature ? weather.temperatureC : '--'} °C`;
  weatherCondition.textContent = `Condition: ${condition}`;
  weatherExtra.textContent = `Humidity: ${
    hasHumidity ? `${Math.round(weather.humidity * 100)}%` : '--'
  }  |  Wind: ${hasWind ? weather.windKph : '--'} km/h`;
  weatherUpdated.textContent = `Updated: ${updatedAt}`;
}

function applyAuthView() {
  const isAuthenticated = Boolean(state.token);
  authCard.hidden = isAuthenticated;
  appMain.hidden = !isAuthenticated;
  document.body.classList.toggle('is-authenticated', isAuthenticated);

  // 更新頭像顯示
  if (headerAvatar) {
    if (isAuthenticated && state.user) {
      // 顯示用戶頭像
      headerAvatar.style.display = 'flex';
      headerAvatar.alt = `${state.user.displayName || state.user.username} avatar`;
      // 設置預設頭像
      headerAvatar.src = '/images/profile img.png';
    } else {
      headerAvatar.style.display = 'none';
    }
  }

  // 登入後才顯示第二橫幅
  const secondaryHeader = document.querySelector('#secondary-header');
  if (secondaryHeader) {
    if (isAuthenticated) {
      secondaryHeader.hidden = false;
      // 切換到動態頁面
      switchPage('weather');
    } else {
      secondaryHeader.hidden = true;
    }
  }

  if (!isAuthenticated) {
    setWeatherPlaceholder();
    resetCalendarView();
  }
}

function logout(reason) {
  state.token = null;
  state.user = null;
  state.weather = null;
  state.activities = [];
  state.activitiesByDate = new Map();
  state.publicFeed = [];
  state.editingActivityId = null;
  Storage.clearAll();
  loginForm.reset();
  registerForm.reset();
  resetActivityForm();
  setActivityFormExpanded(false);
  resetCalendarView();
  setMessage(registerMessage, '', null);
  setMessage(loginMessage, '', null);
  if (activityListSection) {
    activityListSection.hidden = true;
  }
  if (toggleHistoryButton) {
    toggleHistoryButton.setAttribute('aria-expanded', 'false');
    toggleHistoryButton.textContent = '顯示活動歷史';
  }
  if (activityList) {
    activityList.innerHTML = '';
  }
  if (publicList) {
    publicList.innerHTML = '';
  }
  setAuthMode('login');
  applyAuthView();
  setWeatherPlaceholder();
  if (reason) {
    setMessage(loginMessage, reason, 'error');
  }
}

async function authorizedFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
  }
  if (options.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    logout('會話已過期，請重新登入。');
    throw new Error('Unauthorized');
  }
  return response;
}

const api = {
  async register(payload) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data.data;
  },

  async login(credentials) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Login failed');
    }
    return payload.data;
  },

  async getActivities() {
    const response = await authorizedFetch('/api/activities');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error('Failed to load activities');
    }
    return payload.data ?? [];
  },

  async createActivity(formData) {
    const response = await authorizedFetch('/api/activities', {
      method: 'POST',
      body: formData
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to create activity');
    }
    return payload.data;
  },

  async updateActivity(id, formData) {
    const response = await authorizedFetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: formData
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update activity');
    }
    return payload.data;
  },

  async deleteActivity(id) {
    const response = await authorizedFetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to delete activity');
    }
    return payload.data;
  },

  async getPublicActivities() {
    const response = await authorizedFetch('/api/activities/public');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load public feed');
    }
    return payload.data ?? [];
  },

  async getWeather() {
    const response = await authorizedFetch('/api/weather');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load weather');
    }
    return payload.data;
  }
};

function renderActivities(activities) {
  if (!activityList) return;
  activityList.innerHTML = '';
  if (!activities.length) {
    activityList.innerHTML = '<li>還沒有紀錄，新增你的第一個訓練課程！</li>';
    return;
  }

  for (const activity of activities) {
    const item = document.createElement('li');
    const isPublic = Boolean(activity.isPublic);
    item.innerHTML = `
      ${
        activity.photoUrl
          ? `<img class="activity-photo" src="${activity.photoUrl}" alt="${activity.sport} photo" loading="lazy" />`
          : ''
      }
      <div class="activity-header">
        <span>${activity.date}</span>
        <span>${activity.sport}</span>
      </div>
      <div class="activity-meta">
        <span>時間：${activity.durationMinutes} 分鐘</span>
        <span>強度：${activity.intensity}</span>
      </div>
      <span class="sharing-tag ${isPublic ? 'public' : 'private'}">${isPublic ? '公開' : '私人'}</span>
      ${activity.notes ? `<p class="activity-notes">${activity.notes}</p>` : ''}
      <div class="activity-actions">
        <button type="button" class="secondary small" data-action="edit" data-id="${activity.id}">編輯</button>
        <button type="button" class="danger small" data-action="delete" data-id="${activity.id}">刪除</button>
      </div>
    `;
    activityList.appendChild(item);
  }
}

function renderPublicActivities(activities) {
  if (!publicList) return;
  publicList.innerHTML = '';
  if (!activities.length) {
    publicList.innerHTML = '<li>還沒有人分享活動，成為第一個吧！</li>';
    return;
  }

  for (const activity of activities) {
    const item = document.createElement('li');
    const isPublic = Boolean(activity.isPublic);
    const ownerName = activity.ownerName || 'Anonymous';
    item.innerHTML = `
      ${
        activity.photoUrl
          ? `<img class="activity-photo" src="${activity.photoUrl}" alt="${activity.sport} photo" loading="lazy" />`
          : ''
      }
      <div class="activity-header">
        <span>${activity.date}</span>
        <span>${activity.sport}</span>
      </div>
      <div class="activity-meta">
        <span>時間：${activity.durationMinutes} 分鐘</span>
        <span>強度：${activity.intensity}</span>
      </div>
      <span class="sharing-tag ${isPublic ? 'public' : 'private'}">${isPublic ? '公開' : '私人'}</span>
      <p class="activity-owner">分享者：${ownerName}</p>
      ${activity.notes ? `<p class="activity-notes">${activity.notes}</p>` : ''}
    `;
    publicList.appendChild(item);
  }
}

async function refreshActivities() {
  if (!state.token) return;
  try {
    const activities = await api.getActivities();
    state.activities = activities;

    const byDate = new Map();
    for (const activity of activities) {
      if (!activity.date) continue;
      if (!byDate.has(activity.date)) {
        byDate.set(activity.date, []);
      }
      byDate.get(activity.date).push(activity);
    }
    state.activitiesByDate = byDate;

    if (
      state.editingActivityId &&
      !activities.some((activity) => activity.id === state.editingActivityId)
    ) {
      resetActivityForm({ keepMessage: true });
    }

    renderActivities(activities);
    renderCalendar();
    updateCalendarSummary(state.selectedCalendarDate);
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error(err);
    activityList.innerHTML = '<li class="error">Failed to load activities. Please try again.</li>';
  }
}

async function refreshPublicActivities() {
  if (!state.token || !publicList) return;
  try {
    const activities = await api.getPublicActivities();
    state.publicFeed = activities;
    renderPublicActivities(activities);
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error(err);
    publicList.innerHTML = '<li class="error">Failed to load the community feed. Please try again.</li>';
  }
}

async function refreshWeather() {
  if (!state.token) return;
  try {
    setWeatherLoading();
    const weather = await api.getWeather();
    state.weather = weather;
    renderWeather(weather);
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error(err);
    setWeatherPlaceholder('Unable to load weather data.');
  }
}

async function handleActivityListClick(event) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;
  if (!action || !id) return;

  const activity = state.activities.find((item) => item.id === id);
  if (!activity) return;

  if (action === 'edit') {
    event.preventDefault();
    startEditing(activity);
    return;
  }

  if (action === 'delete') {
    event.preventDefault();
    const confirmed = window.confirm('Delete this activity?');
    if (!confirmed) return;
    try {
      setMessage(activityMessage, 'Deleting...', null);
      await api.deleteActivity(id);
      if (state.editingActivityId === id) {
        resetActivityForm();
      }
      setMessage(activityMessage, 'Activity deleted.', 'success');
      await Promise.all([refreshActivities(), refreshPublicActivities()]);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      console.error(err);
      setMessage(
        activityMessage,
        err.message || 'Delete failed. Please try again.',
        'error'
      );
    }
  }
}

authSwitchBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode) {
      setAuthMode(btn.dataset.mode);
    }
  });
});

if (calendarPrevButton) {
  calendarPrevButton.addEventListener('click', () => changeCalendarMonth(-1));
}

// 會話恢復函數 - 在頁面加載時自動恢復登入狀態
function restoreSessionIfExists() {
  const token = Storage.getAuthToken();
  const user = Storage.getUser();
  if (token && user) {
    state.token = token;
    state.user = user;
    applyAuthView();
    // 自動刷新數據
    Promise.all([refreshActivities(), refreshPublicActivities(), refreshWeather()]).catch(err => {
      console.error('Failed to refresh data after session restore:', err);
    });
  }
}

// 頁面加載時嘗試恢復會話
restoreSessionIfExists();

if (calendarNextButton) {
  calendarNextButton.addEventListener('click', () => changeCalendarMonth(1));
}

// FAB 按鈕 - 新增紀錄
const fabButton = document.querySelector('#fab-add-record');
const floatingFormModal = document.querySelector('#floating-form-modal');
const floatingFormClose = document.querySelector('#floating-form-close');
const floatingFormCancel = document.querySelector('#floating-form-cancel');

function showFloatingForm() {
  if (floatingFormModal) {
    floatingFormModal.removeAttribute('hidden');
    // 設定日期為今天
    setDateToToday();
  }
}

function setDateToToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // getMonth() 返回 0-11
  const day = today.getDate();
  
  if (yearSlider && monthSlider && daySlider) {
    yearSlider.value = year;
    monthSlider.value = month;
    daySlider.value = day;
    updateMaxDay();
  }
}

function hideFloatingForm() {
  if (floatingFormModal) {
    floatingFormModal.setAttribute('hidden', '');
  }
}

if (fabButton) {
  fabButton.addEventListener('click', showFloatingForm);
}

if (floatingFormClose) {
  floatingFormClose.addEventListener('click', hideFloatingForm);
}

if (floatingFormCancel) {
  floatingFormCancel.addEventListener('click', hideFloatingForm);
}

// 點擊背景關閉
if (floatingFormModal) {
  floatingFormModal.addEventListener('click', (e) => {
    if (e.target === floatingFormModal) {
      hideFloatingForm();
    }
  });
}

// ========== 運動項目選擇 - Bottom Sheet =========
const sportSelectorBtn = document.querySelector('#sport-selector-btn');
const sportSelectedDisplay = document.querySelector('#sport-selected-display');
const sportFloatingInput = document.querySelector('#sport-floating');
const sportBottomSheet = document.querySelector('#sport-bottom-sheet');
const sportBottomSheetClose = document.querySelector('#sport-bottom-sheet-close');
const sportBottomSheetOverlay = document.querySelector('.sport-bottom-sheet-overlay');
const sportGrid = document.querySelector('#sport-grid');
const sportSearchInput = document.querySelector('#sport-search-input');
const sportCustomNameInput = document.querySelector('#sport-custom-name-input');
const sportCustomAddBtn = document.querySelector('#sport-custom-add-btn');

// 預設運動項目列表（按類別排序）
const defaultSports = [
  // 有氧運動
  { name: '跑步', emoji: '🏃', category: '有氧' },
  { name: '快走', emoji: '🚶', category: '有氧' },
  { name: '騎車', emoji: '🚴', category: '有氧' },
  { name: '游泳', emoji: '🏊', category: '有氧' },
  { name: '跳繩', emoji: '⛹️', category: '有氧' },
  
  // 球類運動
  { name: '籃球', emoji: '🏀', category: '球類' },
  { name: '足球', emoji: '⚽', category: '球類' },
  { name: '排球', emoji: '🏐', category: '球類' },
  { name: '網球', emoji: '🎾', category: '球類' },
  { name: '棒球', emoji: '⚾', category: '球類' },
  { name: '羽毛球', emoji: '🏸', category: '球類' },
  { name: '乒乓球', emoji: '🏓', category: '球類' },
  
  // 力量訓練
  { name: '健身', emoji: '💪', category: '力量' },
  { name: '舉重', emoji: '🏋️', category: '力量' },
  
  // 柔軟運動
  { name: '瑜伽', emoji: '🧘', category: '柔軟' },
  
  // 格鬥運動
  { name: '拳擊', emoji: '🥊', category: '格鬥' },
  { name: '跆拳道', emoji: '🥋', category: '格鬥' },
  { name: '摔跤', emoji: '🤼', category: '格鬥' },
  
  // 户外運動
  { name: '登山', emoji: '🏔️', category: '户外' },
  { name: '溜冰', emoji: '⛸️', category: '户外' },
  { name: '滑雪', emoji: '⛷️', category: '户外' },
  { name: '衝浪', emoji: '🏄', category: '户外' },
  { name: '浮潛', emoji: '🤿', category: '户外' },
  
  // 其他
  { name: '舞蹈', emoji: '💃', category: '其他' },
];

// 類別排序順序
const categoryOrder = ['有氧', '球類', '力量', '柔軟', '格鬥', '户外', '其他', '自訂'];

// 將自訂運動轉換為對象格式（用於排序）
function convertCustomSportsToObjects(customSportsArray) {
  return customSportsArray.map(name => ({
    name: name,
    category: '自訂'
  }));
}

// 按類別排序所有運動
function sortSportsByCategory(sports) {
  return sports.sort((a, b) => {
    const categoryA = typeof a === 'string' ? '自訂' : a.category;
    const categoryB = typeof b === 'string' ? '自訂' : b.category;
    
    const categoryIndexA = categoryOrder.indexOf(categoryA);
    const categoryIndexB = categoryOrder.indexOf(categoryB);
    
    // 先按類別排序
    if (categoryIndexA !== categoryIndexB) {
      return categoryIndexA - categoryIndexB;
    }
    
    // 同一類別內按名稱排序
    const nameA = typeof a === 'string' ? a : a.name;
    const nameB = typeof b === 'string' ? b : b.name;
    return nameA.localeCompare(nameB, 'zh-TW');
  });
}

// 自訂運動項目（從 localStorage 讀取）
let customSports = JSON.parse(localStorage.getItem('customSports')) || [];

// 為運動生成 emoji（自訂運動每次隨機）
function getEmojiForSport(sport) {
  // 如果是預設運動對象，返回其 emoji
  if (typeof sport === 'object' && sport.emoji) {
    return sport.emoji;
  }
  
  // 如果是自訂運動名稱（字符串），隨機生成 emoji
  if (typeof sport === 'string') {
    const defaultEmojis = ['🤾', '🎯', '🏌️', '🪂', '🚣', '🧗', '🏔️', '🎪'];
    return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
  }
  
  return '🏃'; // 默認 emoji
}

// 獲取運動名稱
function getSportName(sport) {
  return typeof sport === 'string' ? sport : sport.name;
}

// 初始化 Grid
function initSportGrid() {
  const allSports = sortSportsByCategory([...defaultSports, ...customSports]);
  sportGrid.innerHTML = allSports.map(sport => {
    const name = getSportName(sport);
    const emoji = getEmojiForSport(sport);
    return `<button type="button" class="sport-grid-item" data-name="${name}" data-emoji="${emoji}">
      <span class="sport-grid-emoji">${emoji}</span>
      <span class="sport-grid-name">${name}</span>
    </button>`;
  }).join('');

  // 綁定 Grid 項目點擊事件
  document.querySelectorAll('.sport-grid-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = btn.dataset.name;
      const emoji = btn.dataset.emoji;
      selectSport(name, emoji);
      closeSportBottomSheet();
    });
  });
}

// 打開 Bottom Sheet
if (sportSelectorBtn) {
  sportSelectorBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openSportBottomSheet();
  });
}

function openSportBottomSheet() {
  sportBottomSheet.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  initSportGrid();
}

// 關閉 Bottom Sheet
function closeSportBottomSheet() {
  sportBottomSheet.setAttribute('hidden', '');
  document.body.style.overflow = 'auto';
  sportSearchInput.value = '';
  sportCustomNameInput.value = '';
}

if (sportBottomSheetClose) {
  sportBottomSheetClose.addEventListener('click', closeSportBottomSheet);
}

if (sportBottomSheetOverlay) {
  sportBottomSheetOverlay.addEventListener('click', closeSportBottomSheet);
}

// 搜尋功能
if (sportSearchInput) {
  sportSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const gridItems = document.querySelectorAll('.sport-grid-item');
    
    gridItems.forEach(item => {
      const name = item.dataset.name.toLowerCase();
      if (name.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// 新增自訂運動
if (sportCustomAddBtn) {
  sportCustomAddBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = sportCustomNameInput.value.trim();
    
    if (name) {
      // 檢查是否已存在
      const exists = [...defaultSports, ...customSports].some(s => s.name === name);
      if (exists) {
        alert('此運動已存在');
        return;
      }
      
      // 只存入運動名稱，emoji 由系統動態生成
      customSports.push(name);
      localStorage.setItem('customSports', JSON.stringify(customSports));
      
      // 重新初始化 Grid
      initSportGrid();
      
      // 清空輸入
      sportCustomNameInput.value = '';
      
      // 動態生成 emoji（每次都是新隨機的）
      const defaultEmojis = ['🤾', '🎯', '🏌️', '🪂', '🚣', '🧗', '🏔️', '🎪'];
      const emoji = defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
      
      // 自動選擇新添加的運動
      selectSport(name, emoji);
      closeSportBottomSheet();
    }
  });
}

// 選擇運動
function selectSport(name, emoji) {
  sportFloatingInput.value = name;
  sportSelectedDisplay.textContent = name;
  
  // 更新 emoji 顯示
  const sportSelectedEmoji = document.querySelector('#sport-selected-emoji');
  if (sportSelectedEmoji) {
    sportSelectedEmoji.textContent = emoji || '🏃';
  }
  
  // 更新 Grid 選中狀態
  document.querySelectorAll('.sport-grid-item').forEach(btn => {
    if (btn.dataset.name === name) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
}


// 運動強度按鈕群組
const intensityButtons = document.querySelectorAll('#intensity-buttons .button-group-item');
const intensityInputFloating = document.querySelector('#intensity-floating');
intensityButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    intensityButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    intensityInputFloating.value = btn.dataset.value;
  });
});

// 照片上傳顯示檔名
const photoInputFloating = document.querySelector('#photo-floating');
const photoName = document.querySelector('#photo-floating-name');
const isPublicFloating = document.querySelector('#is-public-floating');
const shareTooltip = document.querySelector('#share-tooltip');
const shareToggleLabel = document.querySelector('#share-toggle-label');

// 當照片輸入發生變化時更新分享開關的狀態
photoInputFloating.addEventListener('change', function() {
  if (this.files && this.files.length > 0) {
    isPublicFloating.disabled = false; // 啟用分享開關
  } else {
    isPublicFloating.disabled = true;  // 禁用分享開關
    isPublicFloating.checked = false;  // 取消勾選
  }
});

// 當分享開關被點擊時的處理
shareToggleLabel.addEventListener('click', function(event) {
  if (isPublicFloating.disabled) {
    event.preventDefault(); // 防止切換開關狀態
    
    // 顯示提示訊息
    shareTooltip.style.display = 'block';
    
    // 3秒後自動隱藏提示
    setTimeout(() => {
      shareTooltip.style.display = 'none';
    }, 3000);
  }
});
if (photoInputFloating) {
  photoInputFloating.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      photoName.textContent = '已選擇：' + e.target.files[0].name;
    } else {
      photoName.textContent = '';
    }
  });
}

// 日期滑塊
const yearSlider = document.querySelector('#year-slider');
const monthSlider = document.querySelector('#month-slider');
const daySlider = document.querySelector('#day-slider');
const yearDisplay = document.querySelector('#year-display');
const monthDisplay = document.querySelector('#month-display');
const dayDisplay = document.querySelector('#day-display');
const dateResultDisplay = document.querySelector('#date-result-display');
const dateInputFloating = document.querySelector('#date-floating');

function updateDateDisplay() {
  const year = yearSlider.value;
  const month = monthSlider.value.padStart(2, '0');
  const day = daySlider.value.padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  yearDisplay.textContent = year;
  monthDisplay.textContent = monthSlider.value;
  dayDisplay.textContent = day;
  dateResultDisplay.textContent = dateStr;
  dateInputFloating.value = dateStr;
}

// 月份的最大天數
function updateMaxDay() {
  const year = parseInt(yearSlider.value);
  const month = parseInt(monthSlider.value);
  const daysInMonth = new Date(year, month, 0).getDate();
  daySlider.max = daysInMonth;
  
  // 如果當前日期超過該月的最大天數，調整為最大值
  if (parseInt(daySlider.value) > daysInMonth) {
    daySlider.value = daysInMonth;
  }
  updateDateDisplay();
}

if (yearSlider) yearSlider.addEventListener('input', updateDateDisplay);
if (monthSlider) monthSlider.addEventListener('input', updateMaxDay);
if (daySlider) daySlider.addEventListener('input', updateDateDisplay);

// 初始化
updateMaxDay();

if (calendarDays) {
  calendarDays.addEventListener('click', (event) => {
    const dayButton = event.target.closest('.calendar-day');
    if (!dayButton) return;
    selectCalendarDate(dayButton.dataset.date);
  });
}

initializeActivityFormToggle();

if (toggleHistoryButton && activityListSection) {
  toggleHistoryButton.addEventListener('click', () => {
    const willShow = activityListSection.hidden;
    activityListSection.hidden = !willShow;
    toggleHistoryButton.setAttribute('aria-expanded', willShow ? 'true' : 'false');
    toggleHistoryButton.textContent = willShow ? '隱藏活動歷史' : '顯示活動歷史';
  });
}

if (activityList) {
  activityList.addEventListener('click', handleActivityListClick);
}

if (cancelEditButton) {
  cancelEditButton.addEventListener('click', () => {
    resetActivityForm();
    setMessage(activityMessage, '編輯已取消。', 'info');
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const credentials = Object.fromEntries(formData.entries());
  try {
    setMessage(loginMessage, '正在登入...', null);
    const data = await api.login(credentials);
    state.token = data.token;
    state.user = data.user;
    // 保存登入信息到 localStorage
    Storage.setAuthToken(data.token);
    Storage.setUser(data.user);
    setMessage(loginMessage, '', null);
    loginForm.reset();
    applyAuthView();
    await Promise.all([refreshActivities(), refreshPublicActivities(), refreshWeather()]);
  } catch (err) {
    console.error(err);
    setMessage(loginMessage, err.message, 'error');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());
  if (payload.displayName) {
    payload.displayName = payload.displayName.trim();
  }
  const normalizedUsername = (payload.username || '').trim();
  payload.username = normalizedUsername;

  try {
    setMessage(registerMessage, 'Registering...', null);
    const data = await api.register(payload);
    const successMessage = data?.message || 'Registration successful. Please sign in.';
    registerForm.reset();
    loginForm.reset();
    loginUsernameInput.value = normalizedUsername;
    setAuthMode('login');
    setMessage(loginMessage, successMessage, 'success');
    setTimeout(() => loginPasswordInput.focus(), 0);
  } catch (err) {
    console.error(err);
    setMessage(registerMessage, err.message, 'error');
  }
});

activityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(activityForm);
  const durationValue = Number(formData.get('durationMinutes'));
  const isEditing = Boolean(state.editingActivityId);

  if (Number.isNaN(durationValue) || durationValue <= 0) {
    setMessage(activityMessage, 'Enter a valid duration (minutes).', 'error');
    return;
  }

  const sportValue = (formData.get('sport') || '').toString().trim();
  const notesValue = (formData.get('notes') || '').toString().trim();
  if (!sportValue) {
    setMessage(activityMessage, 'Enter a sport/activity.', 'error');
    return;
  }

  formData.set('durationMinutes', String(durationValue));
  formData.set('sport', sportValue);
  formData.set('notes', notesValue);
  formData.set('isPublic', activityShareCheckbox?.checked ? 'true' : 'false');

  try {
    setMessage(activityMessage, isEditing ? 'Updating...' : 'Saving...', null);
    if (isEditing) {
      await api.updateActivity(state.editingActivityId, formData);
      setMessage(activityMessage, '活動已更新。', 'success');
    } else {
      await api.createActivity(formData);
      setMessage(activityMessage, '活動已保存。', 'success');
    }
    resetActivityForm({ keepMessage: true });
    await Promise.all([refreshActivities(), refreshPublicActivities()]);
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error(err);
    setMessage(activityMessage, err.message, 'error');
  }
});

// 頁面切換函式 - 必須在 applyAuthView 之前定義
function switchPage(pageName) {
  const weatherPage = document.getElementById('weather-page');
  const checkinPage = document.getElementById('checkin-page');
  const communityPage = document.getElementById('community-page');
  const recordsPage = document.getElementById('records-page');
  const pageTabs = document.querySelectorAll('.page-tab');
  
  // 移除所有頁面的 active 類
  [weatherPage, checkinPage, communityPage, recordsPage].forEach(page => {
    page?.classList.remove('active');
  });

  // 根據頁面名稱添加 active 類
  switch(pageName) {
    case 'weather':
      weatherPage?.classList.add('active');
      break;
    case 'checkin':
      checkinPage?.classList.add('active');
      break;
    case 'community':
      communityPage?.classList.add('active');
      break;
    case 'records':
      recordsPage?.classList.add('active');
      break;
  }
  
  // 更新標籤 active 狀態
  pageTabs.forEach(tab => {
    if (tab.getAttribute('data-page') === pageName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  window.currentPage = pageName;
  console.log('切換到頁面:', pageName);
}

resetCalendarView();
resetActivityForm({ keepMessage: true });
setAuthMode('login');
applyAuthView();

// 圖片框點擊展開右側欄
const avatarButton = document.querySelector('.app-header-avatar');
const appSidebar = document.querySelector('#app-sidebar');
const logoutBtn = document.querySelector('#logout-btn');
const sidebarBackBtn = document.querySelector('#sidebar-back-btn');
const sidebarAvatar = document.querySelector('#sidebar-avatar');

if (avatarButton) {
  avatarButton.addEventListener('click', () => {
    appSidebar.classList.toggle('show');
  });
}

// 返回按鈕 - 收起右側欄
if (sidebarBackBtn) {
  sidebarBackBtn.addEventListener('click', () => {
    appSidebar.classList.remove('show');
  });
}

// 登出按鈕功能
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    Storage.clearAll();
    location.reload();
  });
}

// 同步更新側邊欄頭像
if (sidebarAvatar && headerAvatar) {
  // 初始同步
  sidebarAvatar.src = headerAvatar.src;
  
  // 監聽頭像變化
  const observer = new MutationObserver(() => {
    sidebarAvatar.src = headerAvatar.src;
  });
  
  observer.observe(headerAvatar, {
    attributes: true,
    attributeFilter: ['src']
  });
}

// 第二橫幅 - 滾動控制
const secondaryHeader = document.querySelector('#secondary-header');
let lastScrollTop = 0;
let isScrolling = false;

if (secondaryHeader) {
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > lastScrollTop + 5) {
      // 向下滾動超過5px - 隱藏第二橫幅
      secondaryHeader.classList.add('hide');
      isScrolling = true;
    } else if (currentScroll < lastScrollTop - 5) {
      // 向上滾動超過5px - 顯示第二橫幅
      secondaryHeader.classList.remove('hide');
      isScrolling = true;
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  });
}

// 頁面標籤切換
const pageTabs = document.querySelectorAll('.page-tab');

pageTabs.forEach(tab => {
  tab.addEventListener('click', function() {
    const page = this.getAttribute('data-page');
    switchPage(page);
  });
});

