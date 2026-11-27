# 上架指南（誠實版）

> 先講結論：**Apple App Store 與 Google Play 不可能「免費」上架，也不接受 HK$1 定價。**
> 但「免費上架 + HK$1」有可行路線，下面列清楚，能做的我已經幫你做好。

## 一、各商店費用與 HK$1 可行性

| 商店 | 上架費 | 能否免費 | 可否定價 HK$1 | 需要的東西 |
|---|---|---|---|---|
| **Apple App Store** | US$99/年（約 HK$780） | ❌ **不可能** | ❌ 香港區最低價約 **HK$8** | Mac + Xcode + 開發者帳號 + 審核 1–3 天 |
| **Google Play** | US$25 一次性（約 HK$195） | ❌ | ❌ 最低價約 **HK$8** | Play Console + AAB + 新個人帳號需 12 名測試者 14 天 |
| **Amazon Appstore** | 免費註冊 | ✅ | 可設較低價 | APK |
| **Samsung Galaxy Store** | 免費註冊 | ✅ | 可設 | APK |
| **Huawei AppGallery** | 免費註冊 | ✅ | 可設 | APK（需華為帳號） |
| **Aptoide** | 免費 | ✅ | 任意價 | APK |
| **itch.io** | 免費 | ✅（偏 indie 平台） | ✅ **可設 HK$1 最低價** | 網頁版或 APK |
| **F-Droid** | 免費 | ✅ | 只能免費 | 開源 + 可重現建置 |
| **加入主畫面（PWA）** | 免費 | ✅ | —（用網頁購買） | 已經可用 |

### 為什麼 HK$1 在兩大商店做不到

- **Apple**：價格是固定 tier，香港區 Tier 1 = **HK$8**，沒有 HK$1 這一階。
- **Google Play**：香港區最低價同樣約 **HK$8**。

**所以「一元港幣」只能走：itch.io、Aptoide，或官網 / Ko-fi / PayPal 直接收款（我已經做成 `buy.html`）。**

## 二、我已經幫你準備好的東西

| 檔案 | 用途 |
|---|---|
| `store/feature-graphic-1024x500.png` | Google Play「特色圖像」、Amazon/Samsung 商店頁大圖 |
| `store/promo-1024.png` | 方形促銷圖（AppGallery / Aptoide） |
| `icons/icon-1024.png` | 1024×1024 商店圖示（Apple 必要尺寸） |
| `icons/icon-512.png`、`icon-192.png` | Android 自適應圖示 |
| `privacy.html` | 隱私政策（**所有商店都要求**，已可公開訪問） |
| `buy.html` | HK$1 購買頁（付款連結可自行填入） |
| `js/unlock.js` | 遊戲內解鎖碼兌換（已接好商店畫面） |
| `tools/gen-codes.js` | 產生解鎖碼：`node tools/gen-codes.js 100 > codes.txt` |
| `store/listing-zh-HK.md`、`listing-en.md` | 商店文案（短描述／完整描述／關鍵字） |
| `manifest.webmanifest` + `sw.js` | 已經是完整 PWA，可直接被包成 App |

## 三、免費上架的三條路線（由易到難）

### 路線 A：PWA 加入主畫面（0 分鐘、0 元，已經可用）

玩家用 Safari / Chrome 開啟 <https://abyss-echo-4ckde.netlify.app> →
「加入主畫面」→ 就有 App 圖示、全螢幕、離線快取。
**這不是商店，但體驗最接近，而且完全免費。**

### 路線 B：PWABuilder 產生 APK → 免費商店（推薦）

1. 開 <https://www.pwabuilder.com>，輸入 `https://abyss-echo-4ckde.netlify.app`
2. 選 **Android** → **Generate** → 下載 `.aab`（Play 用）與 **簽章金鑰**
3. 上架到 **Amazon Appstore / Samsung Galaxy Store / Aptoide**（都免費註冊）
   - 需要：APK/AAB、圖示、截圖、描述、隱私政策網址（用 `https://abyss-echo-4ckde.netlify.app/privacy.html`）
4. 定價：這些商店多半可以設 **HK$1**（Aptoide 完全可以）

> 走這條路 **完全免費**，但**不能上 Google Play**（Play 要 US$25，且 TWA 需要 Play 帳號）。

### 路線 C：Google Play（US$25，可上 Play，但 HK$8 起）

1. 註冊 Google Play Console（US$25 一次性）
2. 用 PWABuilder 產生的 `.aab` 上傳（Trusted Web Activity）
3. 新個人帳號需 **12 名測試者連續 14 天**
4. 定價最低 **HK$8**（不能用 HK$1）

### Apple App Store（US$99/年，需要 Mac）

1. 需要 **Mac + Xcode**（Windows 做不到）
2. Apple Developer Program **US$99/年**
3. 用 Capacitor 包裝：`npx cap add ios`，或用 PWABuilder 產生的 Xcode 專案
4. 定價最低 **HK$8**，審核 1–3 天

## 四、HK$1 收款怎麼做（已實作）

`buy.html` 支援三種收款方式，把 `window.PAY_LINKS` 填上即可：

```js
window.PAY_LINKS = {
  kofi:   'https://ko-fi.com/你的帳號',        // 推薦：可設 HK$1 商品
  paypal: 'https://paypal.me/你的帳號/1',      // HK$1 直接收款
  gumroad:'https://你的帳號.gumroad.com/l/abyss'
};
```

流程：
1. 玩家付款 HK$1
2. 你（或平台自動發信）給他一組 `ABYSS-XXXX-XXXX`
3. 玩家在遊戲「商店 → 輸入解鎖碼」貼上 → 立即解鎖 3 名付費角色 + 混沌武器

產生解鎖碼：

```powershell
node tools/gen-codes.js 50 1     # 產生 50 組（流水號 1~50）
```

> **注意**：解鎖碼是本地驗證（沒有後端），所以「防盜」是象徵性的。
> 對 HK$1 的商品這是合理取捨；若要真正防護，需要後端驗證（可日後加）。

## 五、商店文案

- 中文（香港）：`store/listing-zh-HK.md`
- English: `store/listing-en.md`

直接複製貼上到各商店後台即可。

## 六、截圖建議（各商店要求）

| 商店 | 尺寸 |
|---|---|
| Google Play | 16:9 或 9:16，最短邊 ≥ 320px，建議 1080×1920（直向）或 1920×1080 |
| Amazon | 至少 3 張，建議 1080×1920 |
| Samsung | 1080×1920（直向） |
| App Store | 6.7" 1290×2796、6.5" 1284×2778（必填） |

現有截圖在 `screenshots/`（1280×720 橫向），可直接用於 Google Play/Amazon；
若要走 App Store，需要另外拍直向截圖（我可以再幫你產生）。
