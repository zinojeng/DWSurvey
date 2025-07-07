# 重開機後快速啟動指南

## 🚀 快速啟動步驟

### 1. 進入項目目錄
```bash
cd /Users/zino/Desktop/OpenAI/DWSurvey
```

### 2. 啟動伺服器
```bash
npm start
```

### 3. 訪問應用
- **主頁面**: http://192.168.1.118:3000
- **管理面板**: http://192.168.1.118:3000/admin.html
- **管理密碼**: admin123

## 🔧 如果有問題

### 如果端口被佔用：
```bash
# 檢查端口使用情況
lsof -i :3000

# 停止現有進程
pkill -f "node src/app.js"

# 重新啟動
npm start
```

### 如果需要重新安裝依賴：
```bash
npm install
```

### 如果需要重新初始化數據庫：
```bash
npm run init-db
```

## 📱 測試 QR Code 功能

1. 登入管理面板 (密碼: admin123)
2. 創建一個新投票
3. 點擊 "QR Codes" 按鈕
4. 用手機掃描 QR Code 測試

## 🌐 網絡配置

伺服器配置為綁定到 `0.0.0.0:3000`，可以通過以下方式訪問：
- 本地: http://localhost:3000
- IP: http://192.168.1.118:3000
- 127.0.0.1: http://127.0.0.1:3000

## 📊 GitHub 儲存庫

所有代碼已保存到: https://github.com/zinojeng/DWSurvey.git

## ✅ 功能清單

- [x] QR Code 生成
- [x] 手機投票界面
- [x] 實時結果顯示
- [x] 投票控制 (開啟/關閉)
- [x] 管理面板
- [x] WebSocket 實時更新