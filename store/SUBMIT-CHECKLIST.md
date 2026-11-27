# 上架資料包（Aptoide / Amazon / Samsung / Huawei）

先把「一次填好、四家通用」的資料準備好，之後四家只是重複貼上。

## 通用資料（直接複製）

| 欄位 | 值 |
|---|---|
| App 名稱 | `深淵迴響 Abyss Echo` |
| 套件名稱 / Package ID | `app.abyssecho.game` |
| 版本名稱 | `0.00.09`（每次上架遞增） |
| 版本代碼 | `9`（整數，每次 +1） |
| 分類 | Games → Action / Role Playing |
| 內容分級 | 12+ |
| 網站 | https://abyss-echo-4ckde.netlify.app |
| 隱私政策 | https://abyss-echo-4ckde.netlify.app/privacy.html |
| 客服電郵 | （填你的） |
| 圖示 512 | `icons/icon-512.png` |
| 圖示 1024 | `icons/icon-1024.png` |
| 特色圖 1024×500 | `store/feature-graphic-1024x500.png` |
| 方形促銷圖 | `store/promo-1024.png` |
| 截圖 | `screenshots/game.png`、`heroes.png`、`news.png`、`buy.png`（1280×720） |
| 短描述 | 見 `store/listing-zh-HK.md` |
| 完整描述 | 見 `store/listing-zh-HK.md` |
| 關鍵字 | 地牢, 隨機, 動作, RPG, roguelike, 像素, 單機, 冒險, 打寶 |

## 先決條件：APK

四家都需要 **APK**（Amazon 也吃 `.aab`，但 APK 最通用）。產生方式二選一：

### 方式 A：PWABuilder（最簡單，5 分鐘，免費）

1. 開 <https://www.pwabuilder.com>
2. 輸入 `https://abyss-echo-4ckde.netlify.app` → Start
3. 左邊選 **Android** → **Generate Package**
4. 設定：
   - Package ID：`app.abyssecho.game`
   - App name：`深淵迴響 Abyss Echo`
   - 版本：`1.0.0` / code `1`
   - Signing key：**Create new** → 下載並**務必保存** `signing.keystore` 與密碼
5. 下載 `.apk`（給 Aptoide）與 `.aab`（給 Google Play，如日後要上）

### 方式 B：GitHub Actions（我可代跑，免費）

專案已附 `.github/workflows/build-apk.yml`：

1. 把整個專案推到 GitHub repo
2. Actions → **Build Android package (TWA)** → Run workflow
3. 跑完下載 artifact `android-package`（含 `.apk`、`.aab`、`android.keystore`）
4. **保存 keystore**，之後每次更新都要用同一把金鑰簽章

> 若你願意提供 GitHub token（repo 權限），我可以直接幫你推 repo、觸發建置、把 APK 下載給你。

## 四家上架步驟

### 1️⃣ Aptoide（最寬鬆，最快）

1. <https://www.aptoide.com/developer> 註冊（免費，可只用 email）
2. 建立 App → 上傳 APK
3. 填上表資料 → 送審（通常幾小時）
4. **定價**：Aptoide 支援付費 App，可設 HK$1（需接上 PayPal 收款）

### 2️⃣ Amazon Appstore

1. <https://developer.amazon.com/appstore> 註冊（免費，需填稅務資料）
2. Add New App → 上傳 APK
3. 填資料、上傳截圖與特色圖
4. 定價：Amazon 可設付費（最低通常 US$0.99，需接稅務/銀行）

### 3️⃣ Samsung Galaxy Store

1. <https://seller.samsungapps.com> 註冊（免費）
2. 上傳 APK → 填資料 → 送審（1–3 天）
3. 付費 App 需開通 Samsung 的商家帳戶（部分地區）

### 4️⃣ Huawei AppGallery

1. <https://developer.huawei.com/consumer/en/appgallery/> 註冊（免費，需實名）
2. 上架 APK（純網頁殼不需要 HMS）
3. 付費 App 需開通華為支付/商家帳戶

## ⚠️ 關於「HK$1 定價」的現實

上架免費，但**「收費」需要各家的商家/稅務帳戶**，而且多數平台有最低價限制：

| 平台 | 可設 HK$1？ | 收款條件 |
|---|---|---|
| Aptoide | ✅ 較有機會 | 需 PayPal |
| Amazon | ⚠️ 通常最低 US$0.99 | 需稅務 + 銀行 |
| Samsung | ⚠️ 依地區 | 需商家帳戶 |
| Huawei | ⚠️ 依地區 | 需華為商家 |

**最穩定的 HK$1 收款方式仍然是 `buy.html` + Ko-fi / PayPal**（已做好，不需要任何商店）。
商店上架可以設「免費下載 + App 內輸入解鎖碼」，這樣就完全避開各家的付費門檻 —— **推薦這個做法**。
