/* =========================================================================
   news.js — 更新公告
   -------------------------------------------------------------------------
   * 讀取 changelog.json（每次帶 ?t= 破快取）
   * 有新版本沒看過 → 左下角「公告」按鈕出現紅點，首次進入自動彈出一次
   * 看完會記住版本，不會一直重複彈
   ========================================================================= */
window.News = (function () {
  'use strict';

  var SEEN_KEY = 'abyss.newsSeen';
  var data = null;
  var panel = null;
  var loading = null;

  function $(id) { return document.getElementById(id); }

  function fetchNews() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch('changelog.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { data = (j && j.entries) ? j : { entries: [] }; return data; })
      .catch(function () { data = { entries: [] }; return data; });
    return loading;
  }

  function latest() {
    return (data && data.entries && data.entries[0]) ? data.entries[0] : null;
  }

  function seenKeyOf(entry) {
    return entry ? (entry.version + '|' + (entry.date || '')) : '';
  }

  function isUnread() {
    var e = latest();
    if (!e) return false;
    var seen = '';
    try { seen = localStorage.getItem(SEEN_KEY) || ''; } catch (err) {}
    return seen !== seenKeyOf(e);
  }

  function markSeen() {
    var e = latest();
    if (!e) return;
    try { localStorage.setItem(SEEN_KEY, seenKeyOf(e)); } catch (err) {}
    refreshDot();
  }

  function refreshDot() {
    var dot = $('newsDot');
    var btn = $('btnNews');
    if (!dot) return;
    if (isUnread()) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
    if (btn) btn.setAttribute('aria-label', isUnread() ? '公告（有新內容）' : '公告');
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function build() {
    if (panel) return panel;
    var frame = $('frame') || document.body;
    panel = document.createElement('div');
    panel.id = 'newsModal';
    panel.className = 'modal hidden';
    panel.innerHTML =
      '<div class="news-panel">' +
      '<div class="news-head"><h2>更新公告</h2><span class="news-ver" id="newsVer"></span></div>' +
      '<div class="news-list" id="newsList"></div>' +
      '<button class="news-ok" id="newsOk">知道了</button>' +
      '</div>';
    frame.appendChild(panel);
    panel.addEventListener('click', function (ev) {
      if (ev.target === panel) close();
    });
    var ok = $('newsOk');
    if (ok) ok.addEventListener('click', close);
    return panel;
  }

  function open() {
    fetchNews().then(function () {
      build();
      var verEl = $('newsVer');
      if (verEl) verEl.textContent = 'v' + (window.GAME_VERSION || '');
      var listEl = $('newsList');
      if (listEl) {
        if (!data.entries.length) {
          listEl.innerHTML = '<p class="news-empty">No announcements yet</p>';
        } else {
          var html = '';
          for (var i = 0; i < Math.min(4, data.entries.length); i++) {
            var e = data.entries[i];
            html += '<section class="news-entry' + (i === 0 ? ' latest' : '') + '">';
            html += '<h3>' + (i === 0 ? '<i class="news-new">最新</i>' : '') +
              esc((window.I18N && I18N.lang && I18N.lang() === 'en' && e.titleEn) ? e.titleEn : (e.title || 'Update')) + '<b>v' + esc(e.version) + '</b>' +
              '<em>' + esc(e.date || '') + '</em></h3>';
            html += '<ul>';
            var isEn = !!(window.I18N && I18N.lang && I18N.lang() === 'en');
      var items = (isEn && e.itemsEn && e.itemsEn.length) ? e.itemsEn
        : (isEn ? ['Balance and content improvements.'] : (e.items || []));
      items.forEach(function (it) { html += '<li>' + esc(it) + '</li>'; });
            html += '</ul></section>';
          }
          /* 置頂公告：所有商店內容免費（等 30 秒） */
    var PINNED = '<div class="news-item pinned"><div class="news-head"><span>📌 Pinned</span><b>Free unlocks</b></div>' +
      '<ul><li>Every shop item is <b>free</b>: press the button and wait <b>30 seconds</b>.</li>' +
      '<li>No payment, no code required.</li>' +
      '<li>Waiting works on both desktop and mobile.</li></ul></div>';
    listEl.innerHTML = PINNED + html;
        }
      }
      panel.classList.remove('hidden');
      markSeen();
    });
  }

  function close() {
    if (panel) panel.classList.add('hidden');
  }

  function autoShow() {
    fetchNews().then(function () {
      refreshDot();
      /* 戰鬥中不要彈公告（更新後重載可能剛好在戰鬥中） */
      if (window.__inRun && window.__inRun()) return;
      if (isUnread()) setTimeout(open, 1400);
    });
  }

  function boot() {
    fetchNews().then(refreshDot);
    var btn = $('btnNews');
    if (btn) btn.addEventListener('click', open);
    setTimeout(autoShow, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  return { open: open, close: close, isUnread: isUnread, markSeen: markSeen, reload: fetchNews };
})();
