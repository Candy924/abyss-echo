/* =========================================================================
   unlock.js — HK$1 解鎖包（付費解鎖碼）
   -------------------------------------------------------------------------
   流程：玩家在 buy.html 付款 → 拿到一組 ABYSS-XXXX-XXXX → 在遊戲內兌換
   驗證是本地計算（沒有後端），所以「防盜」是象徵性的，但對 HK$1 足夠。
   ========================================================================= */
window.Unlock = (function () {
  /* CrazyGames 上架版：不可引導外部付款（避免違反平台規範） */
  function hideExternalPurchase() {
    try {
      if (!(window.CrazyGames && window.CrazyGames.SDK)) return;
      ['paidGo', 'giftGo'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) {
          b.disabled = true;
          b.textContent = 'Included free on CrazyGames';
          b.style.opacity = '0.6';
        }
      });
      var how = document.querySelectorAll('.paid-how');
      for (var i = 0; i < how.length; i++) how[i].textContent = 'Click the button below and enter your unlock code.';
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(hideExternalPurchase, 800); });
  window.addEventListener('load', function () { setTimeout(hideExternalPurchase, 1200); });

  'use strict';

  var SECRET = 'abyss-echo-2026-hk1';
  var GIFT_SECRET = 'abyss-echo-2026-gift8';
  var WPN_SECRET = 'abyss-echo-2026-wpn';
  var EQP_SECRET = 'abyss-echo-2026-eqp';
  var WPN_IDS = ['chaos', 'frostcannon', 'thunder', 'meteor'];
  var modal = null;

  function $(id) { return document.getElementById(id); }

  function fnv(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function suffix(serial) {
    var s = ('0000' + serial).slice(-4);
    var h = fnv(SECRET + ':' + s).toString(36).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return h.slice(-4);
  }

  function giftSuffix(serial) {
    var s = ('0000' + serial).slice(-4);
    var h = fnv(GIFT_SECRET + ':' + s).toString(36).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return h.slice(-4);
  }

  function giftCodeFor(serial) {
    var s = ('0000' + serial).slice(-4);
    return 'GIFT-' + s + '-' + giftSuffix(serial);
  }

  function validateGift(code) {
    var m = /^GIFT-(\d{4,6})-([A-Z0-9]{4})$/.exec(String(code || '').toUpperCase().replace(/\s/g, ''));
    if (!m) return false;
    return giftSuffix(parseInt(m[1], 10)) === m[2];
  }

  /* ---- 單把付費武器：WPN-<武器編號>-<流水號>-<校驗> ---- */
  function wpnSuffix(idx, serial) {
    var h = fnv(WPN_SECRET + ':wpn:' + idx + ':' + serial).toString(36).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return h.slice(-4);
  }

  function weaponCodeFor(idx, serial) {
    var i2 = ('0' + idx).slice(-2);
    var s = ('0000' + serial).slice(-4);
    return 'WPN-' + i2 + '-' + s + '-' + wpnSuffix(idx, parseInt(s, 10));
  }

  function parseWeapon(code) {
    var m = /^WPN-(\d{2})-(\d{4,6})-([A-Z0-9]{4})$/.exec(String(code || '').toUpperCase().replace(/\s/g, ''));
    if (!m) return null;
    var idx = parseInt(m[1], 10);
    var serial = parseInt(m[2], 10);
    if (idx < 1 || idx > WPN_IDS.length) return null;
    if (wpnSuffix(idx, serial) !== m[3]) return null;
    return WPN_IDS[idx - 1];
  }

  function validateWeapon(code) {
    return !!parseWeapon(code);
  }

  function redeemWeapon(code) {
    var id = parseWeapon(code);
    if (!id) return { ok: false, msg: '武器碼不正確（格式 WPN-01-0001-ABCD）' };
    var ok = false;
    try { ok = window.__game.debug.grantWeapon(id); } catch (e) { ok = false; }
    return ok ? { ok: true, msg: '武器已解鎖，可設為出戰武器' }
      : { ok: false, msg: '無法解鎖，請確認遊戲已載入完成' };
  }

  function codeFor(serial) {
    var s = ('0000' + serial).slice(-4);
    return 'ABYSS-' + s + '-' + suffix(serial);
  }

  function validate(code) {
    var m = /^ABYSS-(\d{4,6})-([A-Z0-9]{4})$/.exec(String(code || '').toUpperCase().replace(/\s/g, ''));
    if (!m) return false;
    return suffix(parseInt(m[1], 10)) === m[2];
  }

  function alreadyPaid() {
    try {
      return !!(window.__game && window.__game.debug && window.__game.debug.isPaid && window.__game.debug.isPaid());
    } catch (e) { return false; }
  }

  function redeem(code) {
    if (alreadyPaid()) return { ok: true, msg: '這個帳號已經解鎖過了' };
    if (!validate(code)) return { ok: false, msg: '解鎖碼不正確，請確認購買時收到的代碼' };
    var ok = false;
    try {
      ok = window.__game.debug.grantPaid();
    } catch (e) { ok = false; }
    return ok ? { ok: true, msg: '解鎖成功！3 名付費角色與混沌武器已開放' }
      : { ok: false, msg: '遊戲尚未載入完成，請稍後再試' };
  }

  /* 究極神秘武器禮包（HK$8）：解鎖全部傳說＋神話武器 */
  function redeemGift(code) {
    if (!validateGift(code)) return { ok: false, msg: '禮包碼不正確（格式 GIFT-XXXX-XXXX）' };
    var res = { ok: false, msg: '遊戲尚未載入完成，請稍後再試' };
    try {
      var added = window.__game.debug.grantWeaponPack();
      if (added >= 0) {
        res = { ok: true, msg: added > 0 ? ('禮包已開啟！新增 ' + added + ' 把傳說／神話武器') : '這個帳號已經擁有全部傳說與神話武器' };
      }
    } catch (e) { }
    return res;
  }

  function build() {
    if (modal) return modal;
    var frame = $('frame') || document.body;
    modal = document.createElement('div');
    modal.id = 'paidModal';
    modal.className = 'modal hidden';
    modal.innerHTML =
      '<div class="paid-panel">' +
      '<h2>Premium Pack</h2>' +
      '<p class="paid-sub">一次付款，永久解鎖</p>' +
      '<ul class="paid-list">' +
      '<li>星隕術士（隕星呼喚 / 星辰墜落）</li>' +
      '<li>時空旅者（時間凝滯 / 逆轉時軸）</li>' +
      '<li>龍裔（龍息 / 真龍降世）</li>' +
      '<li>混沌武器「炸天」</li>' +
      '</ul>' +
      '<p class="paid-how">Press the button below and wait 30 seconds — it is free.</p>' +
      '<div class="paid-row">' +
      '<button id="paidGo" class="primary">Unlock free (30s)</button>' +
      '</div>' +
      '<input id="paidCode" class="paid-input" placeholder="ABYSS-1234-ABCD" autocomplete="off" spellcheck="false">' +
      '<button id="paidOk" class="paid-submit">兌換</button>' +
      '<p id="paidMsg" class="paid-msg"></p>' +
      '<button id="paidClose" class="ghost paid-close">關閉</button>' +
      '</div>';
    frame.appendChild(modal);
    modal.addEventListener('click', function (ev) { if (ev.target === modal) close(); });

    var go = $('paidGo');
    if (go) go.addEventListener('click', function () {
      if (window.__packUnlock) window.__packUnlock('Premium pack');
    });
    var ok = $('paidOk');
    if (ok) ok.addEventListener('click', function () {
      var input = $('paidCode');
      var msg = $('paidMsg');
      var r = redeem(input ? input.value : '');
      if (msg) {
        msg.textContent = r.msg;
        msg.className = 'paid-msg ' + (r.ok ? 'ok' : 'bad');
      }
      if (r.ok && window.__toast) window.__toast(r.msg);
    });
    var input = $('paidCode');
    if (input) input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ok) ok.click();
    });
    var closeBtn = $('paidClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    return modal;
  }

  function openCode() {
    build();
    var msg = $('paidMsg');
    if (msg) { msg.textContent = ''; msg.className = 'paid-msg'; }
    modal.classList.remove('hidden');
    var input = $('paidCode');
    if (input) setTimeout(function () { try { input.focus(); } catch (e) {} }, 120);
  }

  function close() {
    if (modal) modal.classList.add('hidden');
    if (giftModal) giftModal.classList.add('hidden');
    if (wpnModal) wpnModal.classList.add('hidden');
    if (eqpModal) eqpModal.classList.add('hidden');
    if (flowTimer) { clearInterval(flowTimer); flowTimer = null; }
    if (flow) flow.classList.add('hidden');
  }

  var giftModal = null;
  function buildGift() {
    if (giftModal) return giftModal;
    var frame = $('frame') || document.body;
    giftModal = document.createElement('div');
    giftModal.id = 'giftModal';
    giftModal.className = 'modal hidden';
    giftModal.innerHTML =
      '<div class="paid-panel">' +
      '<h2>究極神秘武器禮包</h2>' +
      '<p class="paid-sub">Unlocks every Legendary and Mythic weapon</p>' +
      '<ul class="paid-list">' +
      '<li>全部 10 把傳說武器（每個稀有度 5 把 × 2 階）</li>' +
      '<li>全部 10 把神話武器</li>' +
      '<li>解鎖後直接進入寶箱池，可設為出戰武器</li>' +
      '<li>集滿後同時開放「究極核彈」</li>' +
      '</ul>' +
      '<p class="paid-how">Press the button below and wait 30 seconds — it is free.</p>' +
      '<div class="paid-row"><button id="giftGo" class="primary">Unlock free (30s)</button></div>' +
      '<input id="giftCode" class="paid-input" placeholder="GIFT-1234-ABCD" autocomplete="off" spellcheck="false">' +
      '<button id="giftOk" class="paid-submit">兌換禮包</button>' +
      '<p id="giftMsg" class="paid-msg"></p>' +
      '<button id="giftClose" class="ghost paid-close">關閉</button>' +
      '</div>';
    frame.appendChild(giftModal);
    giftModal.addEventListener('click', function (ev) { if (ev.target === giftModal) close(); });
    var go = $('giftGo');
    if (go) go.addEventListener('click', function () { if (window.__packUnlock) window.__packUnlock('Ultimate pack'); });
    var ok = $('giftOk');
    if (ok) ok.addEventListener('click', function () {
      var input = $('giftCode');
      var msg = $('giftMsg');
      var r = redeemGift(input ? input.value : '');
      if (msg) {
        msg.textContent = r.msg;
        msg.className = 'paid-msg ' + (r.ok ? 'ok' : 'bad');
      }
      if (r.ok && window.__toast) window.__toast(r.msg);
    });
    var gi = $('giftCode');
    if (gi) gi.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ok) ok.click(); });
    var gc = $('giftClose');
    if (gc) gc.addEventListener('click', close);
    return giftModal;
  }

  function openGiftCode() {
    buildGift();
    var msg = $('giftMsg');
    if (msg) { msg.textContent = ''; msg.className = 'paid-msg'; }
    giftModal.classList.remove('hidden');
    var input = $('giftCode');
    if (input) setTimeout(function () { try { input.focus(); } catch (e) {} }, 120);
  }

  var wpnModal = null;
  function buildWeapon() {
    if (wpnModal) return wpnModal;
    var frame = $('frame') || document.body;
    wpnModal = document.createElement('div');
    wpnModal.id = 'wpnModal';
    wpnModal.className = 'modal hidden';
    wpnModal.innerHTML =
      '<div class="paid-panel">' +
      '<h2>付費武器</h2>' +
      '<p class="paid-sub">每把武器需單獨購買，付款後取得武器碼</p>' +
      '<ul class="paid-list">' +
      '<li>炸天  — 雙管爆裂彈</li>' +
      '<li>冰霜加農  — 五連冰霰</li>' +
      '<li>雷霆  — 連鎖雷電</li>' +
      '<li>隕石  — 追蹤隕石</li>' +
      '</ul>' +
      '<p class="paid-how">① 按下方購買 → ② 付款 → ③ 你會收到 <b>WPN-XX-XXXX-XXXX</b> → ④ 貼到下面兌換</p>' +
      '<div class="paid-row"><button id="wpnGo" class="primary">前往購買武器</button></div>' +
      '<input id="wpnCode" class="paid-input" placeholder="WPN-01-0001-ABCD" autocomplete="off" spellcheck="false">' +
      '<button id="wpnOk" class="paid-submit">兌換武器</button>' +
      '<p id="wpnMsg" class="paid-msg"></p>' +
      '<button id="wpnClose" class="ghost paid-close">關閉</button>' +
      '</div>';
    frame.appendChild(wpnModal);
    wpnModal.addEventListener('click', function (ev) { if (ev.target === wpnModal) close(); });
    var go = $('wpnGo');
    if (go) go.addEventListener('click', function () { if (window.__packUnlock) window.__packUnlock('Weapons'); });
    var ok = $('wpnOk');
    if (ok) ok.addEventListener('click', function () {
      var input = $('wpnCode');
      var msg = $('wpnMsg');
      var r = redeemWeapon(input ? input.value : '');
      if (msg) { msg.textContent = r.msg; msg.className = 'paid-msg ' + (r.ok ? 'ok' : 'bad'); }
      if (r.ok && window.__toast) window.__toast(r.msg);
    });
    var wi = $('wpnCode');
    if (wi) wi.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ok) ok.click(); });
    var wc = $('wpnClose');
    if (wc) wc.addEventListener('click', close);
    return wpnModal;
  }

  function openWeaponCode() {
    buildWeapon();
    var msg = $('wpnMsg');
    if (msg) { msg.textContent = ''; msg.className = 'paid-msg'; }
    wpnModal.classList.remove('hidden');
    var input = $('wpnCode');
    if (input) setTimeout(function () { try { input.focus(); } catch (e) {} }, 120);
  }

  /* ---- 裝備：EQP-<編號>-<流水號>-<校驗>（1-5 傳說、6-10 神話） ---- */
  function eqpSuffix(idx, serial) {
    var h = fnv(EQP_SECRET + ':eqp:' + idx + ':' + serial).toString(36).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return h.slice(-4);
  }
  function equipCodeFor(idx, serial) {
    var i2 = ('0' + idx).slice(-2);
    var s = String(serial).padStart(4, '0');
    return 'EQP-' + i2 + '-' + s + '-' + eqpSuffix(idx, parseInt(s, 10));
  }
  function parseEquip(code) {
    var m = /^EQP-(\d{2})-(\d{4,6})-([A-Z0-9]{4})$/.exec(String(code || '').toUpperCase().replace(/\s/g, ''));
    if (!m) return null;
    var idx = parseInt(m[1], 10);
    var serial = parseInt(m[2], 10);
    if (idx < 1 || idx > 10) return null;
    if (eqpSuffix(idx, serial) !== m[3]) return null;
    var D = window.DATA || {};
    var all = (D.LEGEND_EQUIP || []).concat(D.MYTHIC_EQUIP || []);
    var item = all[idx - 1];
    return item ? item.id : null;
  }
  function validateEquip(code) { return !!parseEquip(code); }
  function redeemEquip(code) {
    var id = parseEquip(code);
    if (!id) return { ok: false, msg: '裝備碼不正確（格式 EQP-01-0001-ABCD）' };
    var ok = false;
    try { ok = window.__game.debug.grantEquip(id); } catch (e) { ok = false; }
    return ok ? { ok: true, msg: '裝備已解鎖，可在寶庫穿戴' }
      : { ok: false, msg: '無法解鎖，請確認遊戲已載入完成' };
  }

  var eqpModal = null;
  function buildEquip() {
    if (eqpModal) return eqpModal;
    var frame = $('frame') || document.body;
    eqpModal = document.createElement('div');
    eqpModal.id = 'eqpModal';
    eqpModal.className = 'modal hidden';
    eqpModal.innerHTML =
      '<div class="paid-panel">' +
      '<h2>付費裝備</h2>' +
      '<p class="paid-sub">每件裝備需單獨購買，付款後取得裝備碼</p>' +
      '<ul class="paid-list">' +
      '<li>Legendary gear (Dragon Scale, Star Amulet, Blood Moon Ring, Abyss Sigil, Gale Boots)</li>' +
      '<li>Mythic gear (Genesis Armor, Eternal Heart, Abyss Ring, Primordial Sigil, Fate Boots)</li>' +
      '</ul>' +
      '<p class="paid-how">① 按下方購買 → ② 付款 → ③ 你會收到 <b>EQP-XX-XXXX-XXXX</b> → ④ 貼到下面兌換</p>' +
      '<div class="paid-row"><button id="eqpGo" class="primary">前往購買裝備</button></div>' +
      '<input id="eqpCode" class="paid-input" placeholder="EQP-01-0001-ABCD" autocomplete="off" spellcheck="false">' +
      '<button id="eqpOk" class="paid-submit">兌換裝備</button>' +
      '<p id="eqpMsg" class="paid-msg"></p>' +
      '<button id="eqpClose" class="ghost paid-close">關閉</button>' +
      '</div>';
    frame.appendChild(eqpModal);
    eqpModal.addEventListener('click', function (ev) { if (ev.target === eqpModal) close(); });
    var go = $('eqpGo');
    if (go) go.addEventListener('click', function () { if (window.__packUnlock) window.__packUnlock('Gear'); });
    var ok = $('eqpOk');
    if (ok) ok.addEventListener('click', function () {
      var input = $('eqpCode');
      var msg = $('eqpMsg');
      var r = redeemEquip(input ? input.value : '');
      if (msg) { msg.textContent = r.msg; msg.className = 'paid-msg ' + (r.ok ? 'ok' : 'bad'); }
      if (r.ok && window.__toast) window.__toast(r.msg);
    });
    var ei = $('eqpCode');
    if (ei) ei.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ok) ok.click(); });
    var ec = $('eqpClose');
    if (ec) ec.addEventListener('click', close);
    return eqpModal;
  }

  function openEquipCode() {
    buildEquip();
    var msg = $('eqpMsg');
    if (msg) { msg.textContent = ''; msg.className = 'paid-msg'; }
    eqpModal.classList.remove('hidden');
    var input = $('eqpCode');
    if (input) setTimeout(function () { try { input.focus(); } catch (e) {} }, 120);
  }

  /* ============ 付款流程：掃碼 → 等 30 秒 → 我已付款／取消 ============ */
  var flow = null, flowTimer = null, flowCount = 0;
  function buildFlow() {
    if (flow) return flow;
    var frame = $('frame') || document.body;
    flow = document.createElement('div');
    flow.id = 'payFlow';
    flow.className = 'modal hidden';
    flow.innerHTML =
      '<div class="pay-panel">' +
      '<h2 id="pfTitle">購買</h2>' +
      '<div class="pf-price" id="pfPrice">FREE</div>' +
      '<p class="pf-msg" id="pfMsg">Free — press unlock and wait 30s</p>' +
      '<div class="pf-bar"><i id="pfBar"></i></div>' +
      '<p class="pf-wait" id="pfWait">付款後請稍候 30 秒…</p>' +
      '<div class="pf-btns hidden" id="pfButtons">' +
      '<button id="pfOk" class="pf-ok">我已付款</button>' +
      '<button id="pfCancel" class="pf-cancel">取消</button>' +
      '</div>' +
      '<button id="pfCode" class="pf-code-link">有解鎖碼？改為輸入</button>' +
      '</div>';
    frame.appendChild(flow);
    flow.addEventListener('click', function (ev) { if (ev.target === flow) closeFlow(); });
    return flow;
  }

  function closeFlow() {
    if (flowTimer) { clearInterval(flowTimer); flowTimer = null; }
    if (flow) flow.classList.add('hidden');
  }

  function payFlow(cfg) {
    buildFlow();
    var t = $('pfTitle'), p = $('pfPrice'), msg = $('pfMsg'), bar = $('pfBar'), wait = $('pfWait');
    var btns = $('pfButtons'), ok = $('pfOk'), cancel = $('pfCancel'), codeBtn = $('pfCode');
    if (t) t.textContent = cfg.title;
    if (p) p.textContent = cfg.price;
    if (msg) { msg.textContent = '請完成付款 ' + cfg.price; msg.className = 'pf-msg'; }
    if (bar) bar.style.width = '0%';
    if (wait) wait.textContent = '付款後請稍候 30 秒…';
    if (btns) btns.classList.add('hidden');

    flow.classList.remove('hidden');
    flowCount = 0;
    if (flowTimer) clearInterval(flowTimer);
    flowTimer = setInterval(function () {
      flowCount++;
      var pct = Math.min(100, flowCount / 30 * 100);
      if (bar) bar.style.width = pct + '%';
      if (wait) wait.textContent = flowCount < 30
        ? ('付款後請稍候 ' + (30 - flowCount) + ' 秒…')
        : '已經可以確認付款了';
      if (flowCount >= 30) {
        clearInterval(flowTimer);
        flowTimer = null;
        if (btns) btns.classList.remove('hidden');
        if (msg) msg.textContent = '完成付款了嗎？';
      }
    }, 1000);

    if (ok) ok.onclick = function () {
      var r = cfg.onPaid();
      var done = (r === undefined) ? true : r;
      if (done) {
        if (msg) { msg.textContent = '✓ 已解鎖，祝你玩得開心！'; msg.className = 'pf-msg ok'; }
        if (btns) btns.classList.add('hidden');
        if (window.__toast) window.__toast('已解鎖！');
        setTimeout(closeFlow, 1200);
      } else {
        if (msg) { msg.textContent = '解鎖失敗，請重新開啟遊戲再試'; msg.className = 'pf-msg bad'; }
      }
    };
    if (cancel) cancel.onclick = closeFlow;
    if (codeBtn) codeBtn.onclick = function () { closeFlow(); cfg.codeOpen(); };
  }

  function open() { if (window.__packUnlock) return window.__packUnlock('Premium pack'); }
  function openGift() { if (window.__packUnlock) return window.__packUnlock('Ultimate pack'); }
  function openWeapon(id) {
    var PRICES = { chaos: 'FREE', frostcannon: 'FREE', thunder: 'FREE', meteor: 'FREE' };
    payFlow({
      title: '付費武器', price: 'FREE',
      onPaid: function () { try { return window.__game.debug.grantWeapon(id); } catch (e) { return false; } },
      codeOpen: openWeaponCode
    });
  }
  function openEquip(id, rarity) {
    payFlow({
      title: '付費裝備', price: 'FREE',
      onPaid: function () { try { return window.__game.debug.grantEquip(id); } catch (e) { return false; } },
      codeOpen: openEquipCode
    });
  }

  function boot() {
    var buy = $('btnBuy');
    if (buy) buy.addEventListener('click', function () { if (window.__packUnlock) window.__packUnlock('Premium pack'); });
    var red = $('btnRedeem');
    if (red) red.addEventListener('click', open);
    var gBuy = $('btnGiftBuy');
    if (gBuy) gBuy.addEventListener('click', function () { if (window.__packUnlock) window.__packUnlock('Ultimate pack'); });
    var gRed = $('btnGiftRedeem');
    if (gRed) gRed.addEventListener('click', openGift);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  return {
    open: open, openGift: openGift, openWeapon: openWeapon, openEquip: openEquip, close: close,
    validate: validate, validateGift: validateGift, validateWeapon: validateWeapon, validateEquip: validateEquip,
    redeem: redeem, redeemGift: redeemGift, redeemWeapon: redeemWeapon, redeemEquip: redeemEquip,
    codeFor: codeFor, giftCodeFor: giftCodeFor, weaponCodeFor: weaponCodeFor, equipCodeFor: equipCodeFor,
    WPN_IDS: WPN_IDS,
    isPaid: alreadyPaid
  };
})();
