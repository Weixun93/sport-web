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
  
  // 會話管理相關
  setSessionStartTime: (time) => sessionStorage.setItem('session_start_time', time),
  getSessionStartTime: () => sessionStorage.getItem('session_start_time'),
  setPageClosed: (closed) => sessionStorage.setItem('page_closed', closed ? 'true' : 'false'),
  getPageClosed: () => sessionStorage.getItem('page_closed') === 'true',
  setLastActivity: (time) => localStorage.setItem('last_activity', time),
  getLastActivity: () => localStorage.getItem('last_activity'),
  
  clearAll: () => {
    Storage.clearAuthToken();
    Storage.clearUser();
    Storage.setLastActivity(null);
  }
};

const activityForm = document.querySelector('#activity-form');
const activityMessage = document.querySelector('#activity-message');
const activityList = document.querySelector('#activity-list');
const activityListSection = document.querySelector('#activity-list-card');
const publicList = document.querySelector('#public-activity-list');
const activitySubmitButton = document.querySelector('#activity-submit-floating');
const cancelEditButton = document.querySelector('#floating-form-cancel');
const activityShareCheckbox = document.querySelector('#is-public-floating');
const dateInput = document.querySelector('#date');
const sportInput = document.querySelector('#sport-floating');
const durationInput = document.querySelector('#duration-floating');
const intensitySelect = document.querySelector('#intensity-floating');
const notesInput = document.querySelector('#notes-floating');
const photoInput = document.querySelector('#photo-floating');
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

// 側邊欄按鈕
const changePasswordBtn = document.querySelector('#change-password-btn');
const deleteAccountBtn = document.querySelector('#delete-account-btn');

// 對話框元素
const changePasswordModal = document.querySelector('#change-password-modal');
const deleteAccountModal = document.querySelector('#delete-account-modal');
const changePasswordForm = document.querySelector('#change-password-form');
const deleteAccountForm = document.querySelector('#delete-account-form');
const changePasswordMessage = document.querySelector('#change-password-message');
const deleteAccountMessage = document.querySelector('#delete-account-message');

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

// 會話管理器 - 處理自動登出邏輯
const SessionManager = {
  // 常數定義
  IDLE_TIMEOUT: 10 * 60 * 1000, // 10分鐘
  ACTIVITY_EVENTS: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
  
  // 狀態
  idleTimer: null,
  isInitialized: false,
  
  // 初始化會話管理
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    // 設置頁面可見性監聽器
    this.setupVisibilityListener();
    
    // 設置活動監聽器
    this.setupActivityListeners();
    
    // 設置頁面卸載監聽器
    this.setupUnloadListener();
    
    // 開始閒置計時器
    this.resetIdleTimer();
    
    console.log('🔐 SessionManager initialized');
  },
  
  // 設置頁面可見性監聽器
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 頁面隱藏時，記錄當前時間
        Storage.setLastActivity(Date.now().toString());
      } else {
        // 頁面重新顯示時，重置計時器
        this.resetIdleTimer();
      }
    });
  },
  
  // 設置用戶活動監聽器
  setupActivityListeners() {
    this.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, () => this.handleUserActivity(), { passive: true });
    });
  },
  
  // 設置頁面卸載監聽器
  setupUnloadListener() {
    window.addEventListener('beforeunload', () => {
      // 頁面關閉時標記為已關閉
      Storage.setPageClosed(true);
    });
  },
  
  // 處理用戶活動
  handleUserActivity() {
    this.resetIdleTimer();
  },
  
  // 重置閒置計時器
  resetIdleTimer() {
    // 清除現有計時器
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    // 記錄最後活動時間
    Storage.setLastActivity(Date.now().toString());
    
    // 設置新計時器
    this.idleTimer = setTimeout(() => {
      console.log('⏰ Idle timeout reached, logging out...');
      this.logoutDueToInactivity();
    }, this.IDLE_TIMEOUT);
  },
  
  // 因閒置自動登出
  logoutDueToInactivity() {
    logout('因長時間未活動，已自動登出。');
  },
  
  // 檢查是否需要因頁面關閉而登出
  checkPageCloseLogout() {
    if (Storage.getPageClosed()) {
      console.log('🚪 Page was closed, clearing session...');
      Storage.clearAll();
      Storage.setPageClosed(false); // 重置標記
      return true; // 需要登出
    }
    return false;
  },
  
  // 清理資源
  destroy() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.isInitialized = false;
  }
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
  console.log('🔄 resetActivityForm called');
  
  // 重置主表單
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
    // 清空照片檔名顯示
    const photoNameDisplay = document.querySelector('#photo-floating-name');
    if (photoNameDisplay) photoNameDisplay.textContent = '';
  
  // 重置浮動表單所有字段
  const floatingForm = document.getElementById('activity-form-floating');
  if (floatingForm) {
    floatingForm.reset();
    floatingForm.dataset.mode = 'create';
    
    // 重置所有浮動表單輸入
    const sportInputFloat = document.querySelector('#sport-floating');
    const durationInputFloat = document.querySelector('#duration-floating');
    const intensityInputFloat = document.querySelector('#intensity-floating');
    const notesInputFloat = document.querySelector('#notes-floating');
    const photoInputFloat = document.querySelector('#photo-floating');
    const isPublicFloat = document.querySelector('#is-public-floating');
    
    if (sportInputFloat) sportInputFloat.value = '';
    if (durationInputFloat) durationInputFloat.value = '';
    if (intensityInputFloat) intensityInputFloat.value = 'moderate';
    if (notesInputFloat) notesInputFloat.value = '';
    if (photoInputFloat) photoInputFloat.value = '';
    if (isPublicFloat) isPublicFloat.checked = false;
    
    // 重置運動 emoji 和顯示
    const emoji = document.querySelector('#sport-selected-emoji');
    const display = document.querySelector('#sport-selected-display');
    if (emoji) emoji.textContent = '🏃';
    if (display) display.textContent = '選擇運動';
    
    // 重置強度按鈕
    const buttons = floatingForm.querySelectorAll('.button-group-item');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === 'moderate') {
        btn.classList.add('active');
      }
    });
    
    // 重置日期滑塊為今天
    const yearSliderEl = document.querySelector('#year-slider');
    const monthSliderEl = document.querySelector('#month-slider');
    const daySliderEl = document.querySelector('#day-slider');
    
    if (yearSliderEl && monthSliderEl && daySliderEl) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      
      yearSliderEl.value = year;
      monthSliderEl.value = month;
      daySliderEl.value = day;
      
      // 更新日期顯示
      const yearDisplay = document.querySelector('#year-display');
      const monthDisplay = document.querySelector('#month-display');
      const dayDisplay = document.querySelector('#day-display');
      const dateResultDisplay = document.querySelector('#date-result-display');
      const dateField = document.querySelector('#date-floating');
      
      if (yearDisplay) yearDisplay.textContent = year;
      if (monthDisplay) monthDisplay.textContent = month;
      if (dayDisplay) dayDisplay.textContent = String(day).padStart(2, '0');
      
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateResultDisplay) dateResultDisplay.textContent = dateStr;
      if (dateField) dateField.value = dateStr;
      
      console.log('✅ Reset date sliders to today:', dateStr);
    }
  }
  
  state.editingActivityId = null;
  console.log('✅ Reset editingActivityId to null');
  
  // 重置主表單提交按鈕
  if (activitySubmitButton) {
    activitySubmitButton.textContent = '儲存';
  }
  
  // 重置浮動表單提交按鈕
  const floatingSubmitButton = document.querySelector('#activity-submit-floating');
  if (floatingSubmitButton) {
    floatingSubmitButton.textContent = '儲存';
  }
  
  if (cancelEditButton) {
    cancelEditButton.hidden = true;
  }
  
  // 重置浮動表單取消按鈕
  const floatingCancelButton = document.querySelector('#floating-form-cancel');
  if (floatingCancelButton) {
    floatingCancelButton.hidden = true;
  }
  
  if (!keepMessage) {
    setMessage(activityMessage, '', null);
  }
  
  console.log('✅ resetActivityForm completed');
}

function startEditing(activity) {
  console.log('🔧 startEditing called with activity:', activity);
  state.editingActivityId = activity.id;
  
  // 打開浮動表單（直接查詢 DOM）
  const floatingModal = document.getElementById('floating-form-modal');
  if (floatingModal) {
    console.log('✅ Opening floatingFormModal');
    floatingModal.removeAttribute('hidden');
  } else {
    console.log('❌ floatingFormModal not found');
    return;
  }
  
  // 同時更新日期滑塊
  const yearSliderEl = document.querySelector('#year-slider');
  const monthSliderEl = document.querySelector('#month-slider');
  const daySliderEl = document.querySelector('#day-slider');
  const yearDisplayEl = document.querySelector('#year-display');
  const monthDisplayEl = document.querySelector('#month-display');
  const dayDisplayEl = document.querySelector('#day-display');
  const dateResultDisplayEl = document.querySelector('#date-result-display');
  const dateField = document.querySelector('#date-floating');
  
  const dateParts = (activity.date || '').split('-');
  if (dateParts.length === 3 && yearSliderEl && monthSliderEl && daySliderEl) {
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    console.log(`✅ Setting date sliders to ${year}-${month}-${day}`);
    yearSliderEl.value = year;
    monthSliderEl.value = month;
    daySliderEl.value = day;
    
    // 手動更新顯示
    if (yearDisplayEl) yearDisplayEl.textContent = year;
    if (monthDisplayEl) monthDisplayEl.textContent = month;
    if (dayDisplayEl) dayDisplayEl.textContent = String(day).padStart(2, '0');
    if (dateResultDisplayEl) dateResultDisplayEl.textContent = activity.date;
    if (dateField) dateField.value = activity.date;
    
    updateMaxDay();
  }
  
  // 填充運動字段
  const sportField = document.querySelector('#sport-floating');
  if (sportField) {
    console.log('✅ Setting sport to:', activity.sport);
    sportField.value = activity.sport || '';
    
    // 更新 emoji 和運動名稱顯示
    // 嘗試從運動選擇器按鈕中查找對應的 emoji
    const sportButtons = document.querySelectorAll('.sport-selector-item');
    let foundEmoji = null;
    for (const btn of sportButtons) {
      if (btn.textContent.includes(activity.sport)) {
        const emojiElement = btn.querySelector('.sport-selector-emoji');
        if (emojiElement) {
          foundEmoji = emojiElement.textContent;
          break;
        }
      }
    }
    
    const emoji = document.querySelector('#sport-selected-emoji');
    if (emoji) {
      if (foundEmoji) {
        emoji.textContent = foundEmoji;
        console.log('✅ Updated sport emoji to:', foundEmoji);
      } else {
        // 如果沒找到，使用默認
        emoji.textContent = '🏃';
        console.log('⚠️ Sport emoji not found, using default');
      }
    }
    
    const sportDisplay = document.querySelector('#sport-selected-display');
    if (sportDisplay) {
      sportDisplay.textContent = activity.sport || '選擇運動';
      console.log('✅ Updated sport display to:', activity.sport);
    }
  } else {
    console.log('❌ sport field not found');
  }
  
  // 填充時間字段
  const durationField = document.querySelector('#duration-floating');
  if (durationField) {
    console.log('✅ Setting duration to:', activity.durationMinutes);
    durationField.value = activity.durationMinutes ?? '';
  } else {
    console.log('❌ duration field not found');
  }
  
  // 填充強度字段
  const intensityField = document.querySelector('#intensity-floating');
  if (intensityField) {
    console.log('✅ Setting intensity to:', activity.intensity);
    intensityField.value = activity.intensity || 'moderate';
    
    // 更新強度按鈕狀態
    const buttons = floatingModal.querySelectorAll('[data-value]');
    buttons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === (activity.intensity || 'moderate')) {
        btn.classList.add('active');
      }
    });
  } else {
    console.log('❌ intensity field not found');
  }
  
  // 填充備註字段
  const notesField = document.querySelector('#notes-floating');
  if (notesField) {
    console.log('✅ Setting notes to:', activity.notes);
    notesField.value = activity.notes || '';
  } else {
    console.log('❌ notes field not found');
  }
  
  // 填充公開狀態
  const isPublicField = document.querySelector('#is-public-floating');
  if (isPublicField) {
    console.log('✅ Setting isPublic to:', activity.isPublic);
    isPublicField.checked = Boolean(activity.isPublic);
  } else {
    console.log('❌ isPublic field not found');
  }
  
  // 清空照片字段（編輯時不載入舊照片，留空表示保持原有照片）
  const photoField = document.querySelector('#photo-floating');
  if (photoField) {
    photoField.value = '';
    console.log('✅ Cleared photo field');
  }
  
  // 顯示原有照片的提示訊息
  const photoNameDisplay = document.querySelector('#photo-floating-name');
  if (photoNameDisplay && activity.photoUrl) {
    photoNameDisplay.textContent = '原有照片將保留（可選擇新照片替換）';
    console.log('✅ Showed existing photo hint');
  }
  
  // 改變提交按鈕文本為「更新紀錄」
  const submitButton = document.querySelector('#activity-submit-floating');
  if (submitButton) {
    submitButton.textContent = '更新紀錄';
    console.log('✅ Changed submit button to "更新紀錄"');
  }
  
  // 顯示取消按鈕
  const cancelButton = document.querySelector('#floating-form-cancel');
  if (cancelButton) {
    cancelButton.hidden = false;
    console.log('✅ Showed cancel button');
  }
  
  // 顯示編輯模式訊息
  const messageEl = floatingModal.querySelector('.form-message') || activityMessage;
  if (messageEl) {
    setMessage(messageEl, '編輯模式：更新欄位並提交。留空照片可保持現有照片。', 'info');
    console.log('✅ Set edit mode message');
  }
  
  console.log('✅ startEditing completed successfully');
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

  // 更新側邊欄用戶資訊
  if (isAuthenticated && state.user) {
    const sidebarUsername = document.querySelector('#sidebar-username');
    const sidebarDisplayName = document.querySelector('#sidebar-display-name');
    
    if (sidebarUsername) {
      sidebarUsername.textContent = '用戶名稱: ' + (state.user.username || '用戶名稱');
    }
    if (sidebarDisplayName) {
      sidebarDisplayName.textContent = '顯示名稱: ' + (state.user.displayName || state.user.username || '使用者名稱');
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
  // 清理會話管理器
  SessionManager.destroy();
  
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

  async checkUsername(username) {
    const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Username check failed');
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
  },

  async changePassword(passwordData) {
    const response = await authorizedFetch('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to change password');
    }
    return payload.data;
  },

  async deleteAccount(password) {
    const response = await authorizedFetch('/api/user', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to delete account');
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
        <span>時間：${activity.durationMinutes} 分鐘</span>
      </div>
      <div class="activity-meta">
        <span>${activity.sport}</span>
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
    const isOwner = activity.isOwner; // 檢查是否為所有者
    item.innerHTML = `
      ${
        activity.photoUrl
          ? `<img class="activity-photo" src="${activity.photoUrl}" alt="${activity.sport} photo" loading="lazy" />`
          : ''
      }
      <div class="activity-header">
        <span>${activity.date}</span>
        <span>時間：${activity.durationMinutes} 分鐘</span>
      </div>
      <div class="activity-meta">
        <span>${activity.sport}</span>
        <span>強度：${activity.intensity}</span>
      </div>
      <span class="sharing-tag ${isPublic ? 'public' : 'private'}">${isPublic ? '公開' : '私人'}</span>
      <p class="activity-owner">分享者：${ownerName}</p>
      ${activity.notes ? `<p class="activity-notes">${activity.notes}</p>` : ''}
      ${isOwner ? `
        <div class="activity-actions">
          <button type="button" class="secondary small" data-action="edit" data-id="${activity.id}">編輯</button>
          <button type="button" class="danger small" data-action="delete" data-id="${activity.id}">刪除</button>
        </div>
      ` : ''}
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
  console.log('🎯 handleActivityListClick triggered', event.target, event.target.dataset);
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) {
    console.log('❌ No actionButton found');
    return;
  }

  const { action, id } = actionButton.dataset;
  console.log('📋 Action:', action, 'ID:', id);
  if (!action || !id) {
    console.log('❌ No action or id');
    return;
  }

  // 先從私人列表查找，再從社群牆查找
  let activity = state.activities.find((item) => item.id === id);
  if (!activity) {
    activity = state.publicFeed.find((item) => item.id === id);
  }
  if (!activity) {
    console.log('❌ Activity not found');
    return;
  }
  console.log('✅ Activity found:', activity);

  if (action === 'edit') {
    console.log('✏️ Starting edit mode');
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
  // 檢查是否因頁面關閉而需要清除會話
  if (SessionManager.checkPageCloseLogout()) {
    console.log('🚪 Session cleared due to page close');
    return;
  }
  
  const token = Storage.getAuthToken();
  const user = Storage.getUser();
  if (token && user) {
    // 檢查最後活動時間是否超過閒置超時
    const lastActivity = Storage.getLastActivity();
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity > SessionManager.IDLE_TIMEOUT) {
        console.log('⏰ Session expired due to idle timeout');
        Storage.clearAll();
        return;
      }
    }
    
    state.token = token;
    state.user = user;
    applyAuthView();
    
    // 初始化會話管理器
    SessionManager.init();
    
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
  console.log('🆕 showFloatingForm called');
  // 重置表單以清除編輯狀態
  resetActivityForm({ keepMessage: false });
  
  // 清空浮動表單的訊息
  const floatingMessage = document.querySelector('#floating-form-modal .form-message');
  if (floatingMessage) {
    setMessage(floatingMessage, '', null);
  }
  
  if (floatingFormModal) {
    floatingFormModal.removeAttribute('hidden');
    // 設定日期為今天
    setDateToToday();
    console.log('✅ Floating form opened for new activity, editingActivityId:', state.editingActivityId);
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
const sportInputFloating = document.querySelector('#sport-floating');
const durationInputFloating = document.querySelector('#duration-floating');
const notesInputFloating = document.querySelector('#notes-floating');
const floatingFormCancelButton = document.querySelector('#floating-form-cancel');
const activitySubmitButtonFloating = document.querySelector('#activity-submit-floating');
const floatingActivityMessage = document.querySelector('#activity-message-floating');

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
  const month = String(monthSlider.value).padStart(2, '0');
  const day = String(daySlider.value).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log('📅 updateDateDisplay:', { year, month: monthSlider.value, day: daySlider.value, dateStr });
  
  yearDisplay.textContent = year;
  monthDisplay.textContent = monthSlider.value;
  dayDisplay.textContent = day;
  dateResultDisplay.textContent = dateStr;
  if (dateInputFloating) {
    dateInputFloating.value = dateStr;
    console.log('✅ Set dateInputFloating.value to:', dateStr);
  }
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

if (publicList) {
  publicList.addEventListener('click', handleActivityListClick);
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
    // 設置會話開始時間和最後活動時間
    Storage.setSessionStartTime(Date.now().toString());
    Storage.setLastActivity(Date.now().toString());
    Storage.setPageClosed(false); // 重置頁面關閉標記
    setMessage(loginMessage, '', null);
    loginForm.reset();
    applyAuthView();
    
    // 初始化會話管理器
    SessionManager.init();
    
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

  // 檢查用戶名是否可用
  if (normalizedUsername) {
    try {
      const usernameCheck = await checkUsernameAvailability(normalizedUsername);
      if (!usernameCheck.available) {
        setMessage(registerMessage, '此用戶名已被使用，請選擇其他用戶名。', 'error');
        registerUsernameInput.focus();
        return;
      }
    } catch (err) {
      console.error('Username check error during registration:', err);
      setMessage(registerMessage, '檢查用戶名時發生錯誤，請稍後再試。', 'error');
      return;
    }
  }

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

// 共用提交處理函數
async function handleActivitySubmit(form, messageElement) {
  const formData = new FormData(form);
  
  // 確保日期格式正確
  const dateValue = formData.get('date');
  console.log('📅 Form date value:', dateValue);
  console.log('🔍 Current state.editingActivityId:', state.editingActivityId);
  
  // 驗證日期格式 YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateValue)) {
    console.error('❌ Invalid date format:', dateValue);
    setMessage(messageElement, 'Invalid date format. Please use YYYY-MM-DD.', 'error');
    return;
  }
  
  const durationValue = Number(formData.get('durationMinutes'));
  const isEditing = Boolean(state.editingActivityId);
  console.log('✏️ isEditing:', isEditing, 'editingActivityId:', state.editingActivityId);

  if (Number.isNaN(durationValue) || durationValue <= 0) {
    setMessage(messageElement, 'Enter a valid duration (minutes).', 'error');
    return;
  }

  const sportValue = (formData.get('sport') || '').toString().trim();
  const notesValue = (formData.get('notes') || '').toString().trim();
  if (!sportValue) {
    setMessage(messageElement, 'Enter a sport/activity.', 'error');
    return;
  }

  formData.set('durationMinutes', String(durationValue));
  formData.set('sport', sportValue);
  formData.set('notes', notesValue);
  formData.set('date', dateValue); // 確保日期被正確設置
  
  // 判斷要使用哪個複選框
  let isPublicValue = 'false';
  if (form.id === 'activity-form') {
    // 主表單使用 activityShareCheckbox
    isPublicValue = activityShareCheckbox?.checked ? 'true' : 'false';
  } else if (form.id === 'activity-form-floating') {
    // 浮動表單使用 is-public-floating
    const isPublicFloating = document.querySelector('#is-public-floating');
    isPublicValue = isPublicFloating?.checked ? 'true' : 'false';
  }
  formData.set('isPublic', isPublicValue);

  try {
    setMessage(messageElement, isEditing ? 'Updating...' : 'Saving...', null);
    console.log('📤 Submitting activity:', {
      date: dateValue,
      sport: sportValue,
      duration: durationValue,
      isPublic: isPublicValue,
      isEditing,
      editingId: state.editingActivityId
    });
    
    if (isEditing) {
      console.log('📝 Calling updateActivity with id:', state.editingActivityId);
      await api.updateActivity(state.editingActivityId, formData);
      setMessage(messageElement, '活動已更新。', 'success');
    } else {
      console.log('➕ Calling createActivity (new activity)');
      await api.createActivity(formData);
      setMessage(messageElement, '', null);
    }
    
    // 在重置前清除編輯狀態
    console.log('🔄 Resetting form and clearing editingActivityId...');
    resetActivityForm({ keepMessage: true });
    console.log('✅ After reset, editingActivityId:', state.editingActivityId);
    
    await Promise.all([refreshActivities(), refreshPublicActivities()]);
    
    // 關閉浮動表單
    const floatingModal = document.getElementById('floating-form-modal');
    if (floatingModal) {
      floatingModal.hidden = true;
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return;
    console.error('❌ Error:', err);
    setMessage(messageElement, err.message, 'error');
  }
}

activityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await handleActivitySubmit(activityForm, activityMessage);
});

// 為浮動表單也添加事件監聽
const floatingForm = document.getElementById('activity-form-floating');
const floatingMessage = document.querySelector('#floating-form-modal .form-message') || activityMessage;

if (floatingForm) {
  floatingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await handleActivitySubmit(floatingForm, floatingMessage);
  });
}

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

// ========== 用戶名檢查功能 ==========
// 用戶名檢查的延遲計時器
let usernameCheckTimer = null;

// 檢查用戶名是否可用
async function checkUsernameAvailability(username) {
  if (!username || username.trim().length === 0) {
    return { available: true, message: '' }; // 空用戶名視為可用
  }
  
  const trimmedUsername = username.trim();
  
  try {
    const result = await api.checkUsername(trimmedUsername);
    return {
      available: result.available,
      message: result.available ? '用戶名可用' : '此用戶名已被使用'
    };
  } catch (err) {
    console.error('Username check error:', err);
    return { available: false, message: '檢查用戶名時發生錯誤' };
  }
}

// 更新用戶名輸入框的狀態
function updateUsernameInputState(available, message) {
  const usernameGroup = registerUsernameInput?.closest('.form-group');
  if (!usernameGroup) return;
  
  // 移除現有的狀態類
  usernameGroup.classList.remove('username-available', 'username-taken', 'username-checking');
  
  if (message) {
    if (available === true) {
      usernameGroup.classList.add('username-available');
    } else if (available === false) {
      usernameGroup.classList.add('username-taken');
    } else {
      usernameGroup.classList.add('username-checking');
    }
  }
  
  // 更新或創建狀態訊息元素
  let statusElement = usernameGroup.querySelector('.username-status');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.className = 'username-status';
    registerUsernameInput.parentNode.insertBefore(statusElement, registerUsernameInput.nextSibling);
  }
  
  statusElement.textContent = message;
  statusElement.className = 'username-status';
  
  if (available === true) {
    statusElement.classList.add('available');
  } else if (available === false) {
    statusElement.classList.add('taken');
  } else {
    statusElement.classList.add('checking');
  }
}

// 用戶名輸入事件處理
function handleUsernameInput(event) {
  const username = event.target.value;
  
  // 清除之前的計時器
  if (usernameCheckTimer) {
    clearTimeout(usernameCheckTimer);
  }
  
  if (!username || username.trim().length === 0) {
    updateUsernameInputState(true, '');
    return;
  }
  
  // 顯示檢查中狀態
  updateUsernameInputState(null, '檢查中...');
  
  // 延遲檢查以避免過度請求
  usernameCheckTimer = setTimeout(async () => {
    const result = await checkUsernameAvailability(username);
    updateUsernameInputState(result.available, result.message);
  }, 500); // 500ms 延遲
}
function showChangePasswordModal() {
  if (changePasswordModal) {
    changePasswordModal.removeAttribute('hidden');
    changePasswordForm.reset();
    setMessage(changePasswordMessage, '', null);
  }
}

function hideChangePasswordModal() {
  if (changePasswordModal) {
    changePasswordModal.setAttribute('hidden', 'true');
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const formData = new FormData(changePasswordForm);
  const passwordData = Object.fromEntries(formData.entries());
  
  if (passwordData.newPassword !== passwordData.confirmPassword) {
    setMessage(changePasswordMessage, '新密碼與確認密碼不符。', 'error');
    return;
  }
  
  try {
    setMessage(changePasswordMessage, '正在修改密碼...', null);
    await api.changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
    setMessage(changePasswordMessage, '密碼修改成功！請重新登入。', 'success');
    changePasswordForm.reset();
    setTimeout(() => {
      hideChangePasswordModal();
      logout('密碼已修改，請重新登入。');
    }, 2000);
  } catch (err) {
    console.error('Change password error:', err);
    setMessage(changePasswordMessage, err.message, 'error');
  }
}

// ========== 刪除帳號功能 ==========
function showDeleteAccountModal() {
  if (deleteAccountModal) {
    deleteAccountModal.removeAttribute('hidden');
    deleteAccountForm.reset();
    setMessage(deleteAccountMessage, '', null);
  }
}

function hideDeleteAccountModal() {
  if (deleteAccountModal) {
    deleteAccountModal.setAttribute('hidden', 'true');
  }
}

async function handleDeleteAccount(event) {
  event.preventDefault();
  const formData = new FormData(deleteAccountForm);
  const password = formData.get('password');
  
  // 再次確認
  const confirmed = window.confirm('確定要刪除帳號嗎？此操作無法撤銷！');
  if (!confirmed) return;
  
  try {
    setMessage(deleteAccountMessage, '正在刪除帳號...', null);
    await api.deleteAccount(password);
    setMessage(deleteAccountMessage, '帳號已刪除。', 'success');
    deleteAccountForm.reset();
    setTimeout(() => {
      hideDeleteAccountModal();
      logout('帳號已刪除。');
    }, 2000);
  } catch (err) {
    console.error('Delete account error:', err);
    setMessage(deleteAccountMessage, err.message, 'error');
  }
}

// ========== 事件監聽器 ==========
if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', showChangePasswordModal);
}

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', showDeleteAccountModal);
}

// 用戶名檢查事件監聽器
if (registerUsernameInput) {
  registerUsernameInput.addEventListener('input', handleUsernameInput);
  registerUsernameInput.addEventListener('blur', handleUsernameInput); // 失去焦點時也檢查
}

// 對話框關閉按鈕
document.querySelectorAll('.modal-close, [id$="-close"], [id$="-cancel"]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const modalId = e.target.id.replace('-close', '').replace('-cancel', '');
    if (modalId.includes('change-password')) {
      hideChangePasswordModal();
    } else if (modalId.includes('delete-account')) {
      hideDeleteAccountModal();
    }
  });
});

// 點擊背景關閉對話框
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.setAttribute('hidden', 'true');
    }
  });
});

// 表單提交
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', handleChangePassword);
}

if (deleteAccountForm) {
  deleteAccountForm.addEventListener('submit', handleDeleteAccount);
}

