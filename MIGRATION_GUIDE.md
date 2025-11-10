# PostgreSQL 遷移指南

## 📋 遷移完成情況

你的專案已成功遷移到 PostgreSQL + Render 方案。以下是主要變更：

## 🔄 主要變更

### 1. **安裝的新依賴**
```bash
npm install pg bcrypt dotenv
```

- **pg** (^8.11.3)：PostgreSQL 客戶端驅動
- **bcrypt** (^5.1.1)：密碼加密套件
- **dotenv** (^16.3.1)：環境變數管理

### 2. **新建立的檔案**

#### `.env` - 環境變數配置
```env
DATABASE_URL="postgresql://db_sport_fwj9_user:bOe4ZzqJXwKvTrrBhwsbsQzNdpwSS5uY@dpg-d45akpv5r7bs73adk1e0-a.oregon-postgres.render.com/db_sport_fwj9"
PORT=3000
NODE_ENV=development
```

#### `.gitignore` - 忽略敏感檔案
- `node_modules/`
- `.env`（保護資料庫憑證）
- `public/uploads/*`

### 3. **更新的檔案**

#### `src/server.js` - 核心變更

**已移除的功能：**
- ❌ 本地記憶體存儲（Map）
- ❌ 本地文件系統上傳（磁碟存儲）
- ❌ 明文密碼存儲

**新增的功能：**
- ✅ PostgreSQL 資料庫連接
- ✅ 自動建表初始化
- ✅ bcrypt 密碼加密
- ✅ Base64 圖片內嵌存儲
- ✅ 環境變數支持

**關鍵代碼示例：**

```javascript
// 資料庫初始化
async function initializeDatabase() {
  // 自動建立 users、activities、sessions 表
}

// 密碼加密示例
const passwordHash = await bcrypt.hash(String(password), 10);
const isValid = await bcrypt.compare(userInput, storedHash);

// 圖片存儲（Base64）
const base64Data = req.file.buffer.toString('base64');
photoUrl = `data:${req.file.mimetype};base64,${base64Data}`;
```

## 📊 資料庫架構

### 表結構

#### `users` 表
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT
);
```

#### `activities` 表
```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  sport TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  intensity TEXT DEFAULT 'moderate',
  notes TEXT,
  photo_url TEXT,                    -- Base64 編碼的圖片
  is_public BOOLEAN DEFAULT false,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sessions` 表
```sql
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 運行與部署

### 本地開發

```bash
# 安裝依賴
npm install

# 開發模式（自動重啟）
npm run dev

# 生產模式
npm start
```

### 生產環境部署（Render）

1. **推送至 GitHub**
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL"
   git push origin main
   ```

2. **在 Render 上設置環境變數**
   - 進入 Service Settings
   - 在 Environment 中設置：
     - `DATABASE_URL`：你的 Render PostgreSQL URL
     - `NODE_ENV`：production
     - `PORT`：3000（Render 會自動配置）

3. **部署新版本**
   - Render 會自動偵測 GitHub push
   - 自動執行 `npm install` 和啟動伺服器

## 🔐 安全性改進

### 密碼管理
```javascript
// 舊方式（✗ 不安全）
password: '123456'  // 明文存儲

// 新方式（✓ 安全）
password_hash: '$2b$10$...'  // bcrypt 加密
```

### 環境變數保護
- 敏感資訊（如資料庫密碼）存儲在 `.env`
- `.env` 已加入 `.gitignore`，不會被提交至版本控制

### SSL 連接
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction 
    ? false                           // Render 內部連線
    : { rejectUnauthorized: false }   // 本地開發
});
```

## 📸 圖片存儲變更

### 舊方式
- 圖片存儲在 `public/uploads/` 目錄
- 文件名：`activity-[userId]-[timestamp]-[random].ext`
- 佔用服務器磁碟空間

### 新方式
- 圖片轉換為 Base64 編碼
- 直接存儲在資料庫 `activities.photo_url` 欄位
- 優點：
  - ✅ 無需管理文件系統
  - ✅ 資料持久化與安全
  - ✅ 易於備份和還原
  - ⚠️ 缺點：大文件會增加資料庫體積

## 🔄 前端兼容性

前端 `public/js/app.js` 已完全兼容新的後端。不需要做任何修改：

- ✅ 登入/註冊流程保持不變
- ✅ API 端點保持不變
- ✅ 響應格式保持不變
- ✅ 照片顯示自動支持 Base64 URL

## 🧪 測試檢查清單

### 本地測試
- [ ] `npm run dev` 成功啟動
- [ ] 訪問 http://localhost:3000 顯示首頁
- [ ] 使用預設帳號登入（athlete / 123456）
- [ ] 新增運動紀錄
- [ ] 上傳照片
- [ ] 編輯紀錄
- [ ] 刪除紀錄
- [ ] 查看社群牆

### Render 測試
- [ ] 環境變數正確配置
- [ ] 伺服器成功部署
- [ ] 遠端資料庫表已建立
- [ ] 登入/活動操作正常

## ⚠️ 已知限制與考慮

1. **Base64 圖片體積**
   - 圖片轉 Base64 會增加 ~33% 的體積
   - 大量圖片上傳可能達到 PostgreSQL 連接限制
   - 建議：考慮後續使用 AWS S3 或 Cloudinary 等 CDN

2. **資料庫備份**
   - Render 自動備份 PostgreSQL
   - 建議定期下載備份副本

3. **成本考慮**
   - Render 免費版本有連接數限制
   - 生產環境可能需要升級計畫

## 📝 後續改進建議

1. **圖片存儲優化**
   ```
   考慮使用外部存儲服務（AWS S3、Cloudinary）
   而非內嵌 Base64
   ```

2. **資料庫連接池**
   ```
   在 production 中添加 pg-pool 優化連接
   ```

3. **遷移舊資料**
   ```
   如果有本地記憶體中的舊資料，
   需要手動導出並導入到 PostgreSQL
   ```

4. **監控與日誌**
   ```
   建議集成 Sentry 或 LogRocket
   進行生產環境監控
   ```

## 🆘 故障排除

### 連接錯誤
```
Error: getaddrinfo ENOTFOUND dpg-...
```
**解決方案：**
- 檢查 `.env` 中的 DATABASE_URL 是否正確
- 確保網絡連接正常
- 確認 Render 資料庫未禁用

### 密碼匹配失敗
```
Invalid username or password
```
**解決方案：**
- 確保使用正確的帳號密碼（athlete / 123456）
- 檢查伺服器日誌中的 bcrypt 相關錯誤

### 圖片上傳失敗
```
Photo must be smaller than 5 MB
```
**解決方案：**
- 壓縮圖片至 5MB 以下
- 檢查 multer 設置（已在 server.js 中配置）

## 📞 支持

如有問題，請查看：
- Render 日誌：https://dashboard.render.com
- PostgreSQL 連接字符串：Render Dashboard → PostgreSQL
- Node.js 文檔：https://nodejs.org/docs/

---

**遷移完成日期**：2025-11-10
**版本**：PostgreSQL + Express 5.1.0 + Node.js 14+
