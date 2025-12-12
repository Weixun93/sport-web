/**
 * AI 聊天功能
 * 處理與 AI 助手的對話互動
 */

// 對話歷史（僅保存在記憶體中）
let chatHistory = [];

// 當前選擇的圖片
let currentImage = null;

// DOM 元素
let chatToggleBtn;
let chatWindow;
let chatCloseBtn;
let chatMessages;
let chatInput;
let chatSendBtn;
let chatImageBtn;
let chatImageInput;
let chatImagePreview;
let chatPreviewImg;
let chatRemoveImageBtn;

/**
 * 初始化 AI 聊天功能
 */
export function initAIChat() {
  // 獲取 DOM 元素
  chatToggleBtn = document.getElementById('chat-toggle');
  chatWindow = document.getElementById('chat-window');
  chatCloseBtn = document.getElementById('chat-close');
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  chatSendBtn = document.getElementById('chat-send');
  chatImageBtn = document.getElementById('chat-image-btn');
  chatImageInput = document.getElementById('chat-image-input');
  chatImagePreview = document.getElementById('chat-image-preview');
  chatPreviewImg = document.getElementById('chat-preview-img');
  chatRemoveImageBtn = document.getElementById('chat-remove-image');

  if (!chatToggleBtn || !chatWindow) {
    console.warn('AI 聊天元素未找到');
    return;
  }

  // 綁定事件
  chatToggleBtn.addEventListener('click', toggleChatWindow);
  chatCloseBtn.addEventListener('click', closeChatWindow);
  chatSendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', handleInputKeydown);
  chatImageBtn.addEventListener('click', () => chatImageInput.click());
  chatImageInput.addEventListener('change', handleImageSelect);
  chatRemoveImageBtn.addEventListener('click', removeImage);
}

/**
 * 切換聊天窗口顯示狀態
 */
function toggleChatWindow() {
  const isHidden = chatWindow.hasAttribute('hidden');
  if (isHidden) {
    chatWindow.removeAttribute('hidden');
    chatInput.focus();
  } else {
    closeChatWindow();
  }
}

/**
 * 關閉聊天窗口
 */
function closeChatWindow() {
  chatWindow.setAttribute('hidden', '');
}

/**
 * 處理輸入框按鍵事件
 */
function handleInputKeydown(e) {
  // Enter 發送訊息，Shift + Enter 換行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/**
 * 處理圖片選擇
 */
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 檢查檔案類型
  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案');
    return;
  }

  // 檢查檔案大小 (限制 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('圖片大小不能超過 5MB');
    return;
  }

  // 讀取圖片
  const reader = new FileReader();
  reader.onload = (event) => {
    currentImage = {
      data: event.target.result,
      name: file.name,
      type: file.type
    };
    
    // 顯示預覽
    chatPreviewImg.src = event.target.result;
    chatImagePreview.removeAttribute('hidden');
  };
  reader.readAsDataURL(file);
}

/**
 * 移除選擇的圖片
 */
function removeImage() {
  currentImage = null;
  chatImagePreview.setAttribute('hidden', '');
  chatImageInput.value = '';
}

/**
 * 發送訊息
 */
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message && !currentImage) return;

  // 禁用輸入
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  chatImageBtn.disabled = true;

  // 顯示使用者訊息
  appendUserMessage(message, currentImage);
  chatInput.value = '';

  // 準備訊息內容
  const userContent = {
    role: 'user',
    parts: []
  };

  // 添加文字
  if (message) {
    userContent.parts.push({ text: message });
  }

  // 添加圖片
  if (currentImage) {
    // 將 base64 轉換為 inline data
    const base64Data = currentImage.data.split(',')[1];
    userContent.parts.push({
      inlineData: {
        mimeType: currentImage.type,
        data: base64Data
      }
    });
  }

  // 添加到對話歷史
  chatHistory.push(userContent);

  // 清除圖片預覽
  const hadImage = currentImage !== null;
  removeImage();

  // 顯示載入動畫
  const loadingMessage = appendAIMessage('正在思考');
  loadingMessage.classList.add('loading');

  try {
    // 獲取 auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('未登入');
    }

    // 呼叫後端 API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        contents: chatHistory
      })
    });

    if (!response.ok) {
      throw new Error('AI 回應失敗');
    }

    const data = await response.json();
    const aiResponse = data.data.text;

    // 移除載入動畫
    loadingMessage.remove();

    // 顯示 AI 回應
    appendAIMessage(aiResponse);

    // 添加到對話歷史
    chatHistory.push({
      role: 'model',
      parts: [{ text: aiResponse }]
    });

  } catch (error) {
    console.error('AI 聊天錯誤:', error);
    loadingMessage.remove();
    appendAIMessage('抱歉，我現在無法回應。請稍後再試。');
  } finally {
    // 重新啟用輸入
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatImageBtn.disabled = false;
    chatInput.focus();
  }
}

/**
 * 添加使用者訊息到聊天區域
 */
function appendUserMessage(text, image = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'user-message';
  
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    messageDiv.appendChild(textSpan);
  }
  
  if (image) {
    const img = document.createElement('img');
    img.src = image.data;
    img.alt = '上傳的圖片';
    messageDiv.appendChild(img);
  }
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * 添加 AI 訊息到聊天區域
 */
function appendAIMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'ai-message';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-message-content';
  contentDiv.innerHTML = formatMarkdown(text);
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
  
  return messageDiv;
}

/**
 * 簡單的 Markdown 格式轉換
 */
function formatMarkdown(text) {
  if (!text) return '';
  
  // 轉義 HTML 特殊字符（防止 XSS）
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 粗體：**text** 或 __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // 斜體：*text* 或 _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // 列表項：* item 或 - item
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  
  // 包裹連續的 <li> 為 <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // 數字列表：1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // 包裹數字列表為 <ol>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('<ul>')) return match;
    return `<ol>${match}</ol>`;
  });
  
  // 換行：保留雙換行為段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  
  // 單換行轉為 <br>
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

/**
 * 滾動到聊天區域底部
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * 清空對話歷史
 */
export function clearChatHistory() {
  chatHistory = [];
  // 保留歡迎訊息，清除其他訊息
  const welcomeMessage = chatMessages.querySelector('.ai-message');
  chatMessages.innerHTML = '';
  if (welcomeMessage) {
    chatMessages.appendChild(welcomeMessage);
  }
}
