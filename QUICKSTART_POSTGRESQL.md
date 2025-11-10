# 🚀 快速開始 - PostgreSQL 版本

## ✨ 遷移完成！

你的 Sport Activity Tracker 已成功遷移至 **PostgreSQL + Render**！

## 📌 現在你可以：

### 本地開發

```bash
# 啟動開發伺服器
npm run dev

# 訪問
http://localhost:3000
```

### 直接使用

**預設帳號：**
- 用戶名：`athlete`
- 密碼：`123456`

## 🎯 核心改進

| 功能 | 舊版本（本地記憶體） | 新版本（PostgreSQL） |
|------|-----------------|------------------|
| **資料存儲** | 重啟即遺失 | 永久保存 ✓ |
| **密碼安全** | 明文存儲 ⚠️ | bcrypt 加密 ✓ |
| **圖片存儲** | 磁碟文件 | 資料庫 Base64 ✓ |
| **線上同步** | 無法同步 | 自動同步 ✓ |
| **多用戶** | 記憶體限制 | 無限支持 ✓ |
| **備份恢復** | 需手動 | Render 自動 ✓ |

## 📁 檔案結構變更

```diff
  src/
  └─ server.js
     - 移除：本地 Map 存儲
     - 移除：磁碟文件上傳
     + 新增：PostgreSQL 連接
     + 新增：bcrypt 密碼加密
     + 新增：Base64 圖片存儲
```

## 🔑 重要檔案

1. **`.env`** - 資料庫連接配置
   - ⚠️ 已加入 `.gitignore`（不會被推送）
   - 包含敏感資訊（資料庫密碼）

2. **`.gitignore`** - 忽略敏感檔案
   - 保護 `.env` 檔案
   - 排除 `node_modules/`

3. **`MIGRATION_GUIDE.md`** - 詳細遷移文檔
   - 技術細節
   - 資料庫架構
   - 故障排除

4. **`DEPLOYMENT_GUIDE.md`** - 部署至 Render
   - 逐步部署指南
   - 環境變數配置
   - 監控維護

## 🧪 測試一下

```bash
# 1. 啟動伺服器
npm run dev

# 2. 瀏覽 http://localhost:3000

# 3. 使用預設帳號登入
# athlete / 123456

# 4. 嘗試以下操作：
#  - 新增運動紀錄
#  - 上傳照片
#  - 編輯/刪除紀錄
#  - 查看社群牆
#  - 瀏覽日曆
```

## 🚀 下一步 - 部署至 Render

遵循 **DEPLOYMENT_GUIDE.md** 中的步驟：

1. 初始化 Git 並推送至 GitHub
2. 在 Render 上連接你的 GitHub 倉庫
3. 配置環境變數
4. 自動部署成功！

> **部署完成後**，你的應用將永久線上，
> 資料會在 PostgreSQL 中持久存儲！

## 📊 資料庫狀態

伺服器啟動時會自動：

✅ 建立 `users` 表
✅ 建立 `activities` 表
✅ 建立 `sessions` 表
✅ 插入示例用戶 (`athlete`)

## ⚙️ 環境變數

目前配置（本地開發）：

```env
DATABASE_URL=postgresql://...@dpg-....postgres.render.com/db_sport_fwj9
PORT=3000
NODE_ENV=development
```

生產環境會自動使用 `NODE_ENV=production`。

## 🆘 如果出現問題

1. **伺服器無法啟動？**
   ```bash
   # 檢查 npm 版本
   npm --version
   
   # 重新安裝依賴
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **無法連接資料庫？**
   ```bash
   # 驗證 .env 檔案是否存在
   cat .env
   
   # 確認 DATABASE_URL 正確
   # 嘗試本地連接測試
   ```

3. **登入失敗？**
   - 確認使用正確的帳號密碼
   - 檢查伺服器日誌中的錯誤

## 📚 相關文檔

- **MIGRATION_GUIDE.md** - 技術細節 & 架構
- **DEPLOYMENT_GUIDE.md** - 部署步驟
- **README.md** - 功能說明
- **QUICK_REFERENCE.md** - API 快速參考

## 💡 提示

### 資料遷移

如果你有舊的本地資料需要遷移：

```sql
-- 登入 Render PostgreSQL
-- 手動導入舊資料或使用轉移腳本

-- 示例：檢查現有資料
SELECT COUNT(*) FROM activities;
```

### 密碼重設

預設帳號密碼：
```
Username: athlete
Password: 123456
```

註冊新帳號時密碼會被 bcrypt 加密。

## 🎉 恭喜！

你現在擁有：
- ✅ 雲端資料庫（PostgreSQL on Render）
- ✅ 安全的密碼存儲
- ✅ 永久數據儲存
- ✅ 可隨時部署至線上

### 下一個目標？

1. 測試所有功能
2. 部署至 Render
3. 邀請朋友使用
4. 蒐集反饋改進功能
5. 添加更多運動類型
6. 集成天氣 API
7. 實現社交功能

---

**有問題？** 查看 MIGRATION_GUIDE.md 或 DEPLOYMENT_GUIDE.md

**準備好部署？** 遵循 DEPLOYMENT_GUIDE.md 的步驟！

🚀 **祝你使用愉快！**
