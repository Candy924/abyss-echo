/* ads.js — 獎勵式廣告（Rewarded Ad）橋接層
 *
 * 設計：
 *   1. 若有原生橋接（TapTap / AdMob / 小程序），呼叫 window.AbyssAds.showRewarded(cb)
 *   2. 否則播放「示範廣告」：15 秒倒數、不可跳過、結束後發獎
 *   3. 任何情況都會回呼 onReward(success, reason)
 *
 * 原生接入方式（TapTap 廣告 / H5 小遊戲）：
 *   window.AbyssAds = {
 *     showRewarded: function (onReward) {
 *       sdk.showRewardVideoAd({
 *         onSuccess: function () { onReward(true); },
 *         onFail:    function (e) { onReward(false, String(e)); }
 *       });
 *     }
 *   };
 */
(function () {
  var overlay = null, timer = null, tickEl = null, barEl = null, skipBtn = null;
  var DURATION = 15;   /* 示範廣告秒數 */

  function ensureDom() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'adOverlay';
    overlay.className = 'ad-overlay hidden';
    overlay.innerHTML =
      '<div class="ad-box">' +
      '  <div class="ad-badge">廣告</div>' +
      '  <div class="ad-art"><div class="ad-runes"></div><div class="ad-core"></div></div>' +
      '  <div class="ad-title">觀看廣告即可解鎖</div>' +
      '  <div class="ad-sub">看完後自動發放獎勵（約 <span id="adSec">15</span> 秒）</div>' +
      '  <div class="ad-bar"><i id="adBar"></i></div>' +
      '  <button id="adSkip" class="ad-skip" disabled>還不能跳過</button>' +
      '  <div class="ad-note">示範廣告 · 接入 TapTap／AdMob SDK 後會播放真實廣告</div>' +
      '</div>';
    document.body.appendChild(overlay);
    tickEl = overlay.querySelector('#adSec');
    barEl = overlay.querySelector('#adBar');
    skipBtn = overlay.querySelector('#adSkip');
    return overlay;
  }

  function closeAd() {
    if (timer) { clearInterval(timer); timer = null; }
    if (overlay) overlay.classList.add('hidden');
  }

  function demoAd(onReward) {
    ensureDom();
    overlay.classList.remove('hidden');
    var left = DURATION;
    tickEl.textContent = String(left);
    barEl.style.width = '0%';
    skipBtn.disabled = true;
    skipBtn.textContent = '還不能跳過';
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      left -= 0.1;
      if (left <= 0) {
        clearInterval(timer); timer = null;
        tickEl.textContent = '0';
        barEl.style.width = '100%';
        skipBtn.disabled = false;
        skipBtn.textContent = '領取獎勵';
        return;
      }
      tickEl.textContent = String(Math.ceil(left));
      barEl.style.width = ((DURATION - left) / DURATION * 100).toFixed(1) + '%';
    }, 100);
    var finish = function () {
      if (left > 0) return;
      skipBtn.removeEventListener('click', finish);
      closeAd();
      try { onReward(true); } catch (e) {}
    };
    skipBtn.addEventListener('click', finish);
  }

  function showRewarded(onReward) {
    /* 1) CrazyGames SDK（v3） */
    try {
      var CG = window.CrazyGames && window.CrazyGames.SDK;
      if (CG && CG.ad && CG.ad.requestAd) {
        CG.ad.requestAd('rewarded', {
          adStarted: function () {},
          adFinished: function () { try { onReward(true); } catch (e) {} },
          adError: function (err) { try { onReward(false, String(err)); } catch (e) {} }
        });
        return;
      }
    } catch (e) {}

    /* 2) Poki SDK */
    try {
      if (window.PokiSDK && window.PokiSDK.rewardedBreak) {
        window.PokiSDK.rewardedBreak().then(function (ok) {
          try { onReward(!!ok); } catch (e) {}
        });
        return;
      }
    } catch (e) {}

    /* CrazyGames 環境但廣告不可用（審核／小規模測試）→ 直接回報失敗，不播假廣告 */
    try {
      var onCG = !!(window.CrazyGames && window.CrazyGames.SDK);
      if (onCG) { try { onReward(false, 'no-ad-available'); } catch (e) {} return; }
    } catch (e) {}

    /* 3) 平台自有橋接（TapTap / AdMob / 小遊戲） */
    if (window.AbyssAds && typeof window.AbyssAds.showRewarded === 'function') {
      try {
        window.AbyssAds.showRewarded(function (ok, reason) {
          try { onReward(!!ok, reason); } catch (e) {}
        });
        return;
      } catch (e) {}
    }

    /* 4) 示範廣告（本機 / GitHub Pages） */
    demoAd(onReward);
  }

  /* 平台需要的「遊戲進行中」訊號（CrazyGames 全量上線必要） */
  function gameplayStart() {
    try { if (window.CrazyGames && CrazyGames.SDK && CrazyGames.SDK.game) CrazyGames.SDK.game.gameplayStart(); } catch (e) {}
  }
  function gameplayStop() {
    try { if (window.CrazyGames && CrazyGames.SDK && CrazyGames.SDK.game) CrazyGames.SDK.game.gameplayStop(); } catch (e) {}
  }
  function loadingStart() {
    try { if (window.CrazyGames && CrazyGames.SDK && CrazyGames.SDK.game) CrazyGames.SDK.game.loadingStart(); } catch (e) {}
  }
  function loadingStop() {
    try { if (window.CrazyGames && CrazyGames.SDK && CrazyGames.SDK.game) CrazyGames.SDK.game.loadingStop(); } catch (e) {}
  }

  window.Ads = {
    showRewarded: showRewarded,
    gameplayStart: gameplayStart,
    gameplayStop: gameplayStop,
    loadingStart: loadingStart,
    loadingStop: loadingStop,
    isDemo: function () {
      return !(window.CrazyGames && window.CrazyGames.SDK) && !(window.PokiSDK && window.PokiSDK.rewardedBreak) &&
        !(window.AbyssAds && window.AbyssAds.showRewarded);
    },
    platform: function () {
      if (window.CrazyGames && window.CrazyGames.SDK) return 'crazygames';
      if (window.PokiSDK) return 'poki';
      if (window.AbyssAds) return 'native';
      return 'demo';
    },
    duration: DURATION
  };
})();
