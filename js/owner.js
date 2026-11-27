/* =========================================================================
   owner.js — 主人專屬模式（全部武器免費、全角色解鎖）
   -------------------------------------------------------------------------
   啟用方式（只需一次）：
     https://<你的專屬網址>/?owner=abyss-owner-7731
   之後同一部裝置會記住，直接開網址就是主人模式。
   ========================================================================= */
(function () {
  'use strict';

  var KEY = 'abyss.owner';
  var HASH = 'abyss-owner-7731';
  var on = false;

  try {
    if (location.search.indexOf('owner=' + HASH) >= 0) {
      localStorage.setItem(KEY, '1');
      on = true;
    }
    if (localStorage.getItem(KEY) === '1') on = true;
  } catch (e) {}

  if (!on) return;

  function apply() {
    try {
      if (window.__game && window.__game.debug && window.__game.debug.ownerMode) {
        window.__game.debug.ownerMode();
        document.title = '深淵迴響 · OWNER';
        document.body.classList.add('owner-mode');
        if (window.__toast) window.__toast('主人模式：全部武器與角色已解鎖');
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 900); });
  } else {
    setTimeout(apply, 900);
  }
})();
