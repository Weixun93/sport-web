# 🎯 PostgreSQL 版本 - 快速參考

## 📋 一覽表

### 環境變數
```bash
DATABASE_URL="postgresql://..."  # Render PostgreSQL 連接字符串
NODE_ENV="development"            # 本地開發
NODE_ENV="production"             # 生產環境（Render）
PORT=3000                         # 伺服器端口
```

### 常用命令
```bash
npm run dev      # 啟動開發伺服器
npm start        # 啟動生產伺服器
npm install      # 安裝依賴
npm test         # 運行測試
```

### 資料庫表

| 表名 | 主鍵 | 描述 |
|------|------|------|
| `users` | id | 用戶帳號 (username, password_hash, display_name) |
| `activities` | id | 運動紀錄 (date, sport, duration_minutes, photo_url 等) |
| `sessions` | token | 登入會話 (token, user_id) |

### 預設帳號
```
Username: athlete
Password: 123456
```

## 🔗 API 端點速查

### 認證

| 方法 | 端點 | 用途 | 返回 |
|------|------|------|------|
| POST | `/api/register` | 註冊新用戶 | {user, message} |
| POST | `/api/login` | 登入 | {token, user} |
| GET | `/api/health` | 檢查伺服器狀態 | {status, timestamp} |

### 活動管理

| 方法 | 端點 | 用途 | 需授權 |
|------|------|------|--------|
| GET | `/api/activities` | 查詢個人活動 | ✅ |
| POST | `/api/activities` | 建立活動 | ✅ |
| PUT | `/api/activities/:id` | 編輯活動 | ✅ |
| DELETE | `/api/activities/:id` | 刪除活動 | ✅ |
| GET | `/api/activities/public` | 查詢公開活動 | ✅ |

### 其他

| 方法 | 端點 | 用途 | 返回 |
|------|------|------|------|
| GET | `/api/weather` | 獲取天氣（占位符） | {summary, lastUpdated} |

## 📬 請求範例

### 登入
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"athlete","password":"123456"}'

# 響應
{
  "data": {
    "token": "token-user-seed-1-...",
    "user": {
      "id": "user-seed-1",
      "username": "athlete",
      "displayName": "Athlete Demo"
    }
  }
}
```

### 建立活動
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer token-user-seed-1-..." \
  -H "Content-Type: application/json" \
  -d '{
    "date":"2024-11-10",
    "sport":"Running",
    "durationMinutes":30,
    "intensity":"moderate",
    "notes":"Morning run",
    "isPublic":true
  }'
```

### 帶照片的活動
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer token-..." \
  -F "date=2024-11-10" \
  -F "sport=Cycling" \
  -F "durationMinutes=45" \
  -F "intensity=hard" \
  -F "isPublic=true" \
  -F "photo=@/path/to/image.jpg"
```

### 查詢活動
```bash
curl http://localhost:3000/api/activities \
  -H "Authorization: Bearer token-user-seed-1-..."

# 響應
{
  "data": [
    {
      "id": "activity-...",
      "date": "2024-11-10",
      "sport": "Running",
      "durationMinutes": 30,
      "intensity": "moderate",
      "notes": "Morning run",
      "photoUrl": "data:image/jpeg;base64,...",
      "isPublic": true,
      "ownerId": "user-seed-1",
      "ownerName": "Athlete Demo",
      "createdAt": "2024-11-10T..."
    }
  ]
}
```

## 🗄️ SQL 快速查詢

```sql
-- 查看所有用戶
SELECT * FROM users;

-- 查看特定用戶的所有活動
SELECT * FROM activities WHERE owner_id = 'user-seed-1' ORDER BY date DESC;

-- 查看公開活動
SELECT a.*, u.display_name 
FROM activities a 
JOIN users u ON a.owner_id = u.id 
WHERE a.is_public = true 
ORDER BY a.created_at DESC;

-- 計算用戶總活動數
SELECT COUNT(*) as total_activities FROM activities WHERE owner_id = 'user-seed-1';

-- 計算用戶總運動時長
SELECT SUM(duration_minutes) as total_minutes FROM activities WHERE owner_id = 'user-seed-1';

-- 按運動類型統計
SELECT sport, COUNT(*) as count, SUM(duration_minutes) as total_minutes 
FROM activities 
WHERE owner_id = 'user-seed-1' 
GROUP BY sport;

-- 查看活動的照片 URL (Base64)
SELECT id, sport, SUBSTRING(photo_url, 1, 50) as photo_preview FROM activities LIMIT 5;
```

## 🛠️ 環境設置

### 本地開發環境配置

```bash
# 1. 複製 .env 並設置本地資料庫 (可選)
cp .env .env.local
# 編輯 .env.local，改為本地 PostgreSQL (如需要)

# 2. 安裝依賴
npm install

# 3. 啟動開發伺服器
npm run dev

# 4. 訪問
open http://localhost:3000
```

### 部署到 Render

```bash
# 1. 推送至 GitHub
git add .
git commit -m "Deploy PostgreSQL version"
git push origin main

# 2. 在 Render 上
# - 連接 GitHub 倉庫
# - 設置 DATABASE_URL 環境變數
# - 自動部署
```

## 🔒 安全檢查清單

- [ ] `.env` 檔案已建立且包含 DATABASE_URL
- [ ] `.gitignore` 已添加 `.env`
- [ ] 未將 `.env` 提交到 Git
- [ ] 使用 bcrypt 加密密碼
- [ ] 登入端點使用 Bearer token 認證
- [ ] API 端點受 `requireAuth` 中介軟體保護
- [ ] Base64 圖片存儲在資料庫
- [ ] 無明文密碼在代碼中

## 🐛 故障排除

### 問題：`Error: connect ECONNREFUSED`
```
原因：無法連接資料庫
解決：
1. 檢查 DATABASE_URL 是否正確
2. 確認 Render PostgreSQL 實例是否在運行
3. 檢查防火牆設置
```

### 問題：`Password mismatch`
```
原因：密碼驗證失敗
解決：
1. 確認帳號密碼無誤
2. 檢查 bcrypt 比較邏輯
3. 查看伺服器日誌
```

### 問題：`Image upload failed`
```
原因：照片上傳失敗
解決：
1. 檢查文件大小 (< 5MB)
2. 確認文件格式為圖片
3. 檢查 multer 配置
```

### 問題：`404 Not Found`
```
原因：路由不存在
解決：
1. 檢查 API 端點是否正確拼寫
2. 驗證 HTTP 方法 (GET/POST/PUT/DELETE)
3. 確認授權 token 有效
```

## 📊 性能優化建議

```javascript
// 1. 添加資料庫索引
CREATE INDEX idx_activities_owner_id ON activities(owner_id);
CREATE INDEX idx_activities_is_public ON activities(is_public);
CREATE INDEX idx_sessions_token ON sessions(token);

// 2. 連接池配置
const pool = new Pool({
  max: 20,              // 最大連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 3. 查詢優化
// 使用 prepared statements (已在用)
// 避免 SELECT * (已在用)
// 添加 LIMIT 和 OFFSET 分頁
```

## 📱 前端集成

前端代碼已完全兼容新後端，無需修改：

```javascript
// 已自動支持：
// - Bearer token 認證
// - Base64 圖片顯示
// - 所有 API 端點
// - 錯誤處理

// 使用示例
const token = localStorage.getItem('authToken');
fetch('/api/activities', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => console.log(data.data));
```

## 🚀 部署清單

- [ ] 本地測試通過
- [ ] `.env` 已創建並不在 Git 中
- [ ] 代碼已推送至 GitHub main 分支
- [ ] Render Service 已連接 GitHub
- [ ] DATABASE_URL 環境變數已設置
- [ ] NODE_ENV 設置為 production
- [ ] 部署成功（状態為 Live）
- [ ] 遠端 URL 可訪問
- [ ] 遠端登入功能正常
- [ ] 遠端活動 CRUD 正常

## 💡 實用技巧

### 快速本地測試
```bash
# 終端 1：啟動伺服器
npm run dev

# 終端 2：測試登入
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"athlete","password":"123456"}'
```

### 查看伺服器日誌
```bash
# Render 日誌
# 訪問：https://dashboard.render.com/services/...

# 本地日誌
# 終端直接顯示 morgan 日誌
```

### 資料庫備份
```bash
# Render 自動備份位置
# Dashboard → PostgreSQL → Backups

# 手動導出
pg_dump -U username -h host > backup.sql
```

---

**需要詳細資訊？** 查看：
- **MIGRATION_GUIDE.md** - 技術細節
- **DEPLOYMENT_GUIDE.md** - 部署步驟
- **BEFORE_AFTER_COMPARISON.md** - 版本對比
