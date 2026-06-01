# 思辨共讀 SympoRead

深度閱讀，共同思辨。A real-time book club discussion platform with GFW bypass support.

## 快速開始

1. 複製環境設定：`cp .env.example .env`
2. 填入 Firebase 設定（於 Firebase Console > Project Settings）
3. 安裝依賴：`npm install`
4. 啟動開發伺服器：`npm run dev`

## Firebase 設定

1. 建立 Firebase 專案並啟用 **Firestore** 與 **Authentication（匿名登入）**
2. Firestore 安全規則：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Cloudflare Worker 部署（中國大陸中繼）

```bash
cd worker
npm install -g wrangler
wrangler login
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

部署後，在主持人設定中勾選「使用中繼代理」並填入 Worker 網域。
