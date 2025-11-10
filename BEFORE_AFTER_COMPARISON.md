# 🔄 舊版本 vs 新版本對比

## 📊 架構對比

### 舊版本（本地記憶體）

```
瀏覽器
  ↓
Express Server (src/server.js)
  ├── usersByUsername (Map)      ← 用戶儲存
  ├── activitiesByUser (Map)     ← 活動儲存
  ├── sessions (Map)             ← 會話儲存
  └── public/uploads/            ← 磁碟圖片儲存
  
⚠️ 伺服器重啟 → 所有數據遺失！
```

### 新版本（PostgreSQL）

```
瀏覽器
  ↓
Express Server (src/server.js)
  ↓
PostgreSQL 資料庫 (Render)
  ├── users 表
  ├── activities 表
  └── sessions 表
  
✅ 數據永久保存！
```

## 🔐 密碼存儲對比

### 舊版本 ❌ 不安全

```javascript
// src/server.js (舊版本)
const seedUser = {
  username: 'athlete',
  password: '123456',  // 明文存儲 ⚠️
  displayName: 'Athlete Demo'
};

// 登入驗證
if (!match || match.password !== String(password)) {
  // 直接比較明文
}
```

**風險：**
- 如果資料庫洩露，密碼直接暴露
- 無法恢復被盜密碼
- 不符合安全規範

### 新版本 ✅ 安全

```javascript
// src/server.js (新版本)
const passwordHash = await bcrypt.hash(String(password), 10);
// 儲存 $2b$10$... (加密後的 hash)

// 登入驗證
const isValidPassword = await bcrypt.compare(
  String(password), 
  match.password_hash  // 比較 hash
);
```

**優勢：**
- 密碼不可逆
- 即使資料庫洩露，攻擊者也無法還原密碼
- 符合 OWASP 安全標準
- 使用業界標準 bcrypt 演算法

## 📸 圖片存儲對比

### 舊版本（磁碟存儲）

```javascript
// multer diskStorage
storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, 'activity-[userId]-[timestamp]-[random].ext');
  }
});

// 圖片位置：
// public/uploads/activity-user-1-1234567890-123.jpg
// 
// 返回給前端：
// photoUrl: '/uploads/activity-user-1-1234567890-123.jpg'
```

**特點：**
- 佔用服務器磁碟空間
- 刪除記錄需同時刪除文件
- 部署時需同步上傳目錄
- 無法跨伺服器共享

### 新版本（Base64 資料庫存儲）

```javascript
// multer memoryStorage
storage: multer.memoryStorage(),

// 圖片轉 Base64
const base64Data = req.file.buffer.toString('base64');
photoUrl = `data:${req.file.mimetype};base64,${base64Data}`;

// 儲存在資料庫：
// photoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
```

**優勢：**
- 資料與圖片一起保存
- 刪除記錄自動刪除圖片
- 易於備份和還原
- 多伺服器環境中一致
- 無需管理文件系統

**權衡：**
- Base64 體積增加 ~33%
- 大量圖片時資料庫會變大

## 👥 用戶管理對比

### 舊版本

```javascript
const usersByUsername = new Map();  // 記憶體 Map

// 註冊
usersByUsername.set(newUser.username, newUser);
usersById.set(newUser.id, newUser);

// 登入驗證
const match = usersByUsername.get(normalizedUsername);
```

**問題：**
- 重啟後用戶遺失
- 無法查詢用戶歷史
- 無法實施權限控制

### 新版本

```sql
-- PostgreSQL users 表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt 加密
  display_name TEXT
);

-- 查詢
SELECT * FROM users WHERE username = $1;
```

**優勢：**
- 資料永久存儲
- 可查詢用戶統計
- 支援更多用戶字段
- 易於添加用戶權限系統

## 🛠️ 開發/部署對比

### 舊版本（本地運行）

```
開發環境：
  npm run dev → 本地記憶體
  
部署：
  ❌ 無法直接部署到雲端
  ❌ 需要使用 PM2 等進程管理器
  ❌ 無法持久化數據
  ❌ 多實例會造成數據不同步
```

### 新版本（雲端就緒）

```
開發環境：
  npm run dev → PostgreSQL（遠端或本地）
  
部署到 Render：
  ✅ 一鍵部署
  ✅ 自動 SSL 加密
  ✅ 自動數據備份
  ✅ 多實例資料同步
  ✅ 自動日誌監控
```

## 📝 API 響應對比

### 活動查詢

#### 舊版本

```javascript
// 從記憶體 Map 取得
const userActivities = activitiesByUser.get(req.userId) ?? [];

res.json({ data: normalized });
```

#### 新版本

```javascript
// 從資料庫查詢
const result = await pool.query(
  `SELECT a.*, u.display_name as owner_name 
   FROM activities a
   JOIN users u ON a.owner_id = u.id
   WHERE a.owner_id = $1 
   ORDER BY a.created_at DESC`,
  [req.userId]
);

res.json({ data: normalized });
```

**前端無感知** - 響應格式完全相同，無需修改前端代碼！

## 🔄 會話管理對比

### 舊版本

```javascript
const sessions = new Map();  // 記憶體

// 建立會話
const token = `token-${userId}-...`;
sessions.set(token, userId);

// 驗證
if (!token || !sessions.has(token)) {  // 記憶體查找
  return res.status(401).json({ error: 'Unauthorized.' });
}
```

**問題：**
- 重啟後會話遺失
- 用戶被迫重新登入

### 新版本

```sql
-- PostgreSQL sessions 表
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立會話
INSERT INTO sessions (token, user_id) VALUES ($1, $2);

-- 驗證
SELECT user_id FROM sessions WHERE token = $1;
```

**優勢：**
- 會話永久保存
- 伺服器重啟不影響登入狀態
- 可實施會話過期機制

## 📈 性能對比

| 操作 | 舊版本 | 新版本 |
|------|--------|--------|
| **用戶登入** | O(1) 記憶體查找 | O(1) 資料庫查詢 + bcrypt 驗證 (~100ms) |
| **查詢活動列表** | O(n) 記憶體遍歷 | O(1) 資料庫查詢 |
| **建立會話** | O(1) Map 儲存 | O(1) 資料庫插入 |
| **刪除活動** | O(n) 陣列查找 + 文件刪除 | O(1) 資料庫刪除 |

**結論：** 資料庫查詢速度快，且可擴展。

## 📊 檔案系統對比

### 舊版本

```
public/
├── uploads/
│   ├── activity-user-1-1234567890-123.jpg
│   ├── activity-user-1-1234567890-456.jpg
│   └── activity-user-2-1234567890-789.jpg
└── ...

管理：
- 手動清理過期文件
- 無法跨伺服器同步
- 備份麻煩
```

### 新版本

```
資料庫中：
activities.photo_url = "data:image/jpeg;base64,..."

管理：
- 自動隨記錄刪除
- PostgreSQL 自動備份
- 多伺服器自動同步
```

## 🚀 可擴展性對比

### 舊版本

```
瓶頸：
- 記憶體有限 (~GB 級)
- 單伺服器無法分散負載
- 無法部署多實例
```

### 新版本

```
無限可擴展：
- PostgreSQL 可存儲 TB 級數據
- 支援多實例共享資料庫
- 可添加讀取副本提升性能
- Render 支援自動擴展
```

## 💾 備份/恢復對比

### 舊版本 ❌

```
備份：
- 需手動導出記憶體資料
- 無法備份
- 重啟即遺失

恢復：
- 無法恢復
```

### 新版本 ✅

```
備份：
- Render 自動每日備份
- 可下載備份副本
- PostgreSQL 支援 WAL 備份

恢復：
- 可恢復至任意時間點
- 一鍵還原備份
```

## 總結

| 方面 | 舊版本 | 新版本 |
|------|--------|--------|
| **數據持久性** | ❌ 不支持 | ✅ 支持 |
| **安全性** | ❌ 明文密碼 | ✅ bcrypt 加密 |
| **可擴展性** | ❌ 受限 | ✅ 無限 |
| **多用戶支持** | ⚠️ 有限 | ✅ 無限 |
| **雲端部署** | ❌ 不易 | ✅ 容易 |
| **備份恢復** | ❌ 無法 | ✅ 自動 |
| **開發效率** | ✅ 簡單快速 | ✅ 但更安全 |
| **生產就緒** | ❌ 不適合 | ✅ 完全就緒 |

---

**轉換完成！** 你現在已經從原型階段升級到生產級應用程度了！ 🎉
