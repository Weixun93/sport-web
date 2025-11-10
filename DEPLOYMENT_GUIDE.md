# 部署至 Render 步驟

## 前置準備

✅ 已完成的步驟：
- PostgreSQL 遷移完成
- 本地測試通過
- 環境變數配置（`.env`）
- 密碼加密系統運行中

## 第一步：Git 版本控制

```bash
# 初始化 git（如果還未初始化）
cd /Users/weixun/CCTP/sport1
git init

# 配置 git（首次使用）
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 添加所有文件到版本控制
git add .

# 首次提交
git commit -m "Migrate to PostgreSQL on Render"
```

## 第二步：推送至 GitHub

1. **在 GitHub 上創建新的 Repository**
   - 訪問 https://github.com/new
   - Repository name：`sport-tracker`（或任意名稱）
   - 不要初始化 README（我們已有）
   - 點擊「Create repository」

2. **連接本地倉庫至 GitHub**

   ```bash
   # 添加遠端倉庫（將 YOUR_USERNAME 替換為你的 GitHub 用戶名）
   git remote add origin https://github.com/YOUR_USERNAME/sport-tracker.git
   
   # 推送到 GitHub（main 分支）
   git branch -M main
   git push -u origin main
   ```

3. **驗證推送成功**
   - 訪問 https://github.com/YOUR_USERNAME/sport-tracker
   - 應該看到所有文件已上傳

## 第三步：在 Render 上部署

### 3.1 連接 GitHub 賬戶到 Render

1. 訪問 https://render.com
2. 點擊「Sign up」或「Sign in」
3. 選擇「Continue with GitHub」
4. 授予 Render 存取你的 GitHub 倉庫權限

### 3.2 建立新的 Web Service

1. 在 Render Dashboard，點擊「New +」
2. 選擇「Web Service」
3. 選擇「Connect a repository」→ 選擇 `sport-tracker` 倉庫
4. 填寫配置：

   | 欄位 | 值 |
   |------|-----|
   | **Name** | `sport-tracker` 或任意名稱 |
   | **Environment** | `Node` |
   | **Region** | `Oregon` (或最近的區域) |
   | **Branch** | `main` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |

5. 點擊「Create Web Service」

### 3.3 配置環境變數

1. 等待初次部署完成（通常 2-3 分鐘）
2. 在 Service Dashboard，進入「Environment」
3. 添加以下環境變數：

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | 你的 Render PostgreSQL 連接字符串 |
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |

   > **如何獲取 DATABASE_URL？**
   > - 進入 Render Dashboard → PostgreSQL
   > - 複製「External Database URL」或「Internal Database URL」

4. 點擊「Deploy」重新部署

### 3.4 驗證部署

1. 等待「Deploy」狀態變為「Live」（綠色）
2. 在 Dashboard 找到你的服務 URL（如 `https://sport-tracker.onrender.com`）
3. 訪問該 URL 驗證網站是否正常運行
4. 嘗試登入（使用 athlete / 123456）

## 第四步：監控與維護

### 查看伺服器日誌
```
Render Dashboard → 你的 Service → Logs
```

### 自動部署設置
- Render 會自動監聽 GitHub push
- 每次提交到 `main` 分支都會自動部署新版本

### 數據庫備份
- Render PostgreSQL 自動備份
- 訪問 Database Dashboard 查看備份歷史

## 常見問題

### Q: 部署失敗，顯示「Build failed」
**解決方案：**
- 檢查 Render 日誌找出錯誤
- 確保 `package.json` 中的依賴版本正確
- 本地運行 `npm install` 驗證

### Q: 無法連接資料庫
**解決方案：**
- 驗證 `DATABASE_URL` 環境變數正確
- 確認 PostgreSQL 實例已啟動
- 檢查防火牆/網絡設置

### Q: 部署後仍使用舊代碼
**解決方案：**
- 等待部署完成（檢查狀態變為 Live）
- 清除瀏覽器緩存
- 強制刷新（Cmd+Shift+R 或 Ctrl+Shift+F5）

## 完成檢查清單

- [ ] GitHub 倉庫已建立
- [ ] 代碼已推送至 main 分支
- [ ] Render 服務已創建
- [ ] 環境變數已配置
- [ ] 初次部署成功
- [ ] 網站可訪問
- [ ] 登入功能正常
- [ ] 活動 CRUD 操作正常
- [ ] 照片上傳正常

## 下一步

✅ 完成部署後：

1. **分享 URL**
   - 告知使用者：`https://sport-tracker.onrender.com`

2. **監控效能**
   - 定期檢查 Render Logs
   - 監控資料庫連接使用情況

3. **考慮升級**
   - Render 免費方案：每月有限運行時間
   - 如需 24/7 運行，升級至付費計畫

4. **後續改進**
   - 添加郵件服務（重設密碼等）
   - 集成天氣 API
   - 優化圖片存儲（使用 S3 或 Cloudinary）

---

**需要幫助？** 訪問 Render 文檔：https://render.com/docs
