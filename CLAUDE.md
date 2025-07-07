# DWSurvey - Online Voting System

A Slido-like real-time voting system that allows audiences to participate in multiple-choice polls with instant results visualization.

## Features

- **Real-time Voting**: Audiences can vote on multiple-choice questions
- **QR Code Integration**: Generate QR codes for each question/poll for easy mobile access
- **Mobile-Optimized Voting**: Dedicated mobile interface for smartphone users
- **Live Results**: See voting results update in real-time with voting status indicators
- **Poll Control**: Close voting and display final results
- **Multiple Question Support**: Create and manage multiple polls with different question types
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Anonymous Voting**: No login required for participants
- **Printable QR Codes**: Generate printer-friendly QR code sheets for events

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript with real-time updates
- **Backend**: Node.js with Express.js
- **Database**: SQLite for simplicity (can be upgraded to PostgreSQL for production)
- **Real-time Communication**: WebSockets for live updates
- **QR Code Generation**: QRCode.js library for dynamic QR code creation
- **Mobile Detection**: Express-useragent for device-specific routing
- **Deployment**: Optimized for Zeabur deployment

## Project Structure

```
DWSurvey/
├── public/              # Frontend static files
│   ├── index.html      # Main voting interface
│   ├── admin.html      # Admin panel for creating polls
│   ├── mobile.html     # Mobile-optimized voting interface
│   ├── css/            # Stylesheets
│   │   ├── style.css   # Main desktop styles
│   │   ├── admin.css   # Admin panel styles
│   │   └── mobile.css  # Mobile-specific styles
│   └── js/             # Client-side JavaScript
│       ├── main.js     # Main application logic
│       ├── admin.js    # Admin panel functionality
│       └── mobile.js   # Mobile voting interface
├── src/                # Backend source code
│   ├── app.js          # Express server setup
│   ├── routes/         # API routes
│   │   ├── polls.js    # Poll management
│   │   ├── votes.js    # Voting endpoints
│   │   ├── admin.js    # Admin functionality
│   │   └── qr.js       # QR code generation
│   ├── models/         # Database models
│   ├── db/             # Database initialization
│   └── websocket/      # WebSocket handlers
├── database/           # SQLite database files
├── package.json        # Node.js dependencies
├── .env.example        # Environment variables template
├── CLAUDE.md          # Technical documentation
└── README.md          # Deployment instructions

```

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Voting Interface: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin.html
   - Mobile Voting: http://localhost:3000/mobile/:pollId (via QR code)

## QR Code Workflow

### 1. Create Poll with QR Codes
1. Admin creates a poll through the admin panel
2. Click "QR Codes" button to generate QR codes for each question
3. Download or print QR codes for distribution

### 2. Audience Participation
1. Participants scan QR code with their smartphones
2. Automatic redirect to mobile-optimized voting interface
3. Single-tap voting with instant feedback
4. Real-time results viewing

### 3. Poll Management
1. Admin can close voting at any time
2. Real-time status updates (Live/Closed) shown to all participants
3. Final results preserved after voting closes

## API Endpoints

### Public Endpoints
- `GET /api/polls` - Get all active polls
- `GET /api/polls/:id` - Get specific poll details
- `POST /api/votes` - Submit a vote
- `GET /api/polls/:id/results` - Get real-time results
- `GET /api/votes/check/:pollId/:sessionId` - Check if user has voted

### QR Code Endpoints
- `GET /api/qr/poll/:pollId` - Generate QR code for entire poll
- `GET /api/qr/poll/:pollId/questions` - Generate QR codes for all questions
- `GET /api/qr/poll/:pollId/print` - Printable QR code page

### Admin Endpoints (Password Required)
- `POST /api/admin/polls` - Create new poll
- `PUT /api/admin/polls/:id/status` - Update poll status
- `PUT /api/admin/polls/:id/close` - Close poll voting
- `DELETE /api/admin/polls/:id` - Delete poll
- `POST /api/admin/polls/list` - Get all polls with stats

## Deployment to Zeabur

1. Push code to GitHub repository
2. Connect repository to Zeabur
3. Set environment variables in Zeabur dashboard
4. Deploy with one click

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - Database connection string
- `ADMIN_PASSWORD` - Password for admin panel access

## Development Notes

- WebSocket connections handle real-time updates for voting and poll status
- Votes are stored with timestamps and session IDs to prevent duplicates
- QR codes are generated dynamically with customizable styling
- Mobile interface auto-detects device type and optimizes UI accordingly
- Poll closing triggers real-time notifications to all connected clients
- Admin panel requires password authentication
- Results are calculated on-the-fly for accuracy
- Database supports both active/inactive and open/closed poll states

## Mobile Features

### Responsive Design
- Touch-optimized voting interface
- Large tap targets for easy selection
- Automatic scaling for different screen sizes
- Prevents accidental zoom on input focus

### Smart Navigation
- Direct question access via QR code scanning
- Progress indicators showing question number
- Automatic detection of already-voted questions
- Seamless transition to results view

### Real-time Feedback
- Instant vote confirmation
- Live status updates (voting open/closed)
- Connection status indicators
- Error handling with retry options

## Event Management

### Pre-Event Setup
1. Create polls in admin panel
2. Generate and print QR code sheets
3. Test mobile access and voting flow
4. Distribute QR codes to audience

### During Event
1. Display QR codes on screen or handouts
2. Monitor real-time participation
3. Close voting when appropriate
4. Display final results

### Post-Event
1. Export results (future feature)
2. Archive or delete polls
3. Analyze participation metrics

## 疑難排解 (Troubleshooting)

### Safari 連線問題解決方案

#### 問題現象
- Safari 無法開啟 `http://localhost:3000`
- IP 位址 `http://192.168.1.118:3000` 被自動改寫為 `http://www.192.168.1.118`
- Chrome 顯示「無法連上這個網站，192.168.1.118 拒絕連線」

#### 問題分析 (根據 ChatGPT O3 分析)

**1. 伺服器未運行**
- 最常見原因：應用程式沒有在指定埠口監聽
- 檢查指令：`lsof -nP -iTCP:3000 -sTCP:LISTEN` 或 `netstat -an | grep 3000`

**2. IPv4/IPv6 位址差異**
- Safari 解析 localhost 時優先使用 IPv6 (::1)
- 如果程式只綁定 IPv4 (127.0.0.1) 會造成連線失敗
- DWSurvey 正確設定：`server.listen(PORT, '0.0.0.0')` 同時支援 IPv4/IPv6

**3. Safari 智慧搜尋列自動補全**
- Safari 會將不完整的網址當作搜尋關鍵字
- 自動添加 www 前綴或進行搜尋建議

#### 解決步驟

**1. 確認伺服器運行**
```bash
# 啟動伺服器
npm start

# 檢查是否正常運行
netstat -an | grep 3000
```

**2. 使用正確的網址格式**
- ✅ 正確：`http://192.168.1.118:3000/` (注意結尾斜線)
- ✅ 正確：`http://127.0.0.1:3000/`
- ✅ 正確：`http://localhost:3000/`
- ❌ 錯誤：`192.168.1.118:3000` (缺少協定)

**3. 測試連線 (依序檢查)**
```bash
# 測試 IPv4
curl http://127.0.0.1:3000

# 測試 IPv6
curl http://[::1]:3000

# 測試區網 IP
curl http://192.168.1.118:3000
```

**4. Safari 設定調整 (如需要)**
```bash
# 關閉搜尋建議和自動補全
defaults write com.apple.Safari UniversalSearchEnabled -bool NO
defaults write com.apple.Safari SuppressSearchSuggestions -bool YES
killall Safari
```

#### 預防措施

**1. 伺服器設定檢查清單**
- ✅ 綁定正確位址：`'0.0.0.0'` 而非 `'localhost'`
- ✅ 確認埠口沒有被其他程式佔用
- ✅ 檢查防火牆設定

**2. 瀏覽器使用技巧**
- 總是輸入完整網址 (包含 http:// 和結尾 /)
- 優先使用 127.0.0.1 而非 localhost
- 如遇問題可嘗試不同瀏覽器測試

**3. 除錯工具**
```bash
# 檢查埠口佔用
lsof -i :3000

# 檢查伺服器日誌
npm start (觀察輸出訊息)

# 測試網路連線
curl -v http://localhost:3000
```

#### 成功案例
經實際測試，DWSurvey 在正確啟動後：
- ✅ `http://192.168.1.118:3000/` 可正常運作
- ✅ Safari/Chrome 都能正常存取
- ✅ 區網內其他裝置可正常連線