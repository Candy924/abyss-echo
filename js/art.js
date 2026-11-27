/* =========================================================================
   art.js — 所有美術皆由程式即時繪製（零外部檔案、零授權問題）
   - 480x270 內部解析度，CSS 放大 → 像素風
   - 角色 6 種體型 × 調色盤、敵人 5 種原型 × 調色盤
   ========================================================================= */
window.Art = (function () {
  'use strict';

  var C = {
    ink: '#07060c', steel: '#e7edfb', steelMid: '#a9b4cd', steelDark: '#6b7492',
    red: '#e2574c', redDark: '#93211b', gold: '#f3c250', goldLit: '#ffe6a1', goldDark: '#a8791d',
    violet: '#8e6bf2', violetLit: '#c9b6ff', violetDark: '#432c94',
    mint: '#57e0a8', green: '#59cf74', greenDark: '#2a7f43',
    bone: '#efe9d8', boneShade: '#c3bba4', brown: '#8a5a35', brownDark: '#4f301a',
    skin: '#f2c9a2', blue: '#63a9f0', purple: '#b98cf0'
  };

  function box(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
  }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function fillRR(g, x, y, w, h, r, col) {
    g.fillStyle = col;
    rr(g, x, y, w, h, r);
    g.fill();
  }
  function shadow(g, x, y, rx, ry) {
    g.save();
    g.globalAlpha = 0.34;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(x | 0, y | 0, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function glow(g, x, y, r, col, alpha) {
    var grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, col);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = alpha == null ? 0.5 : alpha;
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function rng(seed) {
    var a = (seed || 1) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function darken(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * k) + ',' + Math.round(gg * k) + ',' + Math.round(b * k) + ')';
  }

  /* =====================================================================
     英雄：6 種體型
     ===================================================================== */
  var P_DEFAULT = { a: '#c8d2e6', b: '#8b96b4', c: '#e2574c', d: '#f3c250' };

  function heroKnight(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 11) : 0;
    var step = Math.round(sw * 1.6);
    box(g, -4, -2 + step, 3, 5, p.b);
    box(g, 1, -2 - step, 3, 5, p.b);
    box(g, -4, 1 + step, 3, 2, C.ink);
    box(g, 1, 1 - step, 3, 2, C.ink);
    box(g, -6, -10, 12, 10, p.c);
    box(g, -5, -10, 10, 8, p.b);
    box(g, -3, -9, 7, 6, p.a);
    box(g, -5, -3, 10, 1, p.d);
    box(g, -6, -10, 3, 4, p.a);
    box(g, 3, -10, 3, 4, p.a);
    box(g, -4, -16, 8, 7, p.a);
    box(g, -3, -13, 7, 2, C.ink);
    box(g, 1, -13, 2, 1, ex && ex.skill ? p.d : p.c);
    box(g, -4, -16, 8, 1, '#ffffff');
    var w = Math.round(Math.sin(t * 6) * 1);
    box(g, -1 + w, -21, 2, 5, p.c);
    box(g, 5, -6, 2, 5, p.b);
    box(g, 5, -12, 2, 6, '#eef4ff');
    box(g, 4, -7, 4, 1, p.d);
    if (ex && ex.skill) {
      g.save();
      g.globalAlpha = 0.30 + Math.sin(t * 12) * 0.08;
      fillRR(g, -10, -18, 20, 22, 8, p.d);
      g.globalAlpha = 0.85;
      rr(g, -10, -18, 20, 22, 8);
      g.strokeStyle = p.d; g.lineWidth = 1; g.stroke();
      g.restore();
    }
  }

  function heroMage(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 10) : 0;
    var bob = Math.round(sw * 1);
    fillRR(g, -6, -9 + bob, 12, 11, 2, p.b);
    fillRR(g, -5, -9 + bob, 10, 9, 2, p.a);
    box(g, -5, -1 + bob, 10, 2, p.b);
    box(g, -1, -8 + bob, 2, 7, p.c);
    box(g, -4, 1, 3, 2, C.ink);
    box(g, 1, 1, 3, 2, C.ink);
    box(g, -3, -14 + bob, 6, 6, C.skin);
    box(g, -2, -12 + bob, 1, 1, C.ink);
    box(g, 1, -12 + bob, 1, 1, C.ink);
    box(g, -6, -16 + bob, 12, 2, p.b);
    box(g, -4, -20 + bob, 8, 4, p.a);
    box(g, -2, -23 + bob, 5, 3, p.a);
    box(g, 0, -25 + bob, 3, 2, p.c);
    box(g, -5, -16 + bob, 10, 1, p.d);
    box(g, 5, -15 + bob, 2, 15, C.brown);
    glow(g, 6, -17 + bob, 9, p.c, 0.55 + Math.sin(t * 5) * 0.15);
    box(g, 5, -19 + bob, 4, 4, p.c);
    box(g, 6, -18 + bob, 2, 2, '#ffffff');
    if (ex && ex.skill) glow(g, 0, -8, 30, p.c, 0.45);
  }

  function heroRanger(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 12) : 0;
    var step = Math.round(sw * 2);
    box(g, -4, -2 + step, 3, 5, p.b);
    box(g, 1, -2 - step, 3, 5, p.b);
    box(g, -4, 1 + step, 3, 2, C.ink);
    box(g, 1, 1 - step, 3, 2, C.ink);
    fillRR(g, -6, -11, 12, 11, 2, p.b);
    fillRR(g, -4, -10, 8, 8, 2, p.a);
    box(g, -3, -15, 6, 6, C.skin);
    box(g, -5, -17, 10, 4, p.a);
    box(g, -6, -15, 2, 6, p.a);
    box(g, 4, -15, 2, 6, p.a);
    box(g, -3, -13, 2, 1, p.c);
    box(g, 1, -13, 2, 1, p.c);
    g.save();
    g.strokeStyle = p.d; g.lineWidth = 2;
    g.beginPath(); g.arc(7, -6, 6, -1.1, 1.1); g.stroke();
    g.strokeStyle = '#d8d0bc'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(5, -11); g.lineTo(5, -1); g.stroke();
    g.restore();
    if (ex && ex.skill) glow(g, 0, -6, 22, p.c, 0.4);
  }

  function heroTech(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 11) : 0;
    var step = Math.round(sw * 1.5);
    box(g, -4, -2 + step, 3, 5, p.b);
    box(g, 1, -2 - step, 3, 5, p.b);
    box(g, -4, 1 + step, 3, 2, C.ink);
    box(g, 1, 1 - step, 3, 2, C.ink);
    /* 背包 */
    box(g, -9, -11, 3, 9, p.b);
    box(g, -9, -10, 3, 2, p.c);
    /* 大衣 */
    fillRR(g, -5, -11, 10, 11, 2, p.a);
    box(g, -5, -12, 10, 3, p.b);
    box(g, -3, -6, 6, 2, p.b);
    box(g, -1, -10, 2, 4, p.c);
    /* 頭 + 護目鏡 */
    box(g, -3, -17, 6, 6, C.skin);
    box(g, -4, -18, 8, 3, p.b);
    box(g, -4, -15, 8, 2, p.c);
    box(g, -3, -15, 2, 2, '#8cf0ff');
    box(g, 1, -15, 2, 2, '#8cf0ff');
    /* 扳手 */
    box(g, 6, -10, 2, 8, p.d);
    box(g, 5, -12, 4, 2, p.d);
    if (ex && ex.skill) glow(g, 0, -8, 24, p.c, 0.45);
  }

  function heroRobe(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 9) : 0;
    var bob = Math.round(sw * 1);
    fillRR(g, -7, -9 + bob, 14, 12, 3, p.b);
    fillRR(g, -5, -9 + bob, 10, 9, 2.5, p.a);
    box(g, -5, -2 + bob, 10, 2, p.b);
    box(g, -4, 1, 3, 2, C.ink);
    box(g, 1, 1, 3, 2, C.ink);
    box(g, -3, -15 + bob, 6, 6, C.skin);
    box(g, -3, -16 + bob, 6, 2, p.c);
    box(g, -2, -13 + bob, 1, 1, C.ink);
    box(g, 1, -13 + bob, 1, 1, C.ink);
    box(g, -4, -10 + bob, 8, 2, p.b);
    g.save();
    g.strokeStyle = p.d; g.lineWidth = 2;
    g.beginPath(); g.moveTo(7, -14); g.lineTo(7, 2); g.stroke();
    g.restore();
    if (ex && ex.skill) glow(g, 0, -8, 26, p.c, 0.5);
  }

  function heroBulky(g, t, walk, ex, p) {
    var sw = walk ? Math.sin(t * 9) : 0;
    var step = Math.round(sw * 1.6);
    box(g, -5, -2 + step, 4, 5, p.b);
    box(g, 1, -2 - step, 4, 5, p.b);
    box(g, -5, 1 + step, 4, 2, C.ink);
    box(g, 1, 1 - step, 4, 2, C.ink);
    /* 大肩膀 */
    fillRR(g, -9, -13, 18, 9, 3, p.b);
    fillRR(g, -7, -12, 14, 8, 2.5, p.a);
    box(g, -2, -11, 4, 7, p.c);
    box(g, -7, -5, 14, 4, p.b);
    /* 頭 */
    box(g, -4, -19, 8, 7, C.skin);
    box(g, -4, -20, 8, 2, p.b);
    box(g, -3, -16, 2, 1, C.ink);
    box(g, 1, -16, 2, 1, C.ink);
    box(g, -4, -15, 8, 2, p.b);
    /* 巨斧 */
    box(g, 7, -14, 2, 15, p.d);
    g.save();
    g.fillStyle = p.d;
    g.beginPath();
    g.moveTo(9, -15); g.lineTo(14, -12); g.lineTo(14, -7); g.lineTo(9, -9);
    g.closePath(); g.fill();
    g.restore();
    if (ex && ex.skill) glow(g, 0, -10, 28, p.c, 0.5);
  }

  var HERO_FN = { knight: heroKnight, mage: heroMage, ranger: heroRanger, tech: heroTech, robe: heroRobe, bulky: heroBulky };


  /* ---------------- 英雄 sprite sheet（32x32, 4 方向 x 6 幀） ---------------- */
  var HERO_SHEET_SRC = {
    hollow: 'assets/heroes/hollow/sheet-32.png',
    cinder: 'assets/heroes/cinder/sheet-32.png',
    vesper: 'assets/heroes/vesper/sheet-32.png',
    morrigan: 'assets/heroes/morrigan/sheet-32.png',
    ferrum: 'assets/heroes/ferrum/sheet-32.png',
    nix: 'assets/heroes/nix/sheet-32.png',
    wraith: 'assets/heroes/wraith/sheet-32.png',
    grub: 'assets/heroes/grub/sheet-32.png',
    sable: 'assets/heroes/sable/sheet-32.png',
    lumen: 'assets/heroes/lumen/sheet-32.png',
    thorne: 'assets/heroes/thorne/sheet-32.png'
  };
  var HERO_SHEETS = {};
  (function loadHeroSheets() {
    if (typeof Image === 'undefined') return;
    Object.keys(HERO_SHEET_SRC).forEach(function (k) {
      var img = new Image();
      img.onload = function () { HERO_SHEETS[k] = img; };
      img.src = HERO_SHEET_SRC[k];
    });
  })();

  var DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  /* dir: 'down'|'left'|'right'|'up'，frame 0-3 走路 / 4-5 施法 */
  function drawHeroSheet(g, id, x, y, dir, walkFrame, cast, scale) {
    var img = HERO_SHEETS[id];
    if (!img || !img.width) return false;
    var row = DIR_ROW[dir] || 0;
    var col = cast ? (4 + (walkFrame % 2)) : (walkFrame % 4);
    var sc = scale || 1.22;
    g.save();
    try { g.imageSmoothingEnabled = false; } catch (e) {}
    g.drawImage(img, col * 32, row * 32, 32, 32,
      Math.round(x - 16 * sc), Math.round(y - 27 * sc), Math.round(32 * sc), Math.round(32 * sc));
    g.restore();
    return true;
  }

  function drawHero(g, kind, x, y, t, face, walk, extra, pal) {
    /* 新版：11 隻角色的 32x32 4 方向動畫 */
    if (pal && pal.spriteId && HERO_SHEETS[pal.spriteId]) {
      var dir = (extra && extra.dir) || (face < 0 ? 'left' : 'down');
      var wf = Math.floor(t * 6) % 4;
      var casting = !!(extra && extra.cast);
      return drawHeroSheet(g, pal.spriteId, x, y, dir, walk ? wf : 0, casting, extra && extra.scale);
    }
    /* 有英雄素材圖就用素材（帶走動彈跳） */
    if (pal && pal.sprite && SPRITES[pal.sprite]) {
      var hb = Math.sin(t * 6) * 1.2;
      var hs = 1 + Math.sin(t * 6) * 0.03;
      g.save();
      g.translate(Math.round(x), Math.round(y + hb * 0.4));
      drawSpriteFit(g, pal.sprite, 0, -13, 30, face, hs, 0);
      g.restore();
      return;
    }
    var p = pal || P_DEFAULT;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    var bob = walk ? Math.round(Math.sin(t * 11) * 0.8) : 0;
    shadow(g, 0, 2, 6.5, 2.2);
    g.translate(0, bob);
    if (face < 0) g.scale(-1, 1);
    (HERO_FN[kind] || heroKnight)(g, t, walk, extra || {}, p);
    g.restore();
  }

  /* =====================================================================
     敵人：5 種原型
     ===================================================================== */
  function enemyBlob(g, t, p) {
    var sq = 1 + Math.sin(t * 5) * 0.08;
    var w = 13 * sq, h = 11 / sq;
    g.save();
    g.translate(0, h * 0.5);
    fillRR(g, -w / 2, -h, w, h, 4, p.dark);
    fillRR(g, -w / 2 + 1, -h + 1, w - 2, h - 2, 3.5, p.body);
    fillRR(g, -w / 2 + 2, -h + 2, w * 0.34, h * 0.28, 1.5, 'rgba(255,255,255,.42)');
    box(g, -3, -6, 2, 2, p.eye);
    box(g, 2, -6, 2, 2, p.eye);
    box(g, -3, -6, 1, 1, '#ffffff');
    box(g, 2, -6, 1, 1, '#ffffff');
    box(g, -5, -1, 3, 2, p.accent);
    g.restore();
  }

  function enemyFlyer(g, t, p) {
    var f = Math.sin(t * 16);
    g.save();
    g.translate(0, -6 + Math.sin(t * 4) * 1.5);
    g.fillStyle = p.dark;
    g.beginPath();
    g.moveTo(-2, 0); g.lineTo(-12, -3 - f * 4); g.lineTo(-10, 3); g.lineTo(-3, 2); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(2, 0); g.lineTo(12, -3 - f * 4); g.lineTo(10, 3); g.lineTo(3, 2); g.closePath(); g.fill();
    fillRR(g, -4, -4, 8, 8, 3, p.dark);
    fillRR(g, -3, -3, 6, 6, 2.5, p.body);
    box(g, -3, -6, 2, 2, p.dark);
    box(g, 1, -6, 2, 2, p.dark);
    box(g, -2, -2, 1, 2, p.eye);
    box(g, 1, -2, 1, 2, p.eye);
    g.restore();
  }

  function enemyCaster(g, t, p) {
    var sw = Math.sin(t * 4) * 1;
    fillRR(g, -6, -9, 12, 12, 3, p.dark);
    fillRR(g, -5, -8, 10, 9, 2.5, p.body);
    box(g, -4, -16, 8, 7, C.bone);
    box(g, -4, -10, 8, 1, C.boneShade);
    box(g, -3, -13, 2, 2, C.ink);
    box(g, 1, -13, 2, 2, C.ink);
    box(g, -3, -13, 1, 1, p.eye);
    box(g, 1, -13, 1, 1, p.eye);
    box(g, -2, -11, 1, 1, C.ink);
    box(g, 1, -11, 1, 1, C.ink);
    box(g, 6, -14 + sw, 2, 15, C.brownDark);
    glow(g, 7, -16 + sw, 8, p.accent, 0.45);
    box(g, 6, -18 + sw, 3, 3, p.accent);
  }

  function enemyCharger(g, t, walk, p) {
    var step = Math.round(Math.sin(t * 12) * (walk ? 2 : 0));
    box(g, -6, -1 + step, 3, 4, p.dark);
    box(g, 3, -1 - step, 3, 4, p.dark);
    fillRR(g, -8, -10, 16, 10, 4, p.dark);
    fillRR(g, -7, -9, 14, 8, 3.5, p.body);
    box(g, -5, -11, 2, 2, p.dark);
    box(g, -1, -12, 2, 3, p.dark);
    box(g, 3, -11, 2, 2, p.dark);
    fillRR(g, 5, -7, 7, 7, 3, p.body);
    box(g, 9, -3, 2, 2, p.eye);
    box(g, 11, -2, 2, 1, C.bone);
    box(g, 11, -4, 1, 1, C.bone);
    box(g, -3, -6, 2, 2, p.eye);
  }

  function enemyTank(g, t, walk, p) {
    var step = Math.round(Math.sin(t * 7) * (walk ? 1 : 0));
    box(g, -7, -2 + step, 4, 5, p.dark);
    box(g, 3, -2 - step, 4, 5, p.dark);
    fillRR(g, -11, -16, 22, 15, 5, p.dark);
    fillRR(g, -9, -15, 18, 12, 4, p.body);
    box(g, -9, -8, 18, 3, p.dark);
    box(g, -6, -13, 4, 3, p.accent);
    box(g, 2, -13, 4, 3, p.accent);
    fillRR(g, -5, -22, 10, 8, 3, p.dark);
    box(g, -3, -19, 2, 2, p.eye);
    box(g, 1, -19, 2, 2, p.eye);
    box(g, -11, -14, 3, 6, p.dark);
    box(g, 8, -14, 3, 6, p.dark);
  }

  var ENEMY_FN = { blob: enemyBlob, flyer: enemyFlyer, caster: enemyCaster, charger: enemyCharger, tank: enemyTank };

  /* 小怪素材：依種類名稱穩定分配，同一隻怪永遠同一張圖 */
  var MOB_SPRITE_KEYS = ['mob-skull-cat', 'mob-ogre', 'mob-orc', 'mob-cat-yellow', 'mob-cat-white',
    'mob-skull-cat2', 'mob-mushroom-hat', 'mob-beetle', 'mob-knight', 'mob-sunflower', 'mob-cat-grey'];

  function mobSpriteFor(kind) {
    var h = 0;
    for (var i = 0; i < String(kind).length; i++) h = (h * 31 + String(kind).charCodeAt(i)) % 9973;
    return MOB_SPRITE_KEYS[h % MOB_SPRITE_KEYS.length];
  }

  function drawEnemy(g, arch, x, y, t, face, flash, walk, pal, scale) {
    /* 有素材就畫素材小怪（帶走路動畫） */
    var mk = pal && pal.sprite && SPRITES[pal.sprite];
    if (mk) {
      var bob = Math.sin(t * 6 + (walk || 0)) * 1.6;
      var squash = 1 + Math.sin(t * 6 + (walk || 0)) * 0.05;
      g.save();
      g.translate(Math.round(x), Math.round(y + bob * 0.5));
      if (scale && scale !== 1) g.scale(scale, scale);
      drawSpriteFit(g, pal.sprite, 0, -12, 26, face, squash, 0);
      if (flash) {
        g.globalAlpha = 0.55 * flash;
        g.globalCompositeOperation = 'lighter';
        drawSpriteFit(g, pal.sprite, 0, -12, 26, face, squash, 0);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      }
      g.restore();
      return;
    }
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (arch !== 'flyer') shadow(g, 0, 1, 7, 2.2);
    if (scale && scale !== 1) g.scale(scale, scale);
    if (face < 0) g.scale(-1, 1);
    (ENEMY_FN[arch] || enemyBlob)(g, t, pal, walk);
    if (flash) {
      g.globalAlpha = 0.55 * flash;
      fillRR(g, -12, -22, 24, 24, 8, '#ffffff');
      g.globalAlpha = 1;
    }
    g.restore();
  }

  /* ---------------- 頭目 ---------------- */
  /* =====================================================================
     首領造型：每種 boss 一種完全不同的輪廓（arch）
     ===================================================================== */
  function drawBossArch(g, arch, pal, t, fl, hpRatio) {
    var a = pal.accent, b = pal.body, d = pal.dark, e = pal.eye;
    var pulse = 0.6 + Math.sin(t * 4) * 0.4;

    if (arch === 'mech') {
      /* 巨大機械巨獸：方形裝甲 + 炮管 + 反應爐 */
      fillRR(g, -22, -26, 44, 26, 5, d);
      fillRR(g, -19, -24, 38, 20, 4, b);
      box(g, -14, -20, 28, 3, a);
      box(g, -6, -12, 12, 6, d);
      glow(g, 0, -9, 12, a, pulse);
      box(g, -21, -30, 12, 8, d);          /* 肩炮 */
      box(g, 9, -30, 12, 8, d);
      fillRR(g, -8, -36, 16, 12, 3, d);    /* 頭 */
      box(g, -4, -32, 3, 2, e); box(g, 1, -32, 3, 2, e);
      for (var m1 = 0; m1 < 3; m1++) box(g, -16 + m1 * 12, 0, 8, 3, d);
      return;
    }
    if (arch === 'beast') {
      /* 四足巨獸：低伏身軀 + 獸首 + 尾 */
      fillRR(g, -20, -18, 40, 18, 8, b);
      fillRR(g, -14, -16, 28, 12, 6, d);
      box(g, -22, -8, 8, 10, b); box(g, 14, -8, 8, 10, b);
      fillRR(g, -10, -30, 20, 16, 5, b);
      box(g, -7, -24, 4, 3, e); box(g, 3, -24, 4, 3, e);
      box(g, -9, -34, 3, 6, a); box(g, 6, -34, 3, 6, a);   /* 角 */
      fillRR(g, 6, -22, 14, 5, 2, d);                       /* 尾 */
      return;
    }
    if (arch === 'human') {
      /* 現代人：風衣 + 步槍 + 帽子 */
      fillRR(g, -12, -22, 24, 22, 4, d);
      fillRR(g, -9, -20, 18, 16, 3, b);
      box(g, -4, -18, 8, 10, a);                            /* 領帶 */
      fillRR(g, -8, -32, 16, 12, 3, b);                     /* 頭 */
      box(g, -9, -35, 18, 4, d);                            /* 帽 */
      box(g, -5, -28, 3, 2, e); box(g, 2, -28, 3, 2, e);
      fillRR(g, 8, -20, 16, 3, 1, d);                       /* 槍 */
      box(g, 20, -20, 5, 3, a);
      box(g, -14, -18, 4, 12, d);
      return;
    }
    if (arch === 'eye') {
      /* 巨眼：漂浮眼球 + 觸手 */
      var rr = 16 + Math.sin(t * 3) * 1.5;
      g.fillStyle = b; g.beginPath(); g.arc(0, -18, rr, 0, Math.PI * 2); g.fill();
      g.fillStyle = d; g.beginPath(); g.arc(0, -18, rr * 0.62, 0, Math.PI * 2); g.fill();
      g.fillStyle = e; g.beginPath(); g.arc(0, -18, rr * 0.34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(0, -18, rr * 0.16, 0, Math.PI * 2); g.fill();
      for (var tn = 0; tn < 6; tn++) {
        var ta = tn / 6 * Math.PI * 2 + t * 0.6;
        g.strokeStyle = b; g.lineWidth = 3;
        g.beginPath();
        g.moveTo(Math.cos(ta) * 8, -12);
        g.quadraticCurveTo(Math.cos(ta) * 20, 2, Math.cos(ta) * 16, 8 + Math.sin(t + tn) * 2);
        g.stroke();
      }
      return;
    }
    if (arch === 'serpent') {
      /* 巨蛇：多節身軀盤繞 */
      for (var sg = 5; sg >= 0; sg--) {
        var sx = Math.sin(t * 1.6 + sg * 0.8) * 10;
        var sy = 4 - sg * 6;
        g.fillStyle = sg === 0 ? b : d;
        g.beginPath(); g.arc(sx, sy, 8 - sg * 0.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = b;
        g.beginPath(); g.arc(sx, sy, 5 - sg * 0.4, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = d; g.beginPath(); g.arc(Math.sin(t * 1.6 + 6 * 0.8) * 10, -38, 9, 0, Math.PI * 2); g.fill();
      box(g, -5, -41, 3, 2, e); box(g, 2, -41, 3, 2, e);
      return;
    }
    if (arch === 'golem2') {
      /* 熔岩魔像：巨大岩塊 */
      fillRR(g, -20, -30, 40, 30, 6, d);
      fillRR(g, -16, -27, 32, 25, 5, b);
      box(g, -10, -22, 20, 2, a); box(g, -6, -16, 12, 2, a);
      glow(g, 0, -14, 16, a, pulse * 0.8);
      fillRR(g, -9, -38, 18, 10, 4, d);
      box(g, -6, -34, 3, 2, e); box(g, 3, -34, 3, 2, e);
      box(g, -24, -24, 6, 16, b); box(g, 18, -24, 6, 16, b);
      return;
    }
    if (arch === 'wraith') {
      /* 幽魂王：漂浮斗篷 + 鐮刀 */
      g.fillStyle = d;
      g.beginPath();
      g.moveTo(-16, 2); g.quadraticCurveTo(-12, -34, 0, -38);
      g.quadraticCurveTo(12, -34, 16, 2);
      g.quadraticCurveTo(0, 8, -16, 2);
      g.fill();
      fillRR(g, -7, -32, 14, 12, 4, b);
      box(g, -5, -28, 3, 3, e); box(g, 2, -28, 3, 3, e);
      g.strokeStyle = a; g.lineWidth = 2;
      g.beginPath(); g.arc(18, -20, 10, -1.2, 1.6); g.stroke();
      box(g, 17, -20, 2, 18, a);
      return;
    }
    if (arch === 'crab') {
      /* 甲殼巨獸：寬殼 + 巨鉗 */
      fillRR(g, -24, -22, 48, 18, 9, d);
      fillRR(g, -20, -20, 40, 13, 7, b);
      box(g, -22, -25, 8, 5, a); box(g, 14, -25, 8, 5, a);
      fillRR(g, -8, -32, 16, 12, 4, d);
      box(g, -5, -28, 3, 3, e); box(g, 2, -28, 3, 3, e);
      g.strokeStyle = b; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-24, -10); g.lineTo(-34, -2); g.stroke();
      g.beginPath(); g.moveTo(24, -10); g.lineTo(34, -2); g.stroke();
      box(g, -34, -6, 8, 8, a); box(g, 26, -6, 8, 8, a);
      return;
    }
    if (arch === 'mirror') {
      /* 鏡像騎士：反光鎧甲 + 盾 */
      fillRR(g, -12, -24, 24, 24, 4, b);
      box(g, -12, -18, 24, 2, '#ffffff');
      box(g, -12, -8, 24, 2, '#ffffff');
      fillRR(g, -8, -34, 16, 12, 4, d);
      box(g, -5, -30, 3, 3, e); box(g, 2, -30, 3, 3, e);
      fillRR(g, 14, -22, 10, 18, 3, d);
      box(g, 16, -20, 6, 2, a);
      box(g, -16, -22, 4, 14, d);
      return;
    }
    if (arch === 'titan2') {
      /* 時鐘巨像：齒輪與鐘面 */
      fillRR(g, -20, -26, 40, 26, 5, d);
      fillRR(g, -16, -23, 32, 20, 4, b);
      for (var gk = 0; gk < 8; gk++) {
        var ga = gk / 8 * Math.PI * 2 + t * 0.5;
        box(g, Math.cos(ga) * 10 - 1, -40 + Math.sin(ga) * 10 - 1, 3, 3, a);
      }
      g.fillStyle = d; g.beginPath(); g.arc(0, -40, 9, 0, Math.PI * 2); g.fill();
      g.strokeStyle = a; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -40); g.lineTo(Math.cos(t) * 6, -40 + Math.sin(t) * 6); g.stroke();
      box(g, -18, -30, 5, 20, a); box(g, 13, -30, 5, 20, a);
      return;
    }
  }

  var BOSS_SPRITE = {
    warden: 'boss_demon',
    darkknight: 'boss_knight',
    wraithking: 'boss_ghost',
    hornfang: 'boss_bear',
    ouroboros: 'boss_serpent',
    frost: 'boss_snow',
    spider: 'boss_plant',
    behemoth: 'boss_mushroom_horror',
    titan: 'boss_mushroom_brute',
    hydra: 'boss_mushroom_face',
    avatar: 'boss_imp',
    shellback: 'boss_tiger',
    clockwork: 'boss_mushroom'
  };

  /* 裝備圖：依部位與稀有度挑素材 */
  function equipSpriteName(icon, rarity) {
    var r = rarity | 0;
    if (icon === 'armor') {
      if (r >= 5) return 'equip_armor_angel';
      if (r === 4) return 'equip_armor_royal';
      if (r === 3) return 'equip_armor_flame';
      return 'equip_robe_colorful';
    }
    if (icon === 'amulet') {
      if (r >= 5) return 'equip_cloak_blue';
      if (r === 4) return 'equip_cloak_purple';
      if (r === 3) return 'equip_cloak_red';
      return 'equip_cloak_green';
    }
    if (icon === 'ring') return r >= 4 ? 'equip_ring_blue' : (r >= 3 ? 'equip_ring_red' : 'equip_ring_green');
    if (r >= 5) return 'equip_robe_colorful';
    if (r >= 4) return 'equip_robe_green';
    return 'equip_cloak_dark';
  }

  function drawBoss(g, id, x, y, t, face, flash, pal, hpRatio) {
    /* 有素材精靈圖的首領優先使用 */
    var sk = BOSS_SPRITE[id];
    if (sk && SPRITES[sk]) {
      g.save();
      var bob = Math.sin(t * 4) * 3;
      var squash = 1 + Math.sin(t * 4) * 0.045;
      var walkTilt = Math.sin(t * 4) * 0.04;
      g.translate(Math.round(x), Math.round(y + bob * 0.4));
      var sz = 62 * (1 + Math.sin(t * 2) * 0.02);
      drawSpriteFit(g, sk, 0, -sz * 0.34, sz, face, squash, walkTilt);
      if (flash > 0.05) {
        g.globalAlpha = Math.min(0.7, flash * 0.6);
        g.globalCompositeOperation = 'lighter';
        drawSpriteFit(g, sk, 0, -sz * 0.34, sz, face, squash, walkTilt);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      }
      g.restore();
      return;
    }
    g.save();
    g.translate(Math.round(x), Math.round(y));
    shadow(g, 0, 2, 17, 5);
    var fl = Math.sin(t * 2.2) * 2;
    glow(g, 0, -14 + fl, 36, pal.accent, 0.35 + Math.sin(t * 3) * 0.1);

    /* 新型首領：依 arch 畫完全不同的輪廓 */
    if (pal && pal.arch) {
      drawBossArch(g, pal.arch, pal, t, fl, hpRatio);
      g.restore();
      return;
    }

    /* 斗篷 */
    g.fillStyle = pal.dark;
    g.beginPath();
    g.moveTo(-13, -16);
    g.quadraticCurveTo(-20, 2 + fl, -10, 3);
    g.lineTo(10, 3);
    g.quadraticCurveTo(20, 2 - fl, 13, -16);
    g.closePath(); g.fill();

    /* 身體 */
    fillRR(g, -11, -22, 22, 20, 6, pal.body);
    fillRR(g, -9, -21, 18, 14, 5, darken(pal.body, 1.22));
    box(g, -9, -8, 18, 2, pal.dark);
    glow(g, 0, -12, 12, pal.accent, 0.55 + Math.sin(t * 6) * 0.2);
    box(g, -2, -14, 4, 4, pal.accent);

    /* 手臂 */
    box(g, -15, -20, 5, 9, pal.body);
    box(g, 10, -20, 5, 9, pal.body);
    box(g, -16, -12, 2, 3, C.bone);
    box(g, 13, -12, 2, 3, C.bone);

    /* 頭 */
    fillRR(g, -7, -32, 14, 12, 4, pal.dark);
    fillRR(g, -5, -30, 10, 9, 3, pal.body);

    /* 角（不同頭目不同造型） */
    if (id === 'hydra') {
      for (var i = -1; i <= 1; i++) {
        box(g, i * 6 - 1, -38, 2, 7, pal.body);
        box(g, i * 6 - 2, -40, 4, 2, pal.accent);
      }
    } else if (id === 'titan') {
      box(g, -10, -38, 8, 4, pal.body);
      box(g, 2, -38, 8, 4, pal.body);
      box(g, -3, -40, 6, 4, C.bone);
    } else if (id === 'behemoth') {
      box(g, -9, -37, 4, 7, C.bone);
      box(g, 5, -37, 4, 7, C.bone);
    } else if (id === 'avatar') {
      box(g, -9, -39, 3, 9, pal.accent);
      box(g, 6, -39, 3, 9, pal.accent);
      box(g, -1, -42, 2, 6, pal.accent);
    } else {
      box(g, -8, -37, 3, 6, C.bone);
      box(g, 5, -37, 3, 6, C.bone);
      box(g, -9, -39, 2, 3, C.boneShade);
      box(g, 7, -39, 2, 3, C.boneShade);
    }

    /* 眼 */
    box(g, -4, -27, 3, 2, pal.eye);
    box(g, 1, -27, 3, 2, pal.eye);
    box(g, -4, -27, 1, 1, '#ffffff');
    box(g, 1, -27, 1, 1, '#ffffff');

    /* 嘴 */
    box(g, -3, -23, 6, 1, '#1a0a10');
    box(g, -2, -23, 1, 2, C.bone);
    box(g, 1, -23, 1, 2, C.bone);

    if (flash) {
      g.globalAlpha = 0.45 * flash;
      fillRR(g, -13, -34, 26, 36, 8, '#ffffff');
      g.globalAlpha = 1;
    }
    g.restore();
  }

  /* =====================================================================
     場景 / 道具
     ===================================================================== */
  function buildRoom(walls, RW, RH, seed, theme) {
    theme = theme || {
      floor: ['#191423', '#1c1729'], wall: '#2b2542', wallTop: '#463c68',
      deco: 'crack', accent: '#8e6bf2'
    };
    var cv = document.createElement('canvas');
    cv.width = RW; cv.height = RH;
    var g = cv.getContext('2d');
    var TW = (RW / 16) | 0, TH = (RH / 16) | 0;
    var solid = new Uint8Array(TW * TH), i, x, y;
    for (i = 0; i < walls.length; i++) {
      var w = walls[i];
      var x0 = Math.max(0, Math.floor(w.x / 16)), x1 = Math.min(TW, Math.ceil((w.x + w.w) / 16));
      var y0 = Math.max(0, Math.floor(w.y / 16)), y1 = Math.min(TH, Math.ceil((w.y + w.h) / 16));
      for (y = y0; y < y1; y++) for (x = x0; x < x1; x++) solid[y * TW + x] = 1;
    }
    var R = rng(seed);
    var fA = theme.floor[0], fB = theme.floor[1];

    /* ---- 場景照片背景（每個章節完全不同的環境） ---- */
    var hasScene = false;
    if (theme.scene && TEX.scenes && TEX.scenes[theme.scene]) {
      var simg = TEX.scenes[theme.scene];
      if (simg.complete && simg.naturalWidth > 0) {
        hasScene = true;
        var ir = simg.naturalWidth / simg.naturalHeight;
        var cr = RW / RH;
        var dw = RW, dh = RH, dx = 0, dy = 0;
        if (ir > cr) { dw = RH * ir; dx = (RW - dw) / 2; }
        else { dh = RW / ir; dy = (RH - dh) / 2; }
        g.drawImage(simg, dx, dy, dw, dh);
        g.fillStyle = 'rgba(6,4,12,.5)';
        g.fillRect(0, 0, RW, RH);
        g.globalAlpha = 0.2;
        g.fillStyle = theme.accent;
        g.fillRect(0, 0, RW, RH);
        g.globalAlpha = 1;
      }
    }

    /* ---- 地板 ---- */
    for (y = 0; y < TH; y++) for (x = 0; x < TW; x++) {
      if (solid[y * TW + x]) continue;
      var X = x * 16, Y = y * 16;
      var base = R() < 0.5 ? fA : fB;
      g.globalAlpha = hasScene ? 0.6 : 1;
      box(g, X, Y, 16, 16, base);
      g.globalAlpha = 1;
      box(g, X, Y, 16, 1, 'rgba(0,0,0,.20)');
      box(g, X, Y, 1, 16, 'rgba(0,0,0,.14)');
      /* 地磚材質：依章節換不同鋪法，不要一路都用同一種方格 */
      var tp = theme.tile || 'grid';
      if (tp === 'brick') {
        box(g, X, Y + 8, 16, 1, 'rgba(0,0,0,.26)');
        box(g, X + (y % 2 ? 4 : 12), Y, 1, 8, 'rgba(0,0,0,.26)');
        box(g, X + (y % 2 ? 12 : 4), Y + 8, 1, 8, 'rgba(0,0,0,.26)');
      } else if (tp === 'plate') {
        box(g, X + 1, Y + 1, 14, 1, 'rgba(255,255,255,.07)');
        box(g, X + 1, Y + 14, 14, 1, 'rgba(0,0,0,.3)');
        box(g, X + 13, Y + 3, 1, 10, 'rgba(255,255,255,.05)');
        if (R() < 0.25) box(g, X + 3, Y + 3, 1, 1, 'rgba(140,240,255,.35)');
      } else if (tp === 'hex') {
        g.save();
        g.globalAlpha = 0.16;
        g.strokeStyle = theme.accent;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(X + 8, Y + 1); g.lineTo(X + 15, Y + 5); g.lineTo(X + 15, Y + 11);
        g.lineTo(X + 8, Y + 15); g.lineTo(X + 1, Y + 11); g.lineTo(X + 1, Y + 5);
        g.closePath(); g.stroke();
        g.restore();
      } else if (tp === 'ripple') {
        g.save();
        g.globalAlpha = 0.1;
        g.strokeStyle = '#bff3ff';
        g.beginPath();
        g.arc(X + 8, Y + 8, 5 + (R() < 0.5 ? 2 : 0), 0, Math.PI * 2);
        g.stroke();
        g.restore();
      } else if (tp === 'wave') {
        box(g, X + 2, Y + 10, 5, 1, 'rgba(255,220,150,.10)');
        box(g, X + 9, Y + 6, 5, 1, 'rgba(255,220,150,.08)');
      } else if (tp === 'facet') {
        g.save();
        g.globalAlpha = 0.12;
        g.strokeStyle = '#dff6ff';
        g.beginPath();
        g.moveTo(X + 1, Y + 13); g.lineTo(X + 8, Y + 3); g.lineTo(X + 15, Y + 13);
        g.stroke();
        g.restore();
      } else if (tp === 'rune') {
        if (R() < 0.18) {
          g.save();
          g.globalAlpha = 0.35;
          g.fillStyle = theme.accent;
          g.fillRect(X + 7, Y + 5, 1, 6);
          g.fillRect(X + 9, Y + 7, 3, 1);
          g.restore();
        }
      } else {
        box(g, X + 7, Y + 7, 2, 2, 'rgba(255,255,255,.05)');
      }
      var n = R() < 0.5 ? 1 : 2;
      for (var k = 0; k < n; k++) {
        box(g, X + 1 + ((R() * 13) | 0), Y + 1 + ((R() * 13) | 0), 1 + ((R() * 2) | 0), 1,
          R() < 0.35 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.22)');
      }
      if (theme.deco === 'crack' && R() < 0.035) {
        var cx = X + 2 + ((R() * 10) | 0), cy = Y + 2 + ((R() * 10) | 0);
        for (var s = 0; s < 4; s++) {
          box(g, cx, cy, 1, 2, 'rgba(0,0,0,.5)');
          cx += R() < 0.5 ? 1 : 0;
          cy += 1 + ((R() * 2) | 0);
        }
      }
      if (theme.deco === 'ember' && R() < 0.09) {
        var ex = X + 3 + ((R() * 10) | 0), ey = Y + 3 + ((R() * 10) | 0);
        glow(g, ex, ey, 9, theme.accent, 0.25);
        box(g, ex, ey, 2, 2, '#ff9a3c');
      }
      if (theme.deco === 'star' && R() < 0.07) {
        box(g, X + 2 + ((R() * 12) | 0), Y + 2 + ((R() * 12) | 0), 1, 1, 'rgba(255,255,255,.5)');
      }
      if (theme.deco === 'cloud' && R() < 0.05) {
        g.save();
        g.globalAlpha = 0.05;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(X + 8, Y + 8, 7 + R() * 4, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      /* ---- 場景貼圖：藤蔓 / 水 / 岩漿 / 冰 / 沙 / 齒輪 / 血 / 鏡 / 符文 ---- */
      if (theme.deco === 'vine' && R() < 0.07) {
        var vx = X + 3 + ((R() * 9) | 0), vy = Y + 2;
        g.fillStyle = '#2f6a3a';
        for (var vv = 0; vv < 5; vv++) {
          g.fillRect(vx | 0, (vy + vv * 3) | 0, 1, 3);
          vx += R() < 0.5 ? 1 : -1;
        }
        g.fillStyle = '#57b85a';
        g.fillRect((vx + 1) | 0, (vy + 4) | 0, 2, 1);
      }
      if (theme.deco === 'water' && R() < 0.06) {
        var wx2 = X + 2 + ((R() * 8) | 0), wy2 = Y + 3 + ((R() * 8) | 0);
        g.save();
        g.globalAlpha = 0.28;
        g.fillStyle = '#59c8ff';
        g.beginPath();
        g.ellipse(wx2 + 4, wy2 + 3, 6 + R() * 3, 3 + R() * 2, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.5;
        g.fillStyle = '#c9f2ff';
        g.fillRect((wx2 + 2) | 0, (wy2 + 2) | 0, 4, 1);
        g.restore();
      }
      if (theme.deco === 'lava' && R() < 0.055) {
        var lx2 = X + 2 + ((R() * 8) | 0), ly2 = Y + 3 + ((R() * 8) | 0);
        glow(g, lx2 + 4, ly2 + 3, 14, 'rgba(255,120,40,.55)', 0.5);
        g.save();
        g.globalAlpha = 0.85;
        g.fillStyle = '#ff7a3c';
        g.beginPath();
        g.ellipse(lx2 + 4, ly2 + 3, 5 + R() * 3, 3, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ffe066';
        g.fillRect((lx2 + 3) | 0, (ly2 + 2) | 0, 2, 1);
        g.restore();
      }
      if (theme.deco === 'ice' && R() < 0.06) {
        var ix = X + 3 + ((R() * 8) | 0), iy = Y + 3 + ((R() * 8) | 0);
        g.save();
        g.globalAlpha = 0.35;
        g.fillStyle = '#bfefff';
        g.beginPath();
        g.moveTo(ix, iy + 4); g.lineTo(ix + 3, iy); g.lineTo(ix + 6, iy + 4);
        g.closePath(); g.fill();
        g.restore();
      }
      if (theme.deco === 'sand' && R() < 0.09) {
        box(g, X + 2 + ((R() * 12) | 0), Y + 2 + ((R() * 12) | 0), 2, 1, 'rgba(255,220,150,.22)');
      }
      if (theme.deco === 'gear' && R() < 0.05) {
        var gx2 = X + 8, gy2 = Y + 8;
        g.save();
        g.globalAlpha = 0.3;
        g.strokeStyle = '#8cf0ff';
        g.lineWidth = 1;
        g.beginPath(); g.arc(gx2, gy2, 4, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(gx2, gy2, 1.5, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      if (theme.deco === 'blood' && R() < 0.06) {
        g.save();
        g.globalAlpha = 0.35;
        g.fillStyle = '#8a1020';
        g.beginPath();
        g.arc(X + 5 + R() * 6, Y + 5 + R() * 6, 3 + R() * 3, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      if (theme.deco === 'mirror' && R() < 0.05) {
        g.save();
        g.globalAlpha = 0.18;
        g.strokeStyle = '#d8fff8';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(X, Y + 12); g.lineTo(X + 12, Y);
        g.stroke();
        g.restore();
      }
      if (theme.deco === 'rune' && R() < 0.05) {
        var rx2 = X + 4 + ((R() * 6) | 0), ry2 = Y + 4 + ((R() * 6) | 0);
        glow(g, rx2 + 2, ry2 + 2, 10, theme.accent, 0.3);
        g.save();
        g.globalAlpha = 0.6;
        g.fillStyle = theme.accent;
        g.fillRect(rx2, ry2, 1, 4);
        g.fillRect(rx2 + 3, ry2, 1, 4);
        g.fillRect(rx2, ry2 + 1, 4, 1);
        g.restore();
      }
    }

    /* ---- 牆 ---- */
    for (y = 0; y < TH; y++) for (x = 0; x < TW; x++) {
      if (!solid[y * TW + x]) continue;
      var WX = x * 16, WY = y * 16;
      var up = y > 0 ? solid[(y - 1) * TW + x] : 1;
      var dn = y < TH - 1 ? solid[(y + 1) * TW + x] : 1;
      var lf = x > 0 ? solid[y * TW + x - 1] : 1;
      var rt = x < TW - 1 ? solid[y * TW + x + 1] : 1;

      box(g, WX, WY, 16, 16, theme.wall);
      box(g, WX, WY + 8, 16, 1, 'rgba(0,0,0,.35)');
      box(g, WX + ((y % 2) ? 8 : 4), WY, 1, 8, 'rgba(0,0,0,.35)');
      box(g, WX + ((y % 2) ? 3 : 11), WY + 9, 1, 7, 'rgba(0,0,0,.35)');
      if (!up) {
        box(g, WX, WY, 16, 3, theme.wallTop);
        box(g, WX, WY, 16, 1, 'rgba(255,255,255,.18)');
      }
      if (!dn) {
        box(g, WX, WY + 13, 16, 3, 'rgba(0,0,0,.45)');
        var gr = g.createLinearGradient(0, WY + 16, 0, WY + 22);
        gr.addColorStop(0, 'rgba(0,0,0,.45)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(WX, WY + 16, 16, 6);
      }
      if (!lf) box(g, WX, WY, 1, 16, 'rgba(255,255,255,.06)');
      if (!rt) box(g, WX + 15, WY, 1, 16, 'rgba(0,0,0,.28)');

      /* 主題裝飾 */
      if (theme.deco === 'window' && R() < 0.35) {
        var wx = WX + 3 + ((R() * 3) | 0) * 4;
        box(g, wx, WY + 4, 5, 7, 'rgba(0,0,0,.5)');
        box(g, wx + 1, WY + 5, 3, 5, R() < 0.55 ? theme.accent : 'rgba(255,255,255,.25)');
      } else if (theme.deco === 'ray' && !up) {
        g.save();
        g.globalAlpha = 0.08;
        g.fillStyle = theme.accent;
        g.fillRect(WX, WY, 16, 3);
        g.restore();
      } else if (theme.deco === 'star' && R() < 0.12) {
        box(g, WX + 4 + ((R() * 8) | 0), WY + 3 + ((R() * 9) | 0), 1, 1, 'rgba(255,255,255,.55)');
      }
    }

    /* ---- 主題光影 ---- */
    if (theme.deco === 'ray') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (var r2 = 0; r2 < 5; r2++) {
        var lx = (r2 * 137) % RW;
        var lg = g.createLinearGradient(lx, 0, lx + 60, RH);
        lg.addColorStop(0, 'rgba(255,235,170,.10)');
        lg.addColorStop(1, 'rgba(255,235,170,0)');
        g.fillStyle = lg;
        g.beginPath();
        g.moveTo(lx, 0); g.lineTo(lx + 26, 0); g.lineTo(lx + 86, RH); g.lineTo(lx + 60, RH);
        g.closePath(); g.fill();
      }
      g.restore();
    }
    if (theme.deco === 'cloud') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (var c2 = 0; c2 < 6; c2++) {
        var cxx = (c2 * 113 + 40) % RW, cyy = (c2 * 71 + 30) % RH;
        glow(g, cxx, cyy, 40, 'rgba(160,220,255,.16)', 0.5);
      }
      g.restore();
    }

    var vg = g.createRadialGradient(RW / 2, RH / 2, Math.min(RW, RH) * 0.35, RW / 2, RH / 2, Math.max(RW, RH) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = vg;
    g.fillRect(0, 0, RW, RH);

    /* 章節色調 */
    if (theme.accent) {
      g.save();
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = 0.14;
      g.fillStyle = theme.accent;
      g.fillRect(0, 0, RW, RH);
      g.restore();
    }
    return cv;
  }

  function drawTorch(g, x, y, t) {
    var f = 1 + Math.sin(t * 13 + x) * 0.18;
    glow(g, x, y - 4, 26 * f, 'rgba(255,170,70,.55)', 0.55);
    box(g, x - 1, y + 1, 3, 5, '#3a2a1a');
    box(g, x - 2, y - 1, 5, 3, '#ffb347');
    box(g, x - 1, y - 3 * f, 3, 3, '#ffe0a0');
    box(g, x - 1, y - 5 * f, 2, 3, '#fff3cf');
  }

  function drawPortal(g, x, y, t, color) {
    color = color || '#8e6bf2';
    g.save();
    g.translate(x | 0, y | 0);
    glow(g, 0, 0, 34, color, 0.55 + Math.sin(t * 3) * 0.12);
    /* 核心 */
    var core = 0.5 + Math.sin(t * 5) * 0.12;
    fillRR(g, -6, -9, 12, 18, 6, 'rgba(255,255,255,.18)');
    fillRR(g, -4, -6, 8, 12, 4, 'rgba(255,255,255,' + core * 0.55 + ')');
    /* 三層旋轉環 */
    for (var i = 0; i < 3; i++) {
      var r = 16 - i * 4;
      g.beginPath();
      g.arc(0, 0, r + Math.sin(t * 2.5 + i) * 1.2, t * (1.4 + i * 0.8), t * (1.4 + i * 0.8) + Math.PI * 1.35);
      g.strokeStyle = i === 1 ? '#ffffff' : color;
      g.globalAlpha = 0.35 + i * 0.2;
      g.lineWidth = 1.6;
      g.stroke();
    }
    g.globalAlpha = 1;
    /* 符文點 */
    for (var k = 0; k < 6; k++) {
      var a = t * 1.2 + k * Math.PI / 3;
      var rr2 = 21 + Math.sin(t * 3 + k) * 2;
      g.fillStyle = k % 2 ? color : '#ffe6a1';
      g.globalAlpha = 0.5 + 0.4 * Math.abs(Math.sin(t * 4 + k));
      g.fillRect(Math.cos(a) * rr2 - 1, Math.sin(a) * rr2 - 1, 2, 2);
    }
    g.globalAlpha = 1;
    g.restore();
  }

  /* 隱藏裂隙之門 */
  function drawSecretDoor(g, x, y, t, color) {
    color = color || '#ff5ce0';
    g.save();
    g.translate(x | 0, y | 0);
    glow(g, 0, -2, 26, color, 0.35 + Math.sin(t * 3.2) * 0.12);
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(-10, 10);
    g.lineTo(-10, -3);
    g.arc(0, -3, 10, Math.PI, 0);
    g.lineTo(10, 10);
    g.stroke();
    g.globalAlpha = 0.45;
    for (var i = 0; i < 4; i++) {
      var yy = 6 - ((t * 14 + i * 5) % 16);
      g.beginPath();
      g.moveTo(-6 + i * 3, yy);
      g.lineTo(-6 + i * 3 + 2, yy - 3);
      g.stroke();
    }
    g.globalAlpha = 0.3;
    g.fillStyle = color;
    g.fillRect(-8, -1, 16, 10);
    g.restore();
  }

  /* 寶箱：tier 0..3 */
  function drawChest(g, x, y, t, open, tier) {
    tier = tier || 0;
    var body = ['#5a3a1f', '#4a5470', '#6b4a12', '#3a2a6e'][tier];
    var face = ['#8a5a35', '#8f9ab5', '#c9a03a', '#6a52c0'][tier];
    var trim = ['#a8791d', '#c8d2e6', '#f3c250', '#b07cf0'][tier];
    g.save();
    g.translate(x | 0, y | 0);
    shadow(g, 0, 6, 10, 3);
    if (open) glow(g, 0, -2, 20, trim, 0.45 + Math.sin(t * 4) * 0.1);
    else glow(g, 0, -4, 14, trim, 0.22 + Math.sin(t * 2) * 0.06);
    fillRR(g, -9, -6, 18, 11, 2, body);
    fillRR(g, -8, -5, 16, 9, 1.5, face);
    box(g, -8, -1, 16, 2, trim);
    box(g, -1, -5, 2, 9, trim);
    if (!open) {
      fillRR(g, -9, -12, 18, 7, 3, body);
      fillRR(g, -8, -11, 16, 5, 2, face);
      box(g, -8, -7, 16, 1, trim);
      box(g, -1, -10, 2, 5, trim);
      box(g, -2, -6, 4, 3, trim);
    } else {
      fillRR(g, -9, -16, 18, 5, 2, body);
      fillRR(g, -8, -15, 16, 3, 1.5, face);
      fillRR(g, -6, -13, 12, 3, 1, '#ffe6a1');
    }
    /* 等級小標記 */
    for (var i = 0; i <= tier; i++) {
      box(g, -6 + i * 4, 6, 2, 1, trim);
    }
    g.restore();
  }

  function drawPedestal(g, x, y, t) {
    g.save();
    g.translate(x | 0, y | 0);
    shadow(g, 0, 8, 9, 3);
    fillRR(g, -7, 2, 14, 5, 1.5, '#2a2542');
    fillRR(g, -6, 3, 12, 3, 1, '#3b3358');
    box(g, -5, -2, 10, 5, '#2a2542');
    glow(g, 0, -6, 14, '#78dcff', 0.3);
    g.restore();
  }

  /* 可破壞物件 */
  function drawProp(g, type, x, y, t, flash) {
    g.save();
    g.translate(x | 0, y | 0);
    shadow(g, 0, 3, 8, 2.4);
    if (type === 'crate') {
      fillRR(g, -8, -12, 16, 14, 1.5, '#5a3a1f');
      fillRR(g, -7, -11, 14, 12, 1, '#8a5a35');
      box(g, -7, -6, 14, 1, '#5a3a1f');
      box(g, -7, -11, 14, 1, '#a8793d');
      g.save();
      g.strokeStyle = '#5a3a1f'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(-7, -10); g.lineTo(7, -1); g.moveTo(7, -10); g.lineTo(-7, -1); g.stroke();
      g.restore();
    } else if (type === 'barrel') {
      fillRR(g, -7, -13, 14, 15, 4, '#4f301a');
      fillRR(g, -6, -12, 12, 13, 3.5, '#8a5a35');
      box(g, -6, -9, 12, 2, '#3a2a1a');
      box(g, -6, -3, 12, 2, '#3a2a1a');
      box(g, -2, -12, 1, 13, '#a8793d');
    } else if (type === 'bomb') {
      var pulse = 0.5 + Math.sin(t * 6) * 0.25;
      glow(g, 0, -6, 16, 'rgba(226,87,76,.8)', 0.45 + pulse * 0.3);
      fillRR(g, -8, -13, 16, 15, 5, '#2a1418');
      fillRR(g, -6, -11, 12, 11, 4, '#4a2028');
      box(g, -8, -6, 16, 2, '#1a0a10');
      box(g, -2, -16, 3, 4, '#8a7a5a');
      box(g, -1, -18, 1, 2, '#ffb347');
      /* 骷髏記號 */
      box(g, -3, -9, 6, 5, '#e8dcc0');
      box(g, -2, -8, 1, 2, '#1a0a10');
      box(g, 1, -8, 1, 2, '#1a0a10');
    } else if (type === 'pot') {
      fillRR(g, -7, -11, 14, 13, 5, '#3a5a6a');
      fillRR(g, -6, -10, 12, 11, 4.5, '#5a8a9a');
      box(g, -6, -6, 12, 1, '#2a4a5a');
      box(g, -4, -10, 2, 3, '#8ac0d0');
    } else if (type === 'lavaRock') {
      glow(g, 0, -6, 18, 'rgba(255,110,40,.7)', 0.35 + Math.sin(t * 4) * 0.12);
      fillRR(g, -9, -12, 18, 14, 3, '#3a1408');
      fillRR(g, -7, -10, 14, 10, 2.5, '#6a2410');
      box(g, -4, -8, 3, 2, '#ff7a3c');
      box(g, 1, -5, 2, 2, '#ffb347');
      box(g, -6, -3, 6, 1, 'rgba(255,120,40,.6)');
    } else if (type === 'vinepot') {
      fillRR(g, -7, -11, 14, 13, 5, '#2a4a2a');
      fillRR(g, -6, -10, 12, 11, 4.5, '#3f6a3a');
      for (var vv2 = -1; vv2 <= 1; vv2++) {
        box(g, vv2 * 3, -18 + (vv2 + 1) * 2, 1, 8, '#6fe08a');
        box(g, vv2 * 3 + 1, -12 + (vv2 + 1) * 2, 2, 1, '#6fe08a');
      }
    } else if (type === 'crystal') {
      glow(g, 0, -8, 20, 'rgba(160,220,255,.65)', 0.4 + Math.sin(t * 3) * 0.12);
      g.save();
      g.globalAlpha = 0.95;
      g.fillStyle = '#8fdcff';
      g.beginPath(); g.moveTo(0, -18); g.lineTo(6, -8); g.lineTo(0, 2); g.lineTo(-6, -8); g.closePath(); g.fill();
      g.fillStyle = '#d8f4ff';
      g.beginPath(); g.moveTo(0, -18); g.lineTo(3, -8); g.lineTo(0, -4); g.lineTo(-3, -8); g.closePath(); g.fill();
      g.restore();
    }
    if (flash) {
      g.globalAlpha = 0.5 * flash;
      fillRR(g, -9, -14, 18, 17, 1, '#ffffff');
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function drawPickup(g, type, x, y, t) {
    var bob = Math.sin(t * 5 + x * 0.3) * 1.5;
    g.save();
    g.translate(x | 0, (y + bob) | 0);
    if (type === 'coin') {
      glow(g, 0, 0, 7, 'rgba(243,194,80,.55)', 0.4);
      fillRR(g, -3, -3, 6, 6, 3, C.goldDark);
      fillRR(g, -2, -2, 4, 4, 2, C.gold);
      box(g, -1, -2, 1, 3, C.goldLit);
    } else if (type === 'key') {
      glow(g, 0, 0, 8, 'rgba(243,194,80,.5)', 0.5);
      g.fillStyle = '#f3c250';
      g.beginPath(); g.arc(0, -2, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a8791d';
      g.beginPath(); g.arc(0, -2, 1.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f3c250';
      g.fillRect(-1, 0, 2, 6);
      g.fillRect(1, 3, 3, 1);
      g.fillRect(1, 5, 2, 1);
    } else if (type === 'heart') {
      glow(g, 0, 0, 9, 'rgba(226,87,76,.5)', 0.45);
      g.fillStyle = C.red;
      g.beginPath();
      g.moveTo(0, 4); g.bezierCurveTo(-7, -1, -4, -6, 0, -2.6);
      g.bezierCurveTo(4, -6, 7, -1, 0, 4);
      g.fill();
      box(g, -2, -3, 1, 2, 'rgba(255,255,255,.7)');
    } else {
      glow(g, 0, 0, 8, 'rgba(87,224,168,.5)', 0.45);
      g.fillStyle = C.mint;
      g.beginPath();
      g.moveTo(0, -4); g.lineTo(3.2, 0); g.lineTo(0, 4); g.lineTo(-3.2, 0);
      g.closePath(); g.fill();
      box(g, -1, -2, 1, 3, 'rgba(255,255,255,.75)');
    }
    g.restore();
  }

  /* ---------------- 武器圖示（依 shape） ---------------- */
  /* =====================================================================
     精靈圖（玩家提供的素材）
     ===================================================================== */
  var SPRITE_SRC = {
    wpn_sword_cyan: 'assets/sprites/wpn-sword-cyan.png',
    wpn_sword_purple: 'assets/sprites/wpn-sword-purple.png',
    wpn_sword_royal: 'assets/sprites/wpn-sword-royal.png',
    wpn_sword_teal: 'assets/sprites/wpn-sword-teal.png',
    wpn_sword_gold: 'assets/sprites/wpn-sword-gold.png',
    wpn_sword_ice: 'assets/sprites/wpn-sword-ice.png',
    wpn_sword_blood: 'assets/sprites/wpn-sword-blood.png',
    wpn_pistol: 'assets/sprites/wpn-pistol.png',
    wpn_bow: 'assets/sprites/wpn-bow.png',
    wpn_staff: 'assets/sprites/wpn-staff.png',
    wpn_hammer: 'assets/sprites/wpn-hammer.png',
    boss_demon: 'assets/sprites/boss-demon.png',
    boss_knight: 'assets/sprites/boss-knight.png',
    boss_ghost: 'assets/sprites/boss-ghost.png',
    boss_bear: 'assets/sprites/boss-bear.png',
    boss_serpent: 'assets/sprites/boss-serpent.png',
    boss_snow: 'assets/sprites/boss-snow.png',
    boss_plant: 'assets/sprites/boss-plant.png',
    boss_mushroom: 'assets/sprites/boss-mushroom.png',
    boss_imp: 'assets/sprites/boss-imp.png',
    boss_mushroom_face: 'assets/sprites/boss-mushroom-face.png',
    boss_tiger: 'assets/sprites/boss-tiger.png',
    boss_mushroom_brute: 'assets/sprites/boss-mushroom-brute.png',
    boss_mushroom_horror: 'assets/sprites/boss-mushroom-horror.png',
    equip_armor_royal: 'assets/sprites/equip-armor-royal.png',
    equip_armor_flame: 'assets/sprites/equip-armor-flame.png',
    equip_cloak_green: 'assets/sprites/equip-cloak-green.png',
    equip_cloak_dark: 'assets/sprites/equip-cloak-dark.png',
    equip_cloak_red: 'assets/sprites/equip-cloak-red.png',
    equip_ring_green: 'assets/sprites/equip-ring-green.png',
    equip_ring_red: 'assets/sprites/equip-ring-red.png',
    equip_ring_blue: 'assets/sprites/equip-ring-blue.png',
    hero_01: 'assets/sprites/hero-01.png',
    hero_02: 'assets/sprites/hero-02.png',
    hero_03: 'assets/sprites/hero-03.png',
    hero_04: 'assets/sprites/hero-04.png',
    hero_05: 'assets/sprites/hero-05.png',
    hero_06: 'assets/sprites/hero-06.png',
    hero_07: 'assets/sprites/hero-07.png',
    hero_08: 'assets/sprites/hero-08.png',
    hero_09: 'assets/sprites/hero-09.png',
    hero_10: 'assets/sprites/hero-10.png',
    hero_11: 'assets/sprites/hero-11.png',
    hero_12: 'assets/sprites/hero-12.png',
    hero_13: 'assets/sprites/hero-13.png',
    hero_14: 'assets/sprites/hero-14.png',
    equip_armor_angel: 'assets/sprites/equip-armor-angel.png',
    equip_cloak_blue: 'assets/sprites/equip-cloak-blue.png',
    equip_cloak_purple: 'assets/sprites/equip-cloak-purple.png',
    equip_robe_green: 'assets/sprites/equip-robe-green.png',
    equip_robe_colorful: 'assets/sprites/equip-robe-colorful.png'

  };
  var SPRITES = {};
  var spritesReady = false;
  (function loadSprites() {
    if (typeof Image === 'undefined') return;
    var keys = Object.keys(SPRITE_SRC);
    var left = keys.length;
    keys.forEach(function (k) {
      var img = new Image();
      img.onload = function () { SPRITES[k] = img; if (--left <= 0) spritesReady = true; };
      img.onerror = function () { if (--left <= 0) spritesReady = true; };
      img.src = SPRITE_SRC[k];
    });
  })();

  /* 依武器形狀與稀有度挑精靈圖（越稀有越華麗） */
  function weaponSpriteName(shape, rarity) {
    if (shape === 'bow' || shape === 'crossbow') return 'wpn_bow';
    if (shape === 'staff' || shape === 'wand' || shape === 'orb' || shape === 'scepter') return 'wpn_staff';
    if (shape === 'cannon' || shape === 'launcher') return 'wpn_hammer';
    if (shape === 'pistol' || shape === 'smg' || shape === 'rifle' || shape === 'chaos') return 'wpn_pistol';
    var r = rarity | 0;
    if (r >= 5) return 'wpn_sword_blood';
    if (r === 4) return 'wpn_sword_royal';
    if (r === 3) return 'wpn_sword_ice';
    if (r === 2) return 'wpn_sword_purple';
    return 'wpn_sword_cyan';
  }

  function drawSpriteFit(g, key, cx, cy, size, face, squash, tilt) {
    var img = SPRITES[key];
    if (!img || !img.width) return false;
    var r = Math.min(size / img.width, size / img.height);
    var w = img.width * r, h = img.height * r;
    g.save();
    try { g.imageSmoothingEnabled = false; } catch (e) {}
    g.translate(cx, cy);
    if (tilt) g.rotate(tilt || 0);
    if (squash && squash !== 1) {
      g.scale((face === -1 ? -1 : 1) / squash, squash);
    } else if (face === -1) {
      g.scale(-1, 1);
    }
    g.drawImage(img, Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h));
    g.restore();
    return true;
  }

  /* 依武器 ID 產生穩定色相，讓同一張貼圖也有不同外觀 */
  function weaponHue(id) {
    if (!id) return 0;
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
    return (h * 37) % 360;
  }

  function drawWeaponIcon(g, shape, x, y, s, color, rarity, id) {
    s = s || 1;
    color = color || '#dfe7f7';
    /* 有精靈圖就用精靈圖（依稀有度 + 武器 ID 上色，避免重複貼圖） */
    var key = weaponSpriteName(shape, (rarity | 0));
    if (key && SPRITES[key]) {
      var hue = weaponHue(id);
      g.save();
      try {
        if (hue) g.filter = 'hue-rotate(' + hue + 'deg) saturate(1.08)';
      } catch (e) {}
      var ok = drawSpriteFit(g, key, x, y, 16 * s);
      g.restore();
      if (ok) return;
    }
    g.save();
    g.translate(x | 0, y | 0);
    g.scale(s, s);
    if (shape === 'pistol') {
      box(g, -5, -4, 9, 3, color); box(g, -1, -1, 4, 3, '#7d88a4'); box(g, 2, -3, 3, 1, '#ffffff');
    } else if (shape === 'smg') {
      box(g, -6, -3, 12, 3, color); box(g, -2, 0, 3, 4, '#5d6885'); box(g, -5, 0, 3, 2, '#5d6885'); box(g, 4, -2, 2, 1, '#ffffff');
    } else if (shape === 'shotgun') {
      box(g, -7, -3, 12, 2, '#8a6a45'); box(g, 1, -4, 7, 2, color); box(g, -7, -1, 4, 3, '#6b4526');
    } else if (shape === 'rifle') {
      box(g, -8, -3, 13, 3, color); box(g, 3, -2, 5, 1, '#8cf0ff'); box(g, -3, -5, 4, 2, '#57c8e0'); box(g, -6, -1, 2, 3, '#4a5070');
    } else if (shape === 'wand') {
      box(g, -1, -8, 2, 14, '#8a5a35'); glow(g, 0, -9, 8, color, 0.6); box(g, -3, -11, 6, 5, color); box(g, -2, -10, 4, 3, '#ffffff');
    } else if (shape === 'bow') {
      g.strokeStyle = '#8a5a35'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 7, -1.25, 1.25); g.stroke();
      g.strokeStyle = '#ded5bd'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(2.2, -6.6); g.lineTo(2.2, 6.6); g.stroke();
      box(g, -6, -1, 8, 1, color);
    } else if (shape === 'sword') {
      box(g, -1, -10, 2, 13, color); box(g, -1, -10, 1, 13, '#9aa5c0'); box(g, -4, 2, 8, 2, '#f3c250'); box(g, -1, 4, 2, 4, '#6b4526');
    } else if (shape === 'blade') {
      box(g, -1, -9, 2, 12, color); glow(g, 0, -4, 8, color, 0.7); box(g, -3, 2, 6, 1, '#f3c250'); box(g, -1, 3, 2, 3, '#3a3050');
    } else if (shape === 'launcher') {
      box(g, -8, -3, 14, 4, '#6e7a52'); box(g, 4, -4, 4, 6, color); box(g, -2, 1, 3, 4, '#4a5238'); box(g, -8, -3, 3, 4, '#3f4730');
    } else if (shape === 'crossbow') {
      box(g, -6, -1, 12, 2, '#8a6a45'); box(g, -6, -5, 2, 10, color); box(g, -6, -5, 12, 1, '#c8d2e6'); box(g, -6, 4, 12, 1, '#c8d2e6');
    } else if (shape === 'chakram') {
      g.strokeStyle = color; g.lineWidth = 2.2;
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#f3c250'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.stroke();
      box(g, -1, -8, 2, 2, '#f3c250');
    } else if (shape === 'spear') {
      box(g, -1, -4, 2, 13, '#8a5a35'); box(g, -2, -11, 4, 7, color); box(g, -1, -12, 2, 3, '#ffffff');
    } else if (shape === 'hammer') {
      box(g, -1, -3, 2, 12, '#6b4526'); box(g, -6, -10, 12, 7, color); box(g, -6, -10, 12, 2, '#ffffff');
    } else if (shape === 'knife') {
      box(g, -3, -8, 3, 9, color); box(g, -3, 1, 3, 3, '#6b4526');
    } else if (shape === 'cannon') {
      box(g, -7, -4, 12, 6, '#4a5070'); box(g, 4, -3, 4, 5, color); box(g, -5, 2, 5, 3, '#2f3550');
    } else if (shape === 'orb') {
      glow(g, 0, 0, 10, color, 0.7);
      g.fillStyle = color; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-1.5, -1.5, 2, 0, Math.PI * 2); g.fill();
    } else if (shape === 'chaos') {
      glow(g, 0, 0, 13, 'rgba(255,93,168,.85)', 0.8);
      box(g, -8, -4, 14, 8, '#4a1a3a');
      box(g, -8, -4, 14, 2, '#7a2a5e');
      box(g, 5, -6, 5, 11, color || '#ff5da8');
      box(g, 5, -6, 2, 11, '#ffd166');
      box(g, -2, -6, 5, 3, '#ff5da8');
      box(g, -6, 3, 5, 3, '#2a0f22');
      box(g, 10, -2, 2, 3, '#ffe6a1');
    } else if (shape === 'scepter') {
      box(g, -1, -4, 2, 13, '#c8a94a'); box(g, -3, -11, 6, 6, color); glow(g, 0, -8, 9, color, 0.6); box(g, -2, -10, 4, 3, '#ffffff');
    } else if (shape === 'nova') {
      glow(g, 0, -4, 16, 'rgba(255,224,102,.9)', 0.9);
      box(g, -2, -2, 4, 9, '#4a5070');
      box(g, -6, -7, 12, 5, '#7a7f9a');
      g.fillStyle = '#ff7a3c';
      g.beginPath(); g.arc(0, -9, 6, Math.PI, 0); g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.arc(0, -9, 3, Math.PI, 0); g.fill();
      box(g, -8, 6, 16, 3, '#4a5070');
    } else {
      box(g, -5, -3, 10, 3, color);
    }
    g.restore();
  }

  /* ---------------- 技能 / 大招圖示 ---------------- */
  var SKILL_ICON_KINDS = ['shield', 'nova', 'dash', 'holy', 'blink', 'rockets', 'wave',
    'drain', 'rage', 'cloud', 'roots', 'slash', 'bulletstorm',
    'meteorcall', 'timeslow', 'breath'];
  function skillIconSupports(kind) { return SKILL_ICON_KINDS.indexOf(kind) >= 0; }

  function drawSkillIcon(g, kind, x, y, s, color) {
    s = s || 1; color = color || '#8cf0ff';
    g.save(); g.translate(x | 0, y | 0); g.scale(s, s);
    g.globalAlpha = 1;
    /* 圓形徽章底：讓圖標有「設計過」的質感 */
    glow(g, 0, 0, 12, color, 0.5);
    g.beginPath(); g.arc(0, 0, 9.6, 0, Math.PI * 2);
    g.fillStyle = 'rgba(8,6,16,.9)'; g.fill();
    g.lineWidth = 1.9; g.strokeStyle = color; g.stroke();
    g.beginPath(); g.arc(0, 0, 7.7, 0, Math.PI * 2);
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.15)'; g.stroke();
    /* 頂部高光弧 */
    g.beginPath(); g.arc(0, 0, 9, Math.PI * 1.15, Math.PI * 1.75);
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.5)'; g.stroke();
    g.save(); g.scale(0.78, 0.78);
    if (kind === 'shield') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(0, -1, 6, 0, Math.PI * 2); g.stroke();
      box(g, -3, -3, 6, 6, 'rgba(255,255,255,.6)');
    } else if (kind === 'nova') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffd166'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.stroke();
    } else if (kind === 'dash') {
      box(g, -7, -2, 10, 3, color); box(g, 2, -5, 4, 3, color); box(g, 2, 2, 4, 3, color);
    } else if (kind === 'holy') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
    } else if (kind === 'blink') {
      /* 瞬移：殘影 ＋ 虛線 */
      g.strokeStyle = color; g.lineWidth = 1;
      g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(-6, 2); g.lineTo(-2, -1); g.lineTo(2, 2); g.lineTo(6, -1); g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = color;
      g.beginPath(); g.moveTo(-6, -4); g.lineTo(-3, -6); g.lineTo(-3, -2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(6, 4); g.lineTo(3, 6); g.lineTo(3, 2); g.closePath(); g.fill();
    } else if (kind === 'rockets') {
      for (var ri = 0; ri < 3; ri++) {
        box(g, -6 + ri * 5, -6 + ri * 2, 2, 5, color);
        box(g, -6 + ri * 5, 1 + ri * 2, 2, 2, '#ff9a5c');
      }
    } else if (kind === 'wave') {
      /* 氣功波：扇形弧 */
      for (var wi = 0; wi < 3; wi++) {
        g.strokeStyle = wi === 1 ? '#ffffff' : color;
        g.lineWidth = 2 - wi * 0.4;
        g.globalAlpha = 1 - wi * 0.22;
        g.beginPath(); g.arc(-3, 0, 4 + wi * 3, -0.9, 0.9); g.stroke();
      }
      g.globalAlpha = 1;
    } else if (kind === 'drain') {
      /* 汲取：漩渦箭頭 */
      g.strokeStyle = color; g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, 6, 0.4, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(0, 0, 3, 2.2, Math.PI * 2.4); g.stroke();
      glow(g, 0, 0, 7, color, 0.5);
      box(g, -1, -1, 2, 2, '#ffffff');
    } else if (kind === 'rage') {
      /* 狂怒：火焰 */
      g.fillStyle = '#ff7a3c';
      g.beginPath();
      g.moveTo(0, -8); g.lineTo(4, -2); g.lineTo(2, 4); g.lineTo(-2, 4); g.lineTo(-4, -2);
      g.closePath(); g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(0, -3); g.lineTo(2, 1); g.lineTo(0, 4); g.lineTo(-2, 1); g.closePath(); g.fill();
    } else if (kind === 'cloud') {
      g.fillStyle = color; g.globalAlpha = 0.85;
      g.beginPath(); g.arc(-4, 1, 3.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(1, -2, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(5, 2, 3, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      box(g, -3, 5, 2, 1, '#a8e05a'); box(g, 3, 6, 2, 1, '#a8e05a');
    } else if (kind === 'roots') {
      for (var ki = 0; ki < 3; ki++) {
        var rx = -5 + ki * 5;
        g.strokeStyle = '#6fe08a'; g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(rx, 7);
        g.quadraticCurveTo(rx + 3, 2 - ki, rx + 1, -6 + ki * 2);
        g.stroke();
        box(g, rx + 1, -7 + ki * 2, 2, 1, '#a8ffb0');
      }
    } else if (kind === 'slash') {
      g.strokeStyle = '#dff6ff'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-6, 6); g.lineTo(6, -6); g.stroke();
      g.strokeStyle = color; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 8, -1.9, -0.3); g.stroke();
    } else if (kind === 'bulletstorm') {
      for (var bi2 = 0; bi2 < 8; bi2++) {
        var ba = bi2 * Math.PI / 4;
        g.fillStyle = bi2 % 2 ? '#ffd166' : color;
        g.fillRect(Math.cos(ba) * 6 - 1, Math.sin(ba) * 6 - 1, 2, 2);
      }
      box(g, -1, -1, 2, 2, '#ffffff');
    } else if (kind === 'meteorcall') {
      /* 隕石 + 尾焰 */
      g.fillStyle = '#ffd166';
      g.beginPath(); g.arc(3, -3, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff7a3c';
      g.beginPath(); g.moveTo(-1, -1); g.lineTo(-7, 7); g.lineTo(0, 2); g.closePath(); g.fill();
      box(g, -6, 5, 9, 1, 'rgba(255,180,90,.5)');
    } else if (kind === 'timeslow') {
      /* 時鐘 + 逆轉箭頭 */
      g.strokeStyle = color; g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4); g.moveTo(0, 0); g.lineTo(3, 1); g.stroke();
      g.strokeStyle = '#a8fff0'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 8.4, 2.2, 4.4); g.stroke();
    } else if (kind === 'breath') {
      /* 扇形火焰 */
      g.fillStyle = '#ff7a3c';
      g.beginPath(); g.moveTo(-2, 0); g.lineTo(7, -5); g.lineTo(7, 5); g.closePath(); g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(-1, 0); g.lineTo(5, -2); g.lineTo(5, 2); g.closePath(); g.fill();
      box(g, -7, -1, 5, 2, '#a23b16');
    } else {
      glow(g, 0, 0, 8, color, 0.7);
      g.fillStyle = color; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.restore();
  }

  function drawUltIcon(g, kind, x, y, s, color) {
    s = s || 1; color = color || '#ffe6a1';
    g.save(); g.translate(x | 0, y | 0); g.scale(s, s);
    g.globalAlpha = 1;
    /* 菱形徽章底 + 外環 */
    glow(g, 0, 0, 14, color, 0.55);
    g.beginPath();
    g.moveTo(0, -10.4); g.lineTo(10.4, 0); g.lineTo(0, 10.4); g.lineTo(-10.4, 0);
    g.closePath();
    g.fillStyle = 'rgba(10,7,18,.9)'; g.fill();
    g.lineWidth = 1.9; g.strokeStyle = color; g.stroke();
    g.beginPath(); g.arc(0, 0, 12.4, 0, Math.PI * 2);
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,.18)'; g.stroke();
    g.save(); g.scale(0.78, 0.78);
    if (kind === 'swordfall') {
      box(g, -1, -10, 2, 12, color); box(g, -4, 2, 8, 2, '#f3c250');
    } else if (kind === 'meteor') {
      g.fillStyle = color; g.beginPath(); g.arc(3, -4, 4, 0, Math.PI * 2); g.fill();
      box(g, -1, -4, 4, 2, '#ff9a5c'); box(g, -5, 3, 10, 3, '#8a6a3a');
    } else if (kind === 'arrowrain') {
      for (var i = 0; i < 4; i++) { box(g, -6 + i * 4, -8 + i * 3, 6, 1, color); }
    } else if (kind === 'bastion') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 2, 7, Math.PI, 0); g.stroke();
      box(g, -7, 2, 14, 2, color);
    } else if (kind === 'mark') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, 5); g.moveTo(5, -5); g.lineTo(-5, 5); g.stroke();
    } else if (kind === 'orbital') {
      for (var j = 0; j < 3; j++) box(g, -7 + j * 5, -6, 2, 8, color);
    } else if (kind === 'shockwave') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.stroke();
    } else if (kind === 'legion') {
      g.fillStyle = color; for (var k = 0; k < 5; k++) { g.beginPath(); g.arc(Math.cos(k * 1.26) * 5, Math.sin(k * 1.26) * 5, 2, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'bloodrage') {
      glow(g, 0, 0, 9, '#ff3b3b', 0.8); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    } else if (kind === 'philosopher') {
      g.fillStyle = '#a8e05a'; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
      box(g, -8, -2, 4, 2, '#a8e05a'); box(g, 4, 0, 4, 2, '#a8e05a');
    } else if (kind === 'forest') {
      for (var m = 0; m < 3; m++) box(g, -6 + m * 5, -4 - (m % 2) * 4, 2, 10 + (m % 2) * 4, '#6fe08a');
    } else if (kind === 'iai') {
      g.strokeStyle = '#dff6ff'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 7, -1.1, 1.1); g.stroke();
    } else if (kind === 'waltz') {
      for (var n = 0; n < 6; n++) { var a = n * Math.PI / 3; g.fillStyle = color; g.fillRect(Math.cos(a) * 6 - 1, Math.sin(a) * 6 - 1, 2, 2); }
    } else if (kind === 'starfall') {
      for (var sf = 0; sf < 3; sf++) {
        g.fillStyle = sf === 1 ? '#ffffff' : color;
        g.fillRect(-6 + sf * 5, -6 + sf * 3, 2, 2);
        box(g, -6 + sf * 5, -4 + sf * 3, 1, 4, 'rgba(255,210,120,.6)');
      }
      box(g, -7, 6, 14, 1, 'rgba(255,210,120,.5)');
    } else if (kind === 'temporal') {
      g.strokeStyle = color; g.lineWidth = 1.8;
      g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -4.5); g.moveTo(0, 0); g.lineTo(3.5, 1.5); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(0, 0, 9.6, 3.9, 5.6); g.stroke();
    } else if (kind === 'dragonform') {
      g.fillStyle = color;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 0); g.lineTo(2, 7); g.lineTo(-2, 7); g.lineTo(-6, 0); g.closePath(); g.fill();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(0, -3); g.lineTo(3, 2); g.lineTo(0, 5); g.lineTo(-3, 2); g.closePath(); g.fill();
      box(g, -7, -6, 2, 3, color); box(g, 5, -6, 2, 3, color);
    } else {
      glow(g, 0, 0, 9, color, 0.8);
      g.fillStyle = color; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.restore();
  }

  /* ---------------- 裝備圖示 ---------------- */
  function drawEquipIcon(g, slot, x, y, s, color, rarity) {
    s = s || 1; color = color || '#f3c250';
    /* 有裝備素材圖就優先使用 */
    var ekey = equipSpriteName(slot, rarity);
    if (ekey && SPRITES[ekey]) {
      if (rarity >= 4) glow(g, x, y, 16 * s, rarity >= 5 ? 'rgba(255,59,212,.55)' : 'rgba(243,194,80,.5)', 0.7);
      if (drawSpriteFit(g, ekey, x, y, 18 * s)) return;
    }
    g.save();
    g.translate(x | 0, y | 0);
    g.scale(s, s);
    /* 傳說／神話：華麗外框 */
    if (rarity >= 4) {
      glow(g, 0, 0, 13, rarity >= 5 ? 'rgba(255,59,212,.8)' : 'rgba(243,194,80,.7)', 0.7);
      g.strokeStyle = rarity >= 5 ? '#ff3bd4' : '#f3c250';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-9, -3); g.lineTo(-9, -9); g.lineTo(-3, -9);
      g.moveTo(3, -9); g.lineTo(9, -9); g.lineTo(9, -3);
      g.moveTo(9, 3); g.lineTo(9, 9); g.lineTo(3, 9);
      g.moveTo(-3, 9); g.lineTo(-9, 9); g.lineTo(-9, 3);
      g.stroke();
      if (rarity >= 5) {
        g.fillStyle = '#ff3bd4';
        box(g, 0, -12, 1, 1, '#ff3bd4');
        box(g, 12, 0, 1, 1, '#ff3bd4');
        box(g, -12, 0, 1, 1, '#ff3bd4');
        box(g, 0, 11, 1, 1, '#ff3bd4');
      }
    }
    if (slot === 'amulet') {
      g.strokeStyle = color; g.lineWidth = 1;
      g.beginPath(); g.arc(0, -3, 5, 0.4, Math.PI - 0.4); g.stroke();
      glow(g, 0, 3, 7, color, 0.5);
      g.fillStyle = color; g.beginPath(); g.moveTo(0, 0); g.lineTo(3, 3.5); g.lineTo(0, 7); g.lineTo(-3, 3.5); g.closePath(); g.fill();
    } else if (slot === 'armor') {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(-6, -6); g.lineTo(-2, -8); g.lineTo(2, -8); g.lineTo(6, -6);
      g.lineTo(5, 4); g.lineTo(0, 8); g.lineTo(-5, 4); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(-1, -6, 2, 10);
    } else if (slot === 'ring') {
      g.strokeStyle = color; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 2, 5, 0, Math.PI * 2); g.stroke();
      glow(g, 0, -6, 6, color, 0.6);
      box(g, -2, -8, 4, 4, color);
    } else {
      glow(g, 0, 0, 9, color, 0.45);
      g.strokeStyle = color; g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 6); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
      g.beginPath(); g.arc(0, 0, 3, 0.6, 2.4); g.stroke();
    }
    g.restore();
  }

  /* ---------------- 外部貼圖（CC0，見 assets/CREDITS.md） ---------------- */
  var TEX = {};
  function loadTextures() {
    var list = {
      explosion: 'assets/explosion-sheet.png',
      sword: 'assets/knightSword.png',
      slash: 'assets/slash.png'
    };
    for (var k in list) {
      try {
        var img = new Image();
        img.src = list[k];
        TEX[k] = img;
      } catch (e) { TEX[k] = null; }
    }
    /* 場景照片 */
    TEX.scenes = {};
    var scenes = ['crypt', 'cave', 'lava', 'city', 'forest', 'ice', 'desert', 'ocean', 'clouds', 'space',
      'factory', 'cathedral', 'temple', 'galaxy', 'frozen', 'throne'];
    scenes.forEach(function (key) {
      try {
        var im = new Image();
        im.src = 'assets/scenes/' + key + '.jpg';
        TEX.scenes[key] = im;
      } catch (e) { TEX.scenes[key] = null; }
    });
  }

  /* 等待所有貼圖載入（給載入畫面用） */
  function texturesProgress() {
    var total = 0, done = 0;
    function tally(img) {
      if (!img) return;
      total++;
      if (img.complete) done++;
    }
    tally(TEX.explosion); tally(TEX.sword); tally(TEX.slash);
    if (TEX.scenes) for (var k in TEX.scenes) tally(TEX.scenes[k]);
    return total ? done / total : 1;
  }

  function texReady(name) {
    var img = TEX[name];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  return {
    C: C,
    TEX: TEX,
    loadTextures: loadTextures,
    texturesProgress: texturesProgress,
    texReady: texReady,
    box: box,
    fillRR: fillRR,
    glow: glow,
    shadow: shadow,
    drawHero: drawHero,
    drawEnemy: drawEnemy,
    drawHeroSheet: drawHeroSheet,
    HERO_SHEETS: HERO_SHEETS,
    mobSpriteFor: mobSpriteFor,
    drawBoss: drawBoss,
    buildRoom: buildRoom,
    drawTorch: drawTorch,
    drawPortal: drawPortal,
    drawChest: drawChest,
    drawSecretDoor: drawSecretDoor,
    drawPedestal: drawPedestal,
    drawProp: drawProp,
    drawPickup: drawPickup,
    drawWeaponIcon: drawWeaponIcon,
    drawSkillIcon: drawSkillIcon,
    drawUltIcon: drawUltIcon,
    skillIconSupports: skillIconSupports,
    drawEquipIcon: drawEquipIcon
  };
})();
