# 思辨共讀 SympoRead

深度閱讀，共同思辨。公司內部讀書會討論平台，支援跨境存取（部署於 HK/SG 伺服器）。

## 快速啟動

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，填入 GEMINI_API_KEY

# 3. 開發模式（前後端同時）
npm run dev

# 4. 正式部署
npm run build
node server.js
```

## 部署到香港 / 新加坡 VPS

```bash
# 上傳程式碼後
npm install --production
npm run build
GEMINI_API_KEY=AIza... PORT=3000 node server.js

# 建議搭配 PM2 保持背景執行
npm install -g pm2
GEMINI_API_KEY=AIza... pm2 start server.js --name symporead
```

## 架構說明

- **無外部依賴**：不需要 Firebase、Cloudflare 帳號
- **單一伺服器**：Express + WebSocket，資料存於記憶體
- **Gemini API Key** 存於伺服器端，前端不暴露
- **重啟後資料清空**（適合單次讀書會活動）
