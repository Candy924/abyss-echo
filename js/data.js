/* =========================================================================
   data.js — 遊戲資料表（角色 / 武器 / 敵人 / 章節 / 裝備 / 寶箱）
   全部純資料，遊戲邏輯在 game.js，繪圖在 art.js
   ========================================================================= */
window.DATA = (function () {
  'use strict';

  /* ---------------- 稀有度（5 級） ---------------- */
  var RARITY = [
    { id: 0, name: '普通', color: '#9aa3b8', glow: 'rgba(154,163,184,.55)', mult: 1.00, affix: 0, weight: 52 },
    { id: 1, name: '精良', color: '#5ad17a', glow: 'rgba(90,209,122,.55)', mult: 1.16, affix: 1, weight: 28 },
    { id: 2, name: '稀有', color: '#4aa3f0', glow: 'rgba(74,163,240,.6)', mult: 1.36, affix: 2, weight: 13 },
    { id: 3, name: '史詩', color: '#b07cf0', glow: 'rgba(176,124,240,.65)', mult: 1.60, affix: 3, weight: 6 },
    { id: 4, name: '傳說', color: '#f3c250', glow: 'rgba(243,194,80,.7)', mult: 1.92, affix: 4, weight: 0.08 },
    { id: 5, name: '神話', color: '#ff3bd4', glow: 'rgba(255,59,212,.85)', mult: 2.35, affix: 5, weight: 0.02 }
  ];

  /* ---------------- 角色（13） ---------------- */
  var HEROES = {
    knight: {
      id: 'knight', name: 'Sable', title: 'Void Knight', kind: 'knight',
      hp: 122, spd: 96, en: 100, atk: 1.00, cost: 0,
      palette: { a: '#c8d2e6', b: '#8b96b4', c: '#e2574c', d: '#f3c250' },
      skill: { name: 'Void Bulwark', cd: 9, kind: 'shield', desc: 'Turns invincible for 2.4s; enemy bullets become coins.' }
    },
    mage: {
      id: 'mage', name: 'Cinder', title: 'Ember Mage', kind: 'mage',
      hp: 88, spd: 94, en: 158, atk: 1.12, cost: 90,
      palette: { a: '#8e6bf2', b: '#4b2f9e', c: '#c9b6ff', d: '#f3c250' },
      skill: { name: 'Ember Nova', cd: 7, kind: 'nova', desc: 'A ring shockwave that blasts and knocks back nearby foes.' }
    },
    ranger: {
      id: 'ranger', name: 'Nix', title: 'Frost Warden', kind: 'ranger',
      hp: 100, spd: 118, en: 110, atk: 1.05, cost: 140,
      palette: { a: '#59cf74', b: '#2a7f43', c: '#57e0a8', d: '#b98c3a' },
      skill: { name: 'Glacier Step', cd: 6, kind: 'dash', desc: 'Dashes toward your aim; fire rate +60% for 3s.' }
    },
    paladin: {
      id: 'paladin', name: 'Lumen', title: 'Sun Priest', kind: 'knight',
      hp: 136, spd: 90, en: 110, atk: 1.06, cost: 220,
      palette: { a: '#f6efd2', b: '#c8a94a', c: '#f3c250', d: '#8be8ff' },
      skill: { name: 'Solar Blessing', cd: 10, kind: 'holy', desc: 'Heals 30% HP and smites nearby enemies with holy light.' }
    },
    assassin: {
      id: 'assassin', name: 'Wraith', title: 'Specter', kind: 'ranger',
      hp: 92, spd: 126, en: 105, atk: 1.14, cost: 260,
      palette: { a: '#3c3355', b: '#1e1830', c: '#e2574c', d: '#b07cf0' },
      skill: { name: 'Phase Shift', cd: 5.5, kind: 'blink', desc: 'Blinks to your cursor; crit rate surges for 3s.' }
    },
    engineer: {
      id: 'engineer', name: 'Grub', title: 'Alchemist', kind: 'tech',
      hp: 108, spd: 100, en: 130, atk: 1.04, cost: 300,
      palette: { a: '#c98a4b', b: '#6b4526', c: '#8cf0ff', d: '#f3c250' },
      skill: { name: 'Flask Barrage', cd: 8, kind: 'rockets', desc: 'Fires 5 homing rockets at once.' }
    },
    monk: {
      id: 'monk', name: 'Thorne', title: 'Thorn Druid', kind: 'robe',
      hp: 116, spd: 108, en: 100, atk: 1.10, cost: 320,
      palette: { a: '#e8b04b', b: '#8a5a1f', c: '#ffd98a', d: '#f2f0e6' },
      skill: { name: 'Bramble Wave', cd: 7, kind: 'wave', desc: 'A cone of chi that staggers and knocks enemies back.' }
    },
    necromancer: {
      id: 'necromancer', name: 'Hollow', title: 'Bone Whisperer', kind: 'mage',
      hp: 94, spd: 92, en: 145, atk: 1.16, cost: 380,
      palette: { a: '#5a4b7a', b: '#241a38', c: '#8be08b', d: '#b07cf0' },
      skill: { name: 'Soul Siphon', cd: 8, kind: 'drain', desc: 'Drains life from nearby enemies into yourself.' }
    },
    berserker: {
      id: 'berserker', name: 'Ferrum', title: 'Forge Golem', kind: 'bulky',
      hp: 150, spd: 104, en: 90, atk: 1.20, cost: 400,
      palette: { a: '#c25a45', b: '#6e2a1e', c: '#f0a04b', d: '#d8c8a8' },
      skill: { name: 'Molten Rage', cd: 11, kind: 'rage', desc: '6s: +45% damage, +20% speed, -30% damage taken.' }
    },
    alchemist: {
      id: 'alchemist', name: 'Morrigan', title: 'Hex Witch', kind: 'robe',
      hp: 100, spd: 98, en: 140, atk: 1.08, cost: 440,
      palette: { a: '#7ad1a8', b: '#2c6b52', c: '#d4ff7a', d: '#b07cf0' },
      skill: { name: 'Hex Miasma', cd: 7, kind: 'cloud', desc: 'Leaves a poison cloud at your cursor.' }
    },
    druid: {
      id: 'druid', name: 'Vesper', title: 'Plague Doctor', kind: 'ranger',
      hp: 112, spd: 106, en: 120, atk: 1.06, cost: 480,
      palette: { a: '#6fae5a', b: '#2f5a2a', c: '#c7f08a', d: '#8a5a35' },
      skill: { name: 'Plague Roots', cd: 8, kind: 'roots', desc: 'Roots nearby enemies for 2.5s and deals damage.' }
    },
    samurai: {
      id: 'samurai', name: 'Raiden', title: 'Blade Master', kind: 'bulky',
      hp: 118, spd: 104, en: 105, atk: 1.15, cost: 520,
      palette: { a: '#8f1f2e', b: '#3a0d16', c: '#f3c250', d: '#e8e4d8' },
      skill: { name: 'Iai Slash', cd: 6.5, kind: 'slash', desc: 'A piercing blade wave cuts through a whole line.' }
    },
    gunslinger: {
      id: 'gunslinger', name: 'Vex', title: 'Storm Gunner', kind: 'tech',
      hp: 96, spd: 112, en: 125, atk: 1.10, cost: 560,
      palette: { a: '#b98c3a', b: '#5a3a1a', c: '#ffd166', d: '#8cf0ff' },
      skill: { name: 'Bullet Storm', cd: 7, kind: 'bulletstorm', desc: 'Sprays 18 bullets in every direction.' }
    },

    /* ---- 付費角色（高價解鎖，技能／大招更炫） ---- */
    astromancer: {
      id: 'astromancer', name: 'Nova', title: 'Star Seer', kind: 'mage',
      hp: 92, spd: 100, en: 165, atk: 1.16, cost: 880, paid: true,
      palette: { a: '#7a5cf0', b: '#2a1a5a', c: '#ffd166', d: '#8cf0ff' },
      skill: { name: 'Starfall', cd: 7, kind: 'meteorcall', desc: 'Calls 4 meteors down at your cursor.' }
    },
    chronomancer: {
      id: 'chronomancer', name: '時空旅者', title: '逆時之影', kind: 'assassin',
      hp: 88, spd: 124, en: 150, atk: 1.14, cost: 1080, paid: true,
      palette: { a: '#4ff0d0', b: '#0f3a3a', c: '#a8fff0', d: '#ff3bd4' },
      skill: { name: '時間凝滯', cd: 8, kind: 'timeslow', desc: '凍住全場敵人 3 秒，期間你仍可自由行動。' }
    },
    dragonkin: {
      id: 'dragonkin', name: '龍裔', title: '血脈覺醒', kind: 'knight',
      hp: 130, spd: 98, en: 120, atk: 1.20, cost: 1280, paid: true,
      palette: { a: '#c0392b', b: '#5a1208', c: '#ffb347', d: '#ffe6a1' },
      skill: { name: '龍息', cd: 7, kind: 'breath', desc: '噴出扇形烈焰，燒穿前方所有敵人。' }
    },
    voidlord: {
      id: 'voidlord', name: '虛空君王', title: '深淵之主', kind: 'mage',
      hp: 168, spd: 106, en: 190, atk: 1.46, cost: 2380, paid: true,
      palette: { a: '#6a3bd0', b: '#1a0a3a', c: '#c9a6ff', d: '#8cf0ff' },
      skill: { name: '虛空崩解', cd: 6, kind: 'nova', desc: '釋放超大範圍虛空衝擊，重創全場敵人（威力遠高於一般範圍技）。' }
    },
    sunpriest: {
      id: 'sunpriest', name: '曙光祭司', title: '黎明的最後祈禱', kind: 'mage',
      hp: 148, spd: 102, en: 230, atk: 1.38, cost: 2680, paid: true,
      palette: { a: '#f0c040', b: '#5a3a08', c: '#fff3c4', d: '#ffd166' },
      skill: { name: '聖域', cd: 7, kind: 'holy', desc: '降下聖域：大量回復自身並以聖光灼燒周圍敵人。' }
    }
  };

  /* ---------------- 武器（28） ---------------- */
  /* shape 只影響圖示；其餘是戰鬥數值 */
  var WEAPONS = {
    pistol:   { id: 'pistol',   name: '手槍',       shape: 'pistol',   dmg: 9,  rate: 0.22,  cost: 1, spread: 0.05, pellets: 1, speed: 300, life: 0.9,  r: 2.2, pierce: 0, knock: 40,  color: '#ffe8a3' },
    smg:      { id: 'smg',      name: '衝鋒槍',     shape: 'smg',      dmg: 5,  rate: 0.085, cost: 1, spread: 0.13, pellets: 1, speed: 330, life: 0.75, r: 1.8, pierce: 0, knock: 18,  color: '#bfe8ff' },
    shotgun:  { id: 'shotgun',  name: '散彈槍',     shape: 'shotgun',  dmg: 5,  rate: 0.72,  cost: 4, spread: 0.34, pellets: 6, speed: 285, life: 0.42, r: 2.0, pierce: 0, knock: 95,  color: '#ffc98a' },
    laser:    { id: 'laser',    name: '雷射步槍',   shape: 'rifle',    dmg: 13, rate: 0.40,  cost: 4, spread: 0.012, pellets: 1, speed: 620, life: 0.8, r: 1.7, pierce: 4, knock: 12, color: '#8cf0ff', long: true },
    staff:    { id: 'staff',    name: '秘法杖',     shape: 'wand',     dmg: 11, rate: 0.50,  cost: 5, spread: 0.06, pellets: 1, speed: 235, life: 1.2, r: 3.4, pierce: 0, knock: 55, color: '#c9a6ff', splash: 26 },
    bow:      { id: 'bow',      name: '獵弓',       shape: 'bow',      dmg: 20, rate: 0.55,  cost: 2, spread: 0.02, pellets: 1, speed: 520, life: 1.1, r: 2.0, pierce: 2, knock: 60, color: '#a8f0b0', long: true },
    sword:    { id: 'sword',    name: '闊劍',       shape: 'sword',    dmg: 24, rate: 0.42,  cost: 0, melee: true, range: 40, arc: 1.9, knock: 170, color: '#ffffff' },
    rpg:      { id: 'rpg',      name: '火箭筒',     shape: 'launcher', dmg: 40, rate: 1.10,  cost: 8, spread: 0.03, pellets: 1, speed: 210, life: 1.4, r: 4.0, pierce: 0, knock: 90, color: '#ff9a5c', splash: 54 },

    akimbo:   { id: 'akimbo',   name: '雙持手槍',   shape: 'pistol',   dmg: 7,  rate: 0.24,  cost: 2, spread: 0.07, pellets: 1, speed: 320, life: 0.8, r: 2.0, pierce: 0, knock: 25, color: '#ffe0a0', burst: 2 },
    frost:    { id: 'frost',    name: '冰霜法杖',   shape: 'wand',     dmg: 9,  rate: 0.45,  cost: 4, spread: 0.05, pellets: 1, speed: 270, life: 1.1, r: 3.0, pierce: 0, knock: 30, color: '#a8e8ff', splash: 22, slow: 1.6 },
    plasma:   { id: 'plasma',   name: '電漿步槍',   shape: 'rifle',    dmg: 11, rate: 0.32,  cost: 4, spread: 0.02, pellets: 1, speed: 700, life: 0.7, r: 1.8, pierce: 2, knock: 10, color: '#b9a8ff', chain: 1, long: true },
    crossbow: { id: 'crossbow', name: '十字弩',     shape: 'crossbow', dmg: 34, rate: 0.80,  cost: 3, spread: 0.01, pellets: 1, speed: 640, life: 1.0, r: 2.0, pierce: 3, knock: 70, color: '#e8dcc0', long: true },
    chakram:  { id: 'chakram',  name: '迴旋刃',     shape: 'chakram',  dmg: 14, rate: 0.55,  cost: 2, spread: 0.02, pellets: 1, speed: 400, life: 1.6, r: 4.0, pierce: 9, knock: 30, color: '#ffd166', boomerang: true },
    spear:    { id: 'spear',    name: '長矛',       shape: 'spear',    dmg: 28, rate: 0.50,  cost: 0, melee: true, range: 58, arc: 0.9, knock: 130, color: '#ffffff' },
    hammer:   { id: 'hammer',   name: '戰鎚',       shape: 'hammer',   dmg: 34, rate: 0.72,  cost: 0, melee: true, range: 46, arc: 2.5, knock: 280, color: '#ffffff', splash: 30 },
    flamer:   { id: 'flamer',   name: '火焰噴射器', shape: 'smg',      dmg: 4,  rate: 0.05,  cost: 1, spread: 0.30, pellets: 1, speed: 190, life: 0.28, r: 3.4, pierce: 1, knock: 5, color: '#ff9a3c', burn: 2.2 },
    venom:    { id: 'venom',    name: '毒液噴射器', shape: 'smg',      dmg: 3,  rate: 0.06,  cost: 1, spread: 0.26, pellets: 1, speed: 220, life: 0.45, r: 3.2, pierce: 1, knock: 5, color: '#a8e05a', poison: 3.0, splash: 16 },
    railgun:  { id: 'railgun',  name: '磁軌炮',     shape: 'rifle',    dmg: 70, rate: 1.30,  cost: 9, spread: 0, pellets: 1, speed: 1, life: 1, r: 2, pierce: 0, knock: 60, color: '#8cf0ff', beam: true },
    grenade:  { id: 'grenade',  name: '榴彈發射器', shape: 'launcher', dmg: 26, rate: 0.90,  cost: 5, spread: 0.05, pellets: 1, speed: 260, life: 1.6, r: 3.4, pierce: 0, knock: 40, color: '#c8d17a', splash: 42, bounce: 3 },
    repeater: { id: 'repeater', name: '連弩',       shape: 'crossbow', dmg: 12, rate: 0.40,  cost: 2, spread: 0.04, pellets: 1, speed: 560, life: 0.9, r: 1.9, pierce: 1, knock: 30, color: '#e8dcc0', burst: 3, long: true },
    photon:   { id: 'photon',   name: '光子刃',     shape: 'blade',    dmg: 18, rate: 0.28,  cost: 1, melee: true, range: 44, arc: 1.8, knock: 90, color: '#8cf0ff' },
    sniper:   { id: 'sniper',   name: '狙擊槍',     shape: 'rifle',    dmg: 55, rate: 1.00,  cost: 6, spread: 0, pellets: 1, speed: 900, life: 1.2, r: 1.6, pierce: 4, knock: 120, color: '#ffffff', long: true },
    icicle:   { id: 'icicle',   name: '冰錐槍',     shape: 'wand',     dmg: 10, rate: 0.30,  cost: 3, spread: 0.10, pellets: 1, speed: 230, life: 1.4, r: 2.6, pierce: 0, knock: 20, color: '#c8f0ff', homing: 3.4, slow: 1.2 },
    knives:   { id: 'knives',   name: '飛刀',       shape: 'knife',    dmg: 8,  rate: 0.14,  cost: 1, spread: 0.08, pellets: 1, speed: 520, life: 1.2, r: 1.8, pierce: 0, knock: 10, color: '#dfe7f7', bounce: 2 },
    sonic:    { id: 'sonic',    name: '音波炮',     shape: 'cannon',   dmg: 9,  rate: 0.35,  cost: 3, spread: 0.50, pellets: 5, speed: 280, life: 0.55, r: 2.4, pierce: 1, knock: 60, color: '#c9a6ff' },
    voidorb:  { id: 'voidorb',  name: '引力球',     shape: 'orb',      dmg: 22, rate: 0.85,  cost: 6, spread: 0.02, pellets: 1, speed: 155, life: 1.6, r: 5.0, pierce: 0, knock: 120, color: '#b07cf0', splash: 70 },
    scepter:  { id: 'scepter',  name: '聖光權杖',   shape: 'scepter',  dmg: 12, rate: 0.40,  cost: 3, spread: 0.04, pellets: 1, speed: 310, life: 1.0, r: 2.6, pierce: 1, knock: 40, color: '#ffe6a1', heal: 1.5 },
    dragon:   { id: 'dragon',   name: '龍息炮',     shape: 'cannon',   dmg: 30, rate: 1.20,  cost: 8, spread: 0.06, pellets: 1, speed: 205, life: 1.5, r: 4.6, pierce: 0, knock: 100, color: '#ff7a3c', splash: 48, burn: 3.0 },

    /* ---- 付費武器（購買後才會出現在寶箱與商店） ---- */
    chaos:       { id: 'chaos',       name: '炸天',   shape: 'chaos',   premium: true, dmg: 58, rate: 0.40, cost: 6, spread: 0.09, pellets: 2, speed: 470, life: 1.2, r: 4.6, pierce: 2, knock: 150, color: '#ff5da8', splash: 70, burn: 2.6 },
    frostcannon: { id: 'frostcannon', name: '霜獄',   shape: 'cannon',  premium: true, dmg: 38, rate: 0.72, cost: 5, spread: 0.30, pellets: 6, speed: 320, life: 0.65, r: 3.2, pierce: 1, knock: 80,  color: '#a8e8ff', splash: 34, slow: 2.8 },
    thunder:     { id: 'thunder',     name: '雷神',   shape: 'rifle',   premium: true, dmg: 34, rate: 0.46, cost: 5, spread: 0.03, pellets: 1, speed: 450, life: 1.05, r: 2.8, pierce: 2, knock: 50,  color: '#ffe066', chain: 4 },
    meteor:      { id: 'meteor',      name: '星隕',   shape: 'orb',     premium: true, dmg: 50, rate: 0.95, cost: 7, spread: 0.02, pellets: 1, speed: 250, life: 1.7, r: 4.8, pierce: 0, knock: 120, color: '#ff9a3c', splash: 60, homing: 3.0 },

    /* 究極巔峰：解鎖全部付費武器後獲得 */
    nova:        { id: 'nova',        name: '究極·核彈', shape: 'nova', premium: true, ultimate: true, dmg: 90, rate: 1.6, cost: 12, spread: 0.02, pellets: 1, speed: 150, life: 1.9, r: 6.5, pierce: 0, knock: 200, color: '#ffe066', splash: 160, burn: 5, nuke: true }
  };

  var DROPPABLE = Object.keys(WEAPONS).filter(function (k) { return !WEAPONS[k].premium; });

  /* ---------------- 章節 / 敵人（每 10 層換一批） ---------------- */
  var TIERS = [
    {
      name: '腐朽墓穴', sub: 'CHAPTER I', accent: '#8e6bf2',
      enemies: ['slime', 'bat', 'skel', 'boar'], boss: 'warden'
    },
    {
      name: '劇毒沼澤', sub: 'CHAPTER II', accent: '#6fae5a',
      enemies: ['plague', 'wasp', 'shaman', 'toad'], boss: 'hydra'
    },
    {
      name: '機械工廠', sub: 'CHAPTER III', accent: '#63a9f0',
      enemies: ['drone', 'turret', 'saw', 'mech'], boss: 'titan'
    },
    {
      name: '熔岩深淵', sub: 'CHAPTER IV', accent: '#e2574c',
      enemies: ['imp', 'magma', 'flamer', 'golem'], boss: 'behemoth'
    },
    {
      name: '虛空邊界', sub: 'CHAPTER V', accent: '#b07cf0',
      enemies: ['wraith', 'voidmage', 'rift', 'abyss'], boss: 'avatar'
    }
  ];

  /* arch: blob / flyer / caster / charger / tank
     pal: {body, dark, accent, eye} */
  var ENEMIES = {
    slime:    { name: '史萊姆',   arch: 'blob',    hp: 26, spd: 54,  dmg: 8,  r: 8,  coin: 2, pal: { body: '#59cf74', dark: '#2a7f43', accent: '#a8f0b0', eye: '#0b0913' } },
    bat:      { name: '蝙蝠',     arch: 'flyer',   hp: 18, spd: 128, dmg: 6,  r: 6,  coin: 2, pal: { body: '#b98cf0', dark: '#432c94', accent: '#e2d4ff', eye: '#ff5d5d' } },
    skel:     { name: '骷髏法師', arch: 'caster',  hp: 36, spd: 48,  dmg: 10, r: 7,  coin: 3, ranged: 1.7, pal: { body: '#efe9d8', dark: '#2f2258', accent: '#57e0a8', eye: '#8be08b' } },
    boar:     { name: '野豬',     arch: 'charger', hp: 60, spd: 66,  dmg: 14, r: 9,  coin: 4, pal: { body: '#8a5a35', dark: '#4f301a', accent: '#efe9d8', eye: '#ff5d5d' } },

    plague:   { name: '疫病之泥', arch: 'blob',    hp: 42, spd: 50,  dmg: 10, r: 9,  coin: 3, poison: 2, pal: { body: '#7ad1a8', dark: '#2c6b52', accent: '#d4ff7a', eye: '#0b0913' } },
    wasp:     { name: '毒蜂',     arch: 'flyer',   hp: 24, spd: 150, dmg: 8,  r: 6,  coin: 3, pal: { body: '#e8c84b', dark: '#6b5410', accent: '#2a2a2a', eye: '#ff5d5d' } },
    shaman:   { name: '沼澤巫醫', arch: 'caster',  hp: 48, spd: 44,  dmg: 11, r: 7,  coin: 4, ranged: 1.5, poison: 2, pal: { body: '#6fae5a', dark: '#26401f', accent: '#c7f08a', eye: '#d4ff7a' } },
    toad:     { name: '巨蟾',     arch: 'charger', hp: 78, spd: 58,  dmg: 16, r: 10, coin: 5, pal: { body: '#8fb04b', dark: '#3e4f1c', accent: '#f0e6b0', eye: '#ff5d5d' } },

    drone:    { name: '偵察機',   arch: 'flyer',   hp: 30, spd: 160, dmg: 9,  r: 7,  coin: 3, pal: { body: '#9fb4d8', dark: '#47597e', accent: '#8cf0ff', eye: '#ff3b3b' } },
    turret:   { name: '哨戒炮',   arch: 'caster',  hp: 62, spd: 30,  dmg: 12, r: 8,  coin: 4, ranged: 1.2, pal: { body: '#7a8ab0', dark: '#333d55', accent: '#ff6b5e', eye: '#ff3b3b' } },
    saw:      { name: '切割機',   arch: 'charger', hp: 54, spd: 84,  dmg: 15, r: 9,  coin: 4, pal: { body: '#c8d2e6', dark: '#5d6885', accent: '#ff9a5c', eye: '#ff3b3b' } },
    mech:     { name: '機甲兵',   arch: 'tank',    hp: 130, spd: 52, dmg: 18, r: 12, coin: 7, pal: { body: '#8b96b4', dark: '#3c4459', accent: '#8cf0ff', eye: '#ff3b3b' } },

    imp:      { name: '火魔精',   arch: 'flyer',   hp: 34, spd: 138, dmg: 9,  r: 6,  coin: 3, ranged: 2.0, burn: 2, pal: { body: '#e2574c', dark: '#6b1a14', accent: '#ffb347', eye: '#ffe6a1' } },
    magma:    { name: '熔岩泥',   arch: 'blob',    hp: 70, spd: 46,  dmg: 13, r: 10, coin: 4, burn: 2, pal: { body: '#d1563c', dark: '#5c1a10', accent: '#ffd166', eye: '#ffe6a1' } },
    flamer:   { name: '噴火獸',   arch: 'caster',  hp: 66, spd: 42,  dmg: 12, r: 8,  coin: 5, ranged: 1.4, burn: 2, pal: { body: '#b04a2a', dark: '#4a1a0c', accent: '#ff9a3c', eye: '#ffd166' } },
    golem:    { name: '熔岩巨像', arch: 'tank',    hp: 180, spd: 44, dmg: 20, r: 13, coin: 9, pal: { body: '#8a4a3a', dark: '#3a1510', accent: '#ff9a3c', eye: '#ffd166' } },

    wraith:   { name: '幽影',     arch: 'flyer',   hp: 44, spd: 132, dmg: 11, r: 7,  coin: 4, pal: { body: '#6a5a9a', dark: '#241a38', accent: '#c9b6ff', eye: '#e2d4ff' } },
    voidmage: { name: '虛空法師', arch: 'caster',  hp: 80, spd: 46,  dmg: 14, r: 8,  coin: 6, ranged: 1.3, pal: { body: '#4b2f9e', dark: '#1a0f3a', accent: '#b07cf0', eye: '#e2d4ff' } },
    rift:     { name: '裂界獸',   arch: 'charger', hp: 120, spd: 78,  dmg: 18, r: 11, coin: 7, pal: { body: '#3c2a6e', dark: '#150d2a', accent: '#8cf0ff', eye: '#8cf0ff' } },
    abyss:    { name: '深淵眷屬', arch: 'tank',    hp: 240, spd: 50,  dmg: 22, r: 14, coin: 11, pal: { body: '#2a1f4a', dark: '#0d0818', accent: '#e2574c', eye: '#ff3b3b' } }
  };

  /* 五隻頭目 */
  var BOSSES = {
    warden:   { name: '深淵守衛', hp: 720,  spd: 32, dmg: 18, r: 20, coin: 30, pattern: 'radial', pal: { body: '#8f1f2e', dark: '#3a0a12', accent: '#f3c250', eye: '#ffd166' } },
    hydra:    { name: '九頭沼主', hp: 980,  spd: 30, dmg: 20, r: 22, coin: 34, pattern: 'radial', pal: { body: '#4f7a3a', dark: '#1c2e14', accent: '#c7f08a', eye: '#d4ff7a' } },
    titan:    { name: '鍛造泰坦', hp: 1250, spd: 28, dmg: 22, r: 23, coin: 38, pattern: 'slam',   pal: { body: '#6b7492', dark: '#252c3d', accent: '#8cf0ff', eye: '#ff3b3b' } },
    behemoth: { name: '熔核巨獸', hp: 1550, spd: 30, dmg: 24, r: 24, coin: 42, pattern: 'charge', pal: { body: '#a03a26', dark: '#3a0f08', accent: '#ffb347', eye: '#ffe6a1' } },
    avatar:   { name: '虛空化身', hp: 1900, spd: 34, dmg: 26, r: 25, coin: 48, pattern: 'beam',   pal: { body: '#2a1f4a', dark: '#0a0612', accent: '#b07cf0', eye: '#e2d4ff' } },
    spider:   { name: '蛛后·阿拉克涅', hp: 1400, spd: 40, dmg: 23, r: 22, coin: 40, pattern: 'summon', pal: { body: '#7a3a8a', dark: '#2a1030', accent: '#e05aff', eye: '#ffd166' } },
    frost:    { name: '霜巨人', hp: 1700, spd: 24, dmg: 25, r: 24, coin: 44, pattern: 'slam',   pal: { body: '#4a7aa8', dark: '#16293a', accent: '#a8e8ff', eye: '#e8ffff' } },
    darkknight: { name: '深淵騎士', hp: 1500, spd: 46, dmg: 27, r: 21, coin: 46, pattern: 'charge', pal: { body: '#2a2a44', dark: '#0a0a14', accent: '#ff3bd4', eye: '#ff3bd4' } },

    /* ---- 追加 10 名造型與攻擊完全不同的首領 ---- */
    ironjaw:   { name: '機械巨獸 · 鐵顎', hp: 2100, spd: 26, dmg: 28, r: 24, coin: 52, pattern: 'missiles',
      pal: { body: '#5a6478', dark: '#1a2030', accent: '#8cf0ff', eye: '#ff3b3b', arch: 'mech' } },
    hornfang:  { name: '荒野巨獸 · 角牙', hp: 1800, spd: 44, dmg: 30, r: 23, coin: 50, pattern: 'charge',
      pal: { body: '#8a5a2a', dark: '#2e1a08', accent: '#ffd166', eye: '#ff7a3c', arch: 'beast' } },
    hunter0:   { name: '現代獵人 · 零號', hp: 1600, spd: 40, dmg: 24, r: 20, coin: 48, pattern: 'minigun',
      pal: { body: '#3a4a3a', dark: '#12180f', accent: '#ffe066', eye: '#ffffff', arch: 'human' } },
    gazer:     { name: '凝視之眼', hp: 1900, spd: 20, dmg: 26, r: 26, coin: 54, pattern: 'beam',
      pal: { body: '#6a3a8a', dark: '#1a0a24', accent: '#ff5ce0', eye: '#ffe6a1', arch: 'eye' } },
    ouroboros: { name: '深淵巨蛇 · 銜尾', hp: 2200, spd: 36, dmg: 27, r: 24, coin: 55, pattern: 'radial',
      pal: { body: '#2f6a4a', dark: '#0c2418', accent: '#8be08b', eye: '#e2ffb0', arch: 'serpent' } },
    magma2:    { name: '熔岩魔像', hp: 2600, spd: 22, dmg: 32, r: 26, coin: 58, pattern: 'slam',
      pal: { body: '#a8442a', dark: '#3a1208', accent: '#ffb347', eye: '#ffe6a1', arch: 'golem2' } },
    wraithking:{ name: '幽魂之王', hp: 2000, spd: 30, dmg: 25, r: 23, coin: 56, pattern: 'summon',
      pal: { body: '#3a2f5a', dark: '#100a1e', accent: '#b07cf0', eye: '#e2d4ff', arch: 'wraith' } },
    shellback: { name: '甲殼巨獸', hp: 2400, spd: 28, dmg: 29, r: 26, coin: 54, pattern: 'charge',
      pal: { body: '#4a6a8a', dark: '#14202e', accent: '#8cf0ff', eye: '#ffd166', arch: 'crab' } },
    mirrorknight:{ name: '鏡像騎士', hp: 2100, spd: 42, dmg: 28, r: 21, coin: 56, pattern: 'beam',
      pal: { body: '#7a8aa8', dark: '#20283a', accent: '#ffffff', eye: '#a8fff0', arch: 'mirror' } },
    clockwork: { name: '時鐘巨像', hp: 2800, spd: 20, dmg: 30, r: 27, coin: 60, pattern: 'radial',
      pal: { body: '#7a6a4a', dark: '#241c10', accent: '#f3c250', eye: '#ffe066', arch: 'titan2' } }
  };

  /* ---------------- 裝備（5 級稀有度 × 隨機詞條） ---------------- */
  var STATS = {
    atk:      { name: '攻擊力', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.05, max: 0.22 },
    spd:      { name: '移動速度', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.04, max: 0.16 },
    hp:       { name: '生命上限', fmt: function (v) { return '+' + Math.round(v); }, base: 9, max: 45 },
    crit:     { name: '暴擊率', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.05, max: 0.18 },
    luck:     { name: '幸運', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.06, max: 0.25 },
    regen:    { name: '能量回復', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.08, max: 0.30 },
    coin:     { name: '金幣獲得', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.06, max: 0.25 },
    lifesteal:{ name: '生命竊取', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.03, max: 0.10 },
    armor:    { name: '減傷', fmt: function (v) { return '+' + Math.round(v * 100) + '%'; }, base: 0.03, max: 0.12 }
  };

  var EQUIP_SLOTS = [
    { key: 'amulet', name: '護符', icon: 'amulet', pool: ['atk', 'crit', 'regen', 'luck'] },
    { key: 'armor', name: '護甲', icon: 'armor', pool: ['hp', 'armor', 'spd', 'lifesteal'] },
    { key: 'ring', name: '戒指', icon: 'ring', pool: ['crit', 'atk', 'coin', 'luck'] },
    { key: 'sigil', name: '符印', icon: 'sigil', pool: ['regen', 'hp', 'lifesteal', 'armor'] }
  ];

  var EQUIP_PREFIX = ['破舊的', '堅實的', '鑲銀的', '秘銀的', '星辰的', '深淵的', '古老的', '血染的'];

  /* 傳說以上的裝備特殊效果 */
  var EQUIP_SPECIALS = [
    { id: 'blast', name: '爆裂', desc: '攻擊附帶小範圍爆炸', color: '#ffb347' },
    { id: 'leech', name: '吸取', desc: '額外 4% 生命竊取', color: '#e2574c' },
    { id: 'thorns', name: '尖刺', desc: '受傷時反彈傷害', color: '#c7f08a' },
    { id: 'swift', name: '疾風', desc: '移動速度 +8%', color: '#57e0a8' },
    { id: 'guard', name: '守護', desc: '受到傷害 -6%', color: '#9ad0ff' },
    { id: 'greed', name: '貪婪', desc: '金幣 +15%', color: '#ffd166' },
    /* 十件專屬裝備的特殊效果 */
    { id: 'aegis', name: '龍鱗壁壘', desc: '每層開始獲得 1 層護盾', color: '#8cf0ff' },
    { id: 'starburst', name: '星爆', desc: '暴擊時引發小爆炸', color: '#ffe6a1' },
    { id: 'bloodpact', name: '血契', desc: '每次擊殺回復 4 點生命', color: '#ff3b5c' },
    { id: 'voidwalk', name: '虛空步', desc: '受傷時周圍敵人被減速', color: '#b07cf0' },
    { id: 'gale', name: '疾風祝福', desc: '衝刺冷卻 -30%', color: '#57e0a8' },
    { id: 'genesis', name: '創世循環', desc: '每 8 秒回复 6% 生命', color: '#ff3bd4' },
    { id: 'eternal', name: '永恆庇佑', desc: '致命傷時保留 1 點生命（每輪一次）', color: '#c9b6ff' },
    { id: 'abyssal', name: '深淵貪食', desc: '擊殺疊加傷害（最多 5 層）', color: '#ff5ce0' },
    { id: 'primordial', name: '太初之力', desc: '傷害 +12%、減傷 +8%', color: '#ffe066' },
    { id: 'fate', name: '天命', desc: '幸運 +20%、暴擊 +6%', color: '#ffd166' }
  ];

  /* ---------------- 寶箱（4 個等級） ---------------- */
  var CHESTS = [
    { id: 0, name: '木箱', color: '#8a5a35', accent: '#c8a06a', rarityBonus: 0, coins: [10, 22], choices: 2, keyCost: 1, keyType: 'bronze' },
    { id: 1, name: '鐵箱', color: '#7a8ab0', accent: '#c8d2e6', rarityBonus: 0.10, coins: [20, 38], choices: 2, keyCost: 1, keyType: 'bronze' },
    { id: 2, name: '金箱', color: '#b08a2a', accent: '#f3c250', rarityBonus: 0.22, coins: [35, 60], choices: 3, keyCost: 1, keyType: 'silver' },
    { id: 3, name: '水晶箱', color: '#5a3fb0', accent: '#b07cf0', rarityBonus: 0.38, coins: [55, 90], choices: 3, keyCost: 1, keyType: 'gold' },
    { id: 4, name: '神話寶箱', color: '#8a1060', accent: '#ff3bd4', rarityBonus: 0.6, coins: [90, 140], choices: 4, keyCost: 1, keyType: 'mythic' }
  ];

  /* ---------------- 終極大招（每名角色一個） ---------------- */
  var ULTIMATES = {
    knight:      { name: '天罰聖劍', kind: 'swordfall',  desc: '召喚一柄巨劍從天而降，貫穿全場並掀起衝擊波，對所有敵人造成毀滅性傷害。' },
    mage:        { name: '隕星墜落', kind: 'meteor',     desc: '在準心位置連續轟下三顆隕石。' },
    ranger:      { name: '千箭之雨', kind: 'arrowrain',  desc: '4 秒內自動高速射擊最近的敵人。' },
    paladin:     { name: '神聖壁壘', kind: 'bastion',    desc: '5 秒無敵，並立刻回復 50% 生命。' },
    assassin:    { name: '死神印記', kind: 'mark',       desc: '瞬移到準心並引爆暗影，3 秒暴擊大幅提升。' },
    engineer:    { name: '軌道轟炸', kind: 'orbital',    desc: '六道軌道光束隨機轟擊敵人。' },
    monk:        { name: '萬佛朝宗', kind: 'shockwave',  desc: '把全場敵人震開並造成重創。' },
    necromancer: { name: '亡靈軍團', kind: 'legion',     desc: '射出 24 發追蹤靈魂彈。' },
    berserker:   { name: '血怒',     kind: 'bloodrage',  desc: '10 秒攻擊 +80%、移速 +30%、吸血 15%。' },
    alchemist:   { name: '賢者之石', kind: 'philosopher',desc: '全場中毒，並在腳下留下大片毒霧。' },
    druid:       { name: '森林之怒', kind: 'forest',     desc: '定住全場敵人 4 秒並造成傷害。' },
    samurai:     { name: '無我',     kind: 'iai',        desc: '連續三道環形居合斬。' },
    gunslinger:  { name: '死亡華爾滋', kind: 'waltz',    desc: '兩波環形彈幕，3 秒內不消耗能量。' },
    astromancer: { name: '星辰墜落', kind: 'starfall',   desc: '八顆流星轟炸整個戰場，全場重創。' },
    chronomancer:{ name: '逆轉時軸', kind: 'temporal',   desc: '凍結全場 4 秒，並回復 35% 生命。' },
    dragonkin:   { name: '真龍降世', kind: 'dragonform', desc: '化身巨龍：8 秒內攻擊 +90%、移速 +40%，並噴出毀滅龍息。' },
    voidlord:    { name: '星辰墜落', kind: 'starfall',   desc: '八顆流星轟炸整個戰場，全場重創。' },
    sunpriest:   { name: '逆轉時軸', kind: 'temporal',   desc: '凍結全場 4 秒，並回復 35% 生命。' }
  };

  /* ---------------- 難度 ---------------- */
  var DIFFICULTY = [
    {
      id: 'easy', name: '簡單', sub: '輕鬆探索', color: '#5ad17a',
      hp: 0.78, dmg: 0.72, gems: 0.7, luck: 0.05, coins: 1.0,
      note: '敵人較弱 · 獎勵 70%'
    },
    {
      id: 'normal', name: '中等', sub: '標準體驗', color: '#f3c250',
      hp: 1.0, dmg: 1.0, gems: 1.0, luck: 0.0, coins: 1.0,
      note: '原汁原味 · 獎勵 100%'
    },
    {
      id: 'hard', name: '困難', sub: '地獄之路', color: '#e2574c',
      hp: 2.6, dmg: 1.6, gems: 1.8, luck: 0.18, coins: 1.35, poison: true, reflect: 0.15,
      note: '敵人更強 · 獎勵 180%'
    }
  ];

  /* ---------------- 章節結構：1 小關 = 10 層，1 章 = 3 小關 ---------------- */
  var FLOORS_PER_STAGE = 10;
  var STAGES_PER_CHAPTER = 3;

  /* ---------------- 場景主題 ---------------- */
  var THEMES = {
    dungeon:  { name: '腐朽墓穴', sky: ['#2a1a52', '#0d0918'], accent: '#a07bff', fog: 'rgba(120,90,220,.18)', floor: ['#1d1730', '#221a38'], wall: '#3a2f5e', wallTop: '#5f4f96', deco: 'vine', tile: 'brick', scene: 'crypt' },
    sky:      { name: '浮空群島', sky: ['#1d6a8a', '#07161f'], accent: '#4ff0c8', fog: 'rgba(80,220,220,.18)', floor: ['#1a3540', '#1f4050'], wall: '#2f5a6a', wallTop: '#5f9fb0', deco: 'water', tile: 'ripple', scene: 'clouds' },
    city:     { name: '霓虹都市', sky: ['#141a4a', '#05070f'], accent: '#4aa3ff', fog: 'rgba(70,140,255,.16)', floor: ['#141b30', '#19223c'], wall: '#26304e', wallTop: '#4a6aae', deco: 'window', tile: 'hex', scene: 'city' },
    heaven:   { name: '天界聖堂', sky: ['#8a6a20', '#1a1408'], accent: '#ffd166', fog: 'rgba(255,220,120,.20)', floor: ['#3a3018', '#443a1e'], wall: '#6a5a2a', wallTop: '#a89440', deco: 'ray', tile: 'plate', scene: 'cathedral' },
    lava:     { name: '熔岩深淵', sky: ['#7a2408', '#160503'], accent: '#ff7a3c', fog: 'rgba(255,110,60,.20)', floor: ['#331812', '#3a1d15'], wall: '#5a2a1e', wallTop: '#8a4a30', deco: 'lava', tile: 'brick', scene: 'lava' },
    void:     { name: '虛空邊界', sky: ['#4a1070', '#08030f'], accent: '#ff5ce0', fog: 'rgba(220,80,255,.18)', floor: ['#1e1230', '#241638'], wall: '#3a2058', wallTop: '#6a3fa0', deco: 'star', tile: 'rune', scene: 'space' },
    frost:    { name: '冰霜峽谷', sky: ['#1a4a6a', '#050e16'], accent: '#9be8ff', fog: 'rgba(140,220,255,.18)', floor: ['#1a2c3a', '#203442'], wall: '#2c4a5e', wallTop: '#4f7f96', deco: 'ice', tile: 'facet', scene: 'ice' },
    jungle:   { name: '荊棘叢林', sky: ['#1c4a26', '#06120a'], accent: '#6fe08a', fog: 'rgba(90,220,130,.16)', floor: ['#16301c', '#1a3821'], wall: '#2a4a2c', wallTop: '#4a7a4a', deco: 'vine', tile: 'brick', scene: 'forest' },
    sunken:   { name: '沉沒神殿', sky: ['#0e3a52', '#040c12'], accent: '#5fd8ff', fog: 'rgba(80,200,255,.18)', floor: ['#132a36', '#17303e'], wall: '#234454', wallTop: '#3f7386', deco: 'water', tile: 'ripple', scene: 'ocean' },
    desert:   { name: '白骨沙漠', sky: ['#7a5a1a', '#1a1206'], accent: '#ffd166', fog: 'rgba(255,210,120,.16)', floor: ['#3a2c12', '#443418'], wall: '#5e4a22', wallTop: '#8f7438', deco: 'sand', tile: 'wave', scene: 'desert' },
    factory:  { name: '齒輪工廠', sky: ['#2a2a3a', '#08080e'], accent: '#8cf0ff', fog: 'rgba(140,240,255,.14)', floor: ['#1e2230', '#242a3a'], wall: '#343a4e', wallTop: '#5a6480', deco: 'gear', tile: 'plate', scene: 'factory' },
    bloodmoon:{ name: '血月祭壇', sky: ['#5a0e1a', '#100306'], accent: '#ff3b5c', fog: 'rgba(255,60,90,.20)', floor: ['#2a0e14', '#321018'], wall: '#4a1a24', wallTop: '#7a2c3a', deco: 'blood', tile: 'brick', scene: 'temple' },
    starlane: { name: '星辰迴廊', sky: ['#1a104a', '#04030c'], accent: '#c9b6ff', fog: 'rgba(190,170,255,.16)', floor: ['#181430', '#1e1938'], wall: '#2e2652', wallTop: '#51448a', deco: 'star', tile: 'hex', scene: 'galaxy' },
    mirror:   { name: '鏡影迷宮', sky: ['#123a4a', '#04080c'], accent: '#a8fff0', fog: 'rgba(160,255,240,.14)', floor: ['#182a32', '#1d323c'], wall: '#2a4450', wallTop: '#4a7482', deco: 'mirror', tile: 'facet', scene: 'frozen' },
    throne:   { name: '終焉王座', sky: ['#3a0a3a', '#0a0208'], accent: '#ff3bd4', fog: 'rgba(255,60,210,.20)', floor: ['#26102a', '#2c1430'], wall: '#44204a', wallTop: '#6f3578', deco: 'rune', tile: 'rune', scene: 'throne' },
    hell:     { name: '地獄熔池', sky: ['#8a1a04', '#1a0402'], accent: '#ff4d1a', fog: 'rgba(255,70,20,.24)', floor: ['#3a1206', '#44180a'], wall: '#5e1e0c', wallTop: '#8f3a1c', deco: 'lava', tile: 'brick', scene: 'lava' },
    crystal:  { name: '水晶洞窟', sky: ['#2a1a5a', '#06040f'], accent: '#7fd8ff', fog: 'rgba(120,220,255,.18)', floor: ['#1c1a3a', '#221f44'], wall: '#302a58', wallTop: '#544a92', deco: 'ice', tile: 'facet', scene: 'ice' },
    blight:   { name: '腐化森林', sky: ['#2a3a10', '#080c04'], accent: '#b6e04a', fog: 'rgba(170,220,70,.16)', floor: ['#232c12', '#283418'], wall: '#3a4a1e', wallTop: '#5f7a30', deco: 'vine', tile: 'brick', scene: 'forest' },
    colosseum:{ name: '天空競技場', sky: ['#4a6a8a', '#0a1218'], accent: '#ffd166', fog: 'rgba(255,210,120,.16)', floor: ['#3a3430', '#443c36'], wall: '#5a524a', wallTop: '#8a7f72', deco: 'sand', tile: 'plate', scene: 'desert' },
    ocean:    { name: '深淵之海', sky: ['#06283a', '#01080c'], accent: '#3fd0ff', fog: 'rgba(60,210,255,.20)', floor: ['#0e2632', '#122c3a'], wall: '#1a3e4e', wallTop: '#2f6a82', deco: 'water', tile: 'ripple', scene: 'ocean' }
  };

  /* 15 章：每章主題、敵人組合、首領組合都不重複 */
  var CHAPTERS = [
    { theme: 'dungeon',  enemies: ['slime', 'bat', 'skel', 'boar'],      bosses: ['warden', 'darkknight', 'spider'] },
    { theme: 'sky',      enemies: ['wasp', 'drone', 'shaman', 'toad'],   bosses: ['hydra', 'frost', 'hydra'] },
    { theme: 'city',     enemies: ['drone', 'turret', 'saw', 'mech'],    bosses: ['titan', 'darkknight', 'titan'] },
    { theme: 'lava',     enemies: ['imp', 'magma', 'flamer', 'golem'],   bosses: ['behemoth', 'spider', 'behemoth'] },
    { theme: 'heaven',   enemies: ['wraith', 'voidmage', 'rift', 'abyss'],bosses: ['avatar', 'frost', 'avatar'] },
    { theme: 'void',     enemies: ['plague', 'wraith', 'voidmage', 'abyss'], bosses: ['darkknight', 'spider', 'avatar'] },
    { theme: 'frost',    enemies: ['wasp', 'shaman', 'golem', 'rift'],   bosses: ['frost', 'hydra', 'frost'] },
    { theme: 'jungle',   enemies: ['plague', 'toad', 'shaman', 'boar'],  bosses: ['hydra', 'warden', 'spider'] },
    { theme: 'sunken',   enemies: ['magma', 'turret', 'voidmage', 'abyss'], bosses: ['hydra', 'titan', 'avatar'] },
    { theme: 'desert',   enemies: ['skel', 'boar', 'flamer', 'saw'],     bosses: ['behemoth', 'warden', 'titan'] },
    { theme: 'factory',  enemies: ['mech', 'saw', 'drone', 'turret'],    bosses: ['titan', 'frost', 'darkknight'] },
    { theme: 'bloodmoon',enemies: ['bat', 'imp', 'flamer', 'wraith'],    bosses: ['spider', 'behemoth', 'darkknight'] },
    { theme: 'starlane', enemies: ['wraith', 'rift', 'voidmage', 'drone'], bosses: ['avatar', 'spider', 'titan'] },
    { theme: 'mirror',   enemies: ['turret', 'skel', 'golem', 'rift'],   bosses: ['frost', 'titan', 'avatar'] },
    { theme: 'throne',   enemies: ['abyss', 'golem', 'rift', 'mech'],    bosses: ['darkknight', 'avatar', 'behemoth'] },
    { theme: 'hell',     enemies: ['imp', 'magma', 'flamer', 'abyss'],   bosses: ['behemoth', 'darkknight', 'spider'] },
    { theme: 'crystal',  enemies: ['rift', 'turret', 'voidmage', 'golem'], bosses: ['frost', 'avatar', 'titan'] },
    { theme: 'blight',   enemies: ['plague', 'toad', 'shaman', 'wraith'], bosses: ['hydra', 'spider', 'warden'] },
    { theme: 'colosseum',enemies: ['mech', 'boar', 'saw', 'skel'],       bosses: ['titan', 'darkknight', 'behemoth'] },
    { theme: 'ocean',    enemies: ['toad', 'abyss', 'voidmage', 'drone'], bosses: ['avatar', 'hydra', 'frost'] }
  ];

  /* ---------------- 生成式敵人（每章每小關都不同） ---------------- */
  var NAME_PRE = ['腐化', '血染', '蒼白', '雷鳴', '霜語', '焰心', '鏽蝕', '幽影', '聖光', '劇毒', '鐵灰', '霓虹', '虛空', '熔核'];
  var NAME_SUF = ['', '·爪', '·牙', '·行者', '·守衛', '·祭司', '·幼體', '·巨影', '·亡骸'];
  /* 怪物行為：讓攻擊方式不再只有碰撞與直射 */
  var BEHAVIORS = ['chase', 'chase', 'lob', 'snipe', 'orbit', 'blink', 'split', 'web', 'summon'];

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hsl2hex(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r, g, b;
    h = ((h % 1) + 1) % 1;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3);
    }
    var to = function (v) { var n = Math.round(v * 255).toString(16); return n.length === 1 ? '0' + n : n; };
    return '#' + to(r) + to(g) + to(b);
  }
  function shiftHex(hex, dh, sm, lm) {
    var n = parseInt(hex.slice(1), 16);
    var hsl = rgb2hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
    return hsl2hex(hsl[0] + dh, hsl[1] * (sm == null ? 1 : sm), hsl[2] * (lm == null ? 1 : lm));
  }

  /* 產生某一章某一小關的專屬族群 */
  /* ---------------- 每章專屬怪物（15 章 × 4 種，互不重複） ---------------- */
  var CHAPTER_MONSTERS = [
    [['骸骨衛兵', 'skel', 'chase', 1.0], ['腐爛黏獸', 'slime', 'lob', 1.08], ['墓穴蝠', 'bat', 'orbit', 0.95], ['石棺守衛', 'golem', 'chase', 1.25]],
    [['風精', 'wasp', 'orbit', 0.9], ['浮空水母', 'drone', 'chase', 1.0], ['雷鳴鳥', 'toad', 'lob', 1.05], ['雲巨人', 'golem', 'chase', 1.3]],
    [['巡邏機械', 'mech', 'chase', 1.05], ['霓虹無人機', 'drone', 'orbit', 0.95], ['街頭暴徒', 'boar', 'charge', 1.0], ['電磁砲塔', 'turret', 'snipe', 1.2]],
    [['熔岩蟲', 'magma', 'chase', 1.05], ['火蜥蜴', 'flamer', 'lob', 1.0], ['火山岩魔', 'golem', 'chase', 1.3], ['炎爆蝠', 'imp', 'orbit', 0.95]],
    [['聖光信徒', 'wraith', 'chase', 1.0], ['天使雕像', 'golem', 'chase', 1.3], ['審判官', 'voidmage', 'snipe', 1.05], ['天馬', 'rift', 'charge', 1.1]],
    [['虛空蠕蟲', 'abyss', 'chase', 1.1], ['裂隙之眼', 'rift', 'snipe', 1.0], ['虛影術士', 'voidmage', 'summon', 1.0], ['空間撕裂者', 'plague', 'blink', 1.05]],
    [['霜狼', 'boar', 'charge', 1.05], ['冰晶守衛', 'golem', 'chase', 1.3], ['寒冰巫', 'shaman', 'lob', 1.0], ['雪怪', 'wraith', 'chase', 1.15]],
    [['荊棘獸', 'plague', 'chase', 1.05], ['毒花妖', 'toad', 'lob', 1.0], ['樹根巨魔', 'golem', 'chase', 1.35], ['叢林薩滿', 'shaman', 'summon', 1.0]],
    [['深海祭司', 'voidmage', 'snipe', 1.0], ['水母群', 'drone', 'orbit', 0.95], ['珊瑚衛士', 'turret', 'snipe', 1.2], ['溺亡者', 'abyss', 'chase', 1.1]],
    [['沙蠍', 'saw', 'charge', 1.0], ['乾屍', 'skel', 'chase', 1.0], ['骨骸法老', 'wraith', 'summon', 1.15], ['沙暴獸', 'golem', 'chase', 1.3]],
    [['蒸氣傀儡', 'mech', 'chase', 1.1], ['齒輪兵', 'saw', 'charge', 1.0], ['焊接蜘蛛', 'turret', 'snipe', 1.15], ['裝甲鑽頭', 'drone', 'blink', 1.0]],
    [['血教徒', 'voidmage', 'summon', 1.0], ['祭品殭屍', 'plague', 'chase', 1.05], ['血蝠', 'bat', 'orbit', 0.95], ['猩紅屠夫', 'boar', 'charge', 1.15]],
    [['星塵精靈', 'wasp', 'orbit', 0.9], ['流星獸', 'rift', 'charge', 1.1], ['星軌法師', 'shaman', 'lob', 1.0], ['隕石傀儡', 'golem', 'chase', 1.3]],
    [['鏡像騎士', 'skel', 'charge', 1.05], ['碎鏡幽靈', 'wraith', 'blink', 1.0], ['反光守衛', 'turret', 'snipe', 1.15], ['折射之眼', 'rift', 'orbit', 1.0]],
    [['王座守衛', 'mech', 'chase', 1.15], ['深淵執政官', 'voidmage', 'summon', 1.1], ['終焉之影', 'abyss', 'blink', 1.1], ['末日騎士', 'golem', 'chase', 1.35]]
  ];

  function makeSpecies(chapterIdx, stageIdx, count, seed) {
    var set = CHAPTER_MONSTERS[chapterIdx % CHAPTER_MONSTERS.length];
    var out = [];
    count = count || 4;
    for (var i = 0; i < count; i++) {
      var m = set[i % set.length];
      var baseId = m[1];
      var def = ENEMIES[baseId] || ENEMIES.slime;
      var h = Math.abs(Math.sin((seed || 1) * 12.9898 + (chapterIdx + 1) * 97.3 + (stageIdx + 1) * 31.7 + i * 13.37));
      /* 每章不同色相：同骨架也會看起來完全不同 */
      var dh = chapterIdx * 0.137 + (h * 0.3 - 0.15);
      out.push({
        uid: 'm' + chapterIdx + '_' + stageIdx + '_' + i,
        base: baseId,
        name: m[0],
        arch: def.arch,
        pal: {
          body: shiftHex(def.pal.body, dh, 1.08, 1.02),
          dark: shiftHex(def.pal.dark, dh * 0.8, 1.0, 0.95),
          accent: shiftHex(def.pal.accent, dh * 1.3, 1.12, 1.06),
          eye: shiftHex(def.pal.eye, dh * 0.5, 1.0, 1.0)
        },
        hpMul: (0.9 + h * 0.35) * (1 + stageIdx * 0.1),
        spdMul: 0.9 + h * 0.32,
        dmgMul: 0.9 + h * 0.3,
        trait: ['none', 'burn', 'poison', 'slow', 'none', 'shield'][Math.floor(h * 6) % 6],
        behavior: m[2],
        ranged: def.ranged,
        scale: m[3] * (1 + stageIdx * 0.03),
        elite: false
      });
    }
    return out;
  }

  /* ---------------- 付費武器（模擬解鎖） ---------------- */
  /* ---------------- 各稀有度專屬武器（每個等級 5 把） ---------------- */
  var TIER_WEAPONS = {
    /* 普通 tier 0 */
    slingshot:  { id: 'slingshot',  name: '石彈弓',   shape: 'bow',      tier: 0, dmg: 7,  rate: 0.34, cost: 0, spread: 0.10, pellets: 1, speed: 280, life: 0.8, r: 2.0, pierce: 0, knock: 20, color: '#c8b090', bounce: 1 },
    pipe:       { id: 'pipe',       name: '鐵管',     shape: 'hammer',   tier: 0, dmg: 11, rate: 0.50, cost: 0, melee: true, range: 34, arc: 1.6, knock: 90, color: '#c8d2e6' },
    handbow:    { id: 'handbow',    name: '短弩',     shape: 'crossbow', tier: 0, dmg: 12, rate: 0.46, cost: 1, spread: 0.04, pellets: 1, speed: 480, life: 0.8, r: 1.8, pierce: 1, knock: 30, color: '#e8dcc0' },
    torch:      { id: 'torch',      name: '火把',     shape: 'wand',     tier: 0, dmg: 6,  rate: 0.30, cost: 0, spread: 0.20, pellets: 1, speed: 190, life: 0.5, r: 3.0, pierce: 1, knock: 10, color: '#ff9a3c', burn: 1.8 },
    dagger:     { id: 'dagger',     name: '小刀',     shape: 'knife',    tier: 0, dmg: 7,  rate: 0.17, cost: 0, melee: true, range: 26, arc: 1.3, knock: 40, color: '#dfe7f7' },

    /* 精良 tier 1 */
    hunter:     { id: 'hunter',     name: '獵槍',     shape: 'rifle',    tier: 1, dmg: 17, rate: 0.62, cost: 2, spread: 0.02, pellets: 1, speed: 620, life: 1.0, r: 1.8, pierce: 1, knock: 50, color: '#e8dcc0', long: true },
    burstpistol:{ id: 'burstpistol',name: '連發手槍', shape: 'pistol',   tier: 1, dmg: 8,  rate: 0.50, cost: 1, spread: 0.06, pellets: 1, speed: 330, life: 0.8, r: 2.0, pierce: 0, knock: 25, color: '#ffe0a0', burst: 3 },
    nailgun:    { id: 'nailgun',    name: '釘槍',     shape: 'smg',      tier: 1, dmg: 6,  rate: 0.07, cost: 1, spread: 0.10, pellets: 1, speed: 520, life: 0.6, r: 1.5, pierce: 1, knock: 12, color: '#cfd8ec' },
    frostpick:  { id: 'frostpick',  name: '冰鑿',     shape: 'spear',    tier: 1, dmg: 10, rate: 0.35, cost: 2, spread: 0.05, pellets: 1, speed: 380, life: 0.9, r: 2.2, pierce: 2, knock: 30, color: '#a8e8ff', slow: 1.4 },
    boomerang:  { id: 'boomerang',  name: '迴力鏢',   shape: 'chakram',  tier: 1, dmg: 11, rate: 0.50, cost: 1, spread: 0.02, pellets: 1, speed: 380, life: 1.5, r: 3.6, pierce: 9, knock: 20, color: '#ffd166', boomerang: true },

    /* 稀有 tier 2 */
    arcgun:     { id: 'arcgun',     name: '電弧槍',   shape: 'rifle',    tier: 2, dmg: 14, rate: 0.38, cost: 4, spread: 0.03, pellets: 1, speed: 520, life: 0.8, r: 2.2, pierce: 0, knock: 30, color: '#8cf0ff', chain: 2 },
    dartgun:    { id: 'dartgun',    name: '毒鏢槍',   shape: 'smg',      tier: 2, dmg: 9,  rate: 0.18, cost: 2, spread: 0.07, pellets: 1, speed: 480, life: 1.0, r: 1.8, pierce: 1, knock: 15, color: '#a8e05a', poison: 3.0 },
    gravgun:    { id: 'gravgun',    name: '重力槍',   shape: 'orb',      tier: 2, dmg: 18, rate: 0.70, cost: 5, spread: 0.03, pellets: 1, speed: 300, life: 1.0, r: 3.6, pierce: 0, knock: 220, color: '#8e6bf2', splash: 34 },
    trident:    { id: 'trident',    name: '三叉戟',   shape: 'spear',    tier: 2, dmg: 24, rate: 0.55, cost: 0, melee: true, range: 54, arc: 1.0, knock: 150, color: '#bff3ff', pierce: 2 },
    blunderbuss:{ id: 'blunderbuss',name: '火銃',     shape: 'shotgun',  tier: 2, dmg: 7,  rate: 0.80, cost: 4, spread: 0.42, pellets: 5, speed: 300, life: 0.4, r: 2.4, pierce: 0, knock: 110, color: '#ffb347' },

    /* 史詩 tier 3 */
    phaseblade: { id: 'phaseblade', name: '相位刃',   shape: 'blade',    tier: 3, dmg: 22, rate: 0.24, cost: 1, melee: true, range: 46, arc: 1.9, knock: 100, color: '#c9a6ff' },
    plasmacannon:{ id: 'plasmacannon', name: '等離子炮', shape: 'cannon', tier: 3, dmg: 26, rate: 0.85, cost: 6, spread: 0.04, pellets: 1, speed: 260, life: 1.2, r: 4.2, pierce: 0, knock: 90, color: '#b9a8ff', splash: 42 },
    swarmer:    { id: 'swarmer',    name: '蜂群發射器', shape: 'launcher', tier: 3, dmg: 9, rate: 0.55, cost: 5, spread: 0.18, pellets: 3, speed: 240, life: 1.6, r: 2.4, pierce: 0, knock: 25, color: '#ffe066', homing: 3.2 },
    thunderhammer:{ id: 'thunderhammer', name: '雷鳴錘', shape: 'hammer', tier: 3, dmg: 32, rate: 0.75, cost: 0, melee: true, range: 48, arc: 2.4, knock: 260, color: '#ffe066', splash: 30 },
    stardustbow:{ id: 'stardustbow', name: '星塵弓',   shape: 'bow',      tier: 3, dmg: 16, rate: 0.55, cost: 3, spread: 0.02, pellets: 1, speed: 620, life: 1.2, r: 2.4, pierce: 3, knock: 40, color: '#c9b6ff', splash: 18, long: true },

    /* 傳說 tier 4（648 魔晶） */
    longnight:  { id: 'longnight',  name: '永夜',     shape: 'rifle',    tier: 4, dmg: 58, rate: 0.95, cost: 8, spread: 0, pellets: 1, speed: 1, life: 1, r: 2, pierce: 0, knock: 40, color: '#8cf0ff', beam: true },
    reddragon:  { id: 'reddragon',  name: '赤龍',     shape: 'cannon',   tier: 4, dmg: 34, rate: 0.9, cost: 7, spread: 0.05, pellets: 1, speed: 240, life: 1.3, r: 4.4, pierce: 1, knock: 90, color: '#ff6b3c', splash: 56, burn: 3.2 },
    judgment:   { id: 'judgment',   name: '天譴',     shape: 'scepter',  tier: 4, dmg: 24, rate: 0.55, cost: 5, spread: 0.02, pellets: 1, speed: 460, life: 1.0, r: 2.6, pierce: 1, knock: 40, color: '#ffe6a1', chain: 4 },
    voidfang:   { id: 'voidfang',   name: '虛空之牙', shape: 'wand',     tier: 4, dmg: 20, rate: 0.32, cost: 3, spread: 0.05, pellets: 1, speed: 300, life: 1.4, r: 2.8, pierce: 2, knock: 20, color: '#b07cf0', homing: 3.6 },
    dawnbreaker:{ id: 'dawnbreaker',name: '破曉',     shape: 'sword',    tier: 4, dmg: 46, rate: 0.48, cost: 0, melee: true, range: 58, arc: 2.6, knock: 240, color: '#fff3cf', splash: 44 },

    /* 神話 tier 5（1296 魔晶） */
    genesis:    { id: 'genesis',    name: '創世',     shape: 'orb',      tier: 5, dmg: 95, rate: 0.80, cost: 8, spread: 0.02, pellets: 1, speed: 280, life: 1.7, r: 5.4, pierce: 0, knock: 160, color: '#ff3bd4', splash: 95, heal: 3 },
    apocalypse: { id: 'apocalypse', name: '終焉',     shape: 'launcher', tier: 5, dmg: 62, rate: 0.80, cost: 8, spread: 0.16, pellets: 4, speed: 240, life: 1.4, r: 4.6, pierce: 0, knock: 140, color: '#ff7a3c', splash: 66, burn: 3.4 },
    eternalstar:{ id: 'eternalstar',name: '永恆之星', shape: 'bow',      tier: 5, dmg: 52, rate: 0.38, cost: 4, spread: 0.04, pellets: 1, speed: 500, life: 1.7, r: 3.2, pierce: 3, knock: 50, color: '#8cf0ff', homing: 6, chain: 3 },
    abysseye:   { id: 'abysseye',   name: '深淵之眼', shape: 'staff',    tier: 5, dmg: 72, rate: 0.50, cost: 6, spread: 0.02, pellets: 1, speed: 760, life: 1.3, r: 2.6, pierce: 8, knock: 40, color: '#ff5ce0', burn: 3 },
    primordial: { id: 'primordial', name: '太初',     shape: 'chaos',    tier: 5, dmg: 58, rate: 0.50, cost: 7, spread: 0.12, pellets: 3, speed: 400, life: 1.3, r: 4.4, pierce: 2, knock: 140, color: '#ffe066', splash: 60, burst: 2 },

    /* ---- 追加：5 把傳說 + 5 把神話（不同類型／攻擊／音效） ---- */
    stormcage:   { id: 'stormcage',   name: '雷獄',     shape: 'staff',    tier: 4, sound: 'thunder', dmg: 22, rate: 0.38, cost: 5, spread: 0.03, pellets: 1, speed: 430, life: 0.9, r: 2.6, pierce: 1, knock: 40, color: '#8cf0ff', chain: 3 },
    frostfang:   { id: 'frostfang',   name: '霜牙',     shape: 'blade',    tier: 4, sound: 'frost',   dmg: 44, rate: 0.50, cost: 0, melee: true, range: 52, arc: 1.7, knock: 160, color: '#a8e8ff', slow: 3 },
    earthsplit:  { id: 'earthsplit',  name: '地裂',     shape: 'hammer',   tier: 4, sound: 'quake',   dmg: 58, rate: 0.95, cost: 0, melee: true, range: 50, arc: 2.3, knock: 300, color: '#c8a06a', splash: 55 },
    meteorbolt:  { id: 'meteorbolt',  name: '流星弩',   shape: 'crossbow', tier: 4, sound: 'meteor',  dmg: 28, rate: 0.60, cost: 3, spread: 0.03, pellets: 1, speed: 640, life: 1.1, r: 2.4, pierce: 3, knock: 60, color: '#ff9a5c' },
    echobell:    { id: 'echobell',    name: '迴響鐘',   shape: 'orb',      tier: 4, sound: 'bell',    dmg: 24, rate: 0.55, cost: 4, spread: 0.05, pellets: 1, speed: 300, life: 1.5, r: 3.2, pierce: 1, knock: 30, color: '#ffe6a1', homing: 3, splash: 40 },

    voidmaw:     { id: 'voidmaw',     name: '虛空吞噬', shape: 'orb',      tier: 5, sound: 'void',    dmg: 66, rate: 0.55, cost: 6, spread: 0.04, pellets: 1, speed: 280, life: 1.7, r: 4.2, pierce: 2, knock: 80, color: '#b07cf0', homing: 5, splash: 72 },
    thunderjudge:{ id: 'thunderjudge',name: '雷霆審判', shape: 'scepter',  tier: 5, sound: 'thunder', dmg: 48, rate: 0.35, cost: 6, spread: 0.02, pellets: 1, speed: 520, life: 1.0, r: 2.6, pierce: 2, knock: 40, color: '#ffe066', chain: 5 },
    eternalfrost:{ id: 'eternalfrost',name: '永凍之刃', shape: 'blade',    tier: 5, sound: 'frost',   dmg: 74, rate: 0.42, cost: 0, melee: true, range: 64, arc: 2.0, knock: 220, color: '#bfefff', slow: 4, splash: 30 },
    starburst:   { id: 'starburst',   name: '星辰爆發', shape: 'launcher', tier: 5, sound: 'star',    dmg: 32, rate: 0.70, cost: 7, spread: 0.22, pellets: 5, speed: 320, life: 0.95, r: 3.0, pierce: 0, knock: 60, color: '#ffd166', splash: 46 },
    abyssbreath: { id: 'abyssbreath', name: '深淵之息', shape: 'staff',    tier: 5, sound: 'void',    dmg: 40, rate: 0.45, cost: 5, spread: 0.03, pellets: 1, speed: 560, life: 1.15, r: 2.8, pierce: 6, knock: 30, color: '#a8e05a', poison: 4 }
  };
  Object.keys(TIER_WEAPONS).forEach(function (k) { WEAPONS[k] = TIER_WEAPONS[k]; });
  /* 重新計算可掉落清單（含各稀有度專屬武器） */
  DROPPABLE = Object.keys(WEAPONS).filter(function (k) { return !WEAPONS[k].premium; });

  var MYTHIC_PRICE_OLD = 1296;
  var LEGEND_PRICE_OLD = 648;

  function weaponsOfTier(t) {
    var out = [];
    for (var k in WEAPONS) if (WEAPONS[k].tier === t) out.push(k);
    return out;
  }

  var PREMIUM_WEAPON = {
    id: 'chaos', name: '炸天', shape: 'chaos', price: '$8',
    dmg: 46, rate: 0.42, cost: 6, spread: 0.09, pellets: 2, speed: 460, life: 1.15,
    r: 4.4, pierce: 2, knock: 130, color: '#ff5da8', splash: 60, burn: 2.4,
    premium: true,
    desc: '深淵鍛造的禁忌兵器。雙管爆裂彈、超大範圍爆炸，傷害約為同級武器的 1.5 倍。'
  };

  var PREMIUM_WEAPONS = [
    { id: 'chaos', price: '$8', tag: '爆裂', desc: '雙管爆裂彈，大範圍爆炸，傷害 ×1.5。' },
    { id: 'frostcannon', price: '$6', tag: '冰凍', desc: '五連冰霰，命中減速 2.6 秒。' },
    { id: 'thunder', price: '$10', tag: '連鎖', desc: '雷電貫穿，命中後連鎖 3 個目標。' },
    { id: 'meteor', price: '$12', tag: '追蹤', desc: '追蹤隕石，爆炸範圍極大。' }
  ];

  var MYTHIC_PRICE = '$1296';
  var LEGEND_PRICE = '$648';

  /* 究極武器：解鎖全部傳說與神話武器後獲得 */
  var ULTIMATE_WEAPON = 'nova';

  /* 可解鎖的傳說 / 神話裝備（各 5 件） */
  var LEGEND_EQUIP = [
    { id: 'e_scale', name: '龍鱗護甲', slot: 'armor', icon: 'armor', rarity: 4, special: 'aegis', price: '$288', atkStyle: { id: 'aegis',   color: '#9fe9ff', pierce: 1 },
      stats: [{ key: 'hp', value: 36 }, { key: 'armor', value: 0.06 }] },
    { id: 'e_star', name: '星辰護符', slot: 'amulet', icon: 'amulet', rarity: 4, special: 'starburst', price: '$288', atkStyle: { id: 'star',    color: '#ffe6a1', splash: 22 },
      stats: [{ key: 'atk', value: 0.14 }, { key: 'crit', value: 0.06 }] },
    { id: 'e_blood', name: '血月戒指', slot: 'ring', icon: 'ring', rarity: 4, special: 'bloodpact', price: '$288', atkStyle: { id: 'blood',   color: '#ff4d6d', heal: 0.5 },
      stats: [{ key: 'lifesteal', value: 0.06 }, { key: 'coin', value: 0.12 }] },
    { id: 'e_abyss', name: '深淵符印', slot: 'sigil', icon: 'sigil', rarity: 4, special: 'voidwalk', price: '$288', atkStyle: { id: 'void',    color: '#b07cf0', homing: 2.5 },
      stats: [{ key: 'regen', value: 0.2 }, { key: 'hp', value: 20 }] },
    { id: 'e_gale', name: '疾風之靴', slot: 'armor', icon: 'armor', rarity: 4, special: 'gale', price: '$288', atkStyle: { id: 'gale',    color: '#7df0b0', pierce: 0 },
      stats: [{ key: 'spd', value: 0.12 }, { key: 'crit', value: 0.04 }] }
  ];
  var MYTHIC_EQUIP = [
    { id: 'e_genesis', name: '創世之鎧', slot: 'armor', icon: 'armor', rarity: 5, special: 'genesis', price: '$648', atkStyle: { id: 'genesis', color: '#ff5ce0', splash: 34 },
      stats: [{ key: 'hp', value: 70 }, { key: 'armor', value: 0.12 }] },
    { id: 'e_eternal', name: '永恆之心', slot: 'amulet', icon: 'amulet', rarity: 5, special: 'eternal', price: '$648', atkStyle: { id: 'eternal', color: '#c9b6ff', heal: 0.9 },
      stats: [{ key: 'atk', value: 0.25 }, { key: 'crit', value: 0.1 }] },
    { id: 'e_deepring', name: '深淵之環', slot: 'ring', icon: 'ring', rarity: 5, special: 'abyssal', price: '$648', atkStyle: { id: 'abyssal', color: '#a03cff', homing: 3.5 },
      stats: [{ key: 'lifesteal', value: 0.1 }, { key: 'atk', value: 0.15 }] },
    { id: 'e_primord', name: '太初符印', slot: 'sigil', icon: 'sigil', rarity: 5, special: 'primordial', price: '$648', atkStyle: { id: 'primord', color: '#ffe066', pierce: 3 },
      stats: [{ key: 'regen', value: 0.35 }, { key: 'hp', value: 44 }] },
    { id: 'e_fate', name: '天命之靴', slot: 'armor', icon: 'armor', rarity: 5, special: 'fate', price: '$648', atkStyle: { id: 'fate',    color: '#ffd166', splash: 16, homing: 1.5 },
      stats: [{ key: 'spd', value: 0.18 }, { key: 'luck', value: 0.15 }] }
  ];

  /* ---------------- 天賦（傳送門後三選一） ---------------- */
  var TALENTS = [
    { id: 'split', name: '分裂彈', desc: '子彈命中後分裂成 2 發小彈（45% 傷害）', color: '#8cf0ff' },
    { id: 'burn', name: '燃燒彈', desc: '所有子彈附加燃燒，持續 3 秒', color: '#ff9a3c' },
    { id: 'pierce', name: '穿透', desc: '子彈額外穿透 +2', color: '#dfe7f7' },
    { id: 'explode', name: '爆裂彈', desc: '子彈命中時產生小型爆炸', color: '#ffb347' },
    { id: 'crit', name: '致命', desc: '暴擊率 +18%', color: '#f3c250' },
    { id: 'lifesteal', name: '吸血', desc: '造成傷害的 6% 轉為生命', color: '#e2574c' },
    { id: 'homing', name: '追蹤', desc: '子彈會追蹤敵人', color: '#b07cf0' },
    { id: 'chain', name: '連鎖', desc: '命中時電弧連鎖 2 個目標', color: '#8be08b' },
    { id: 'rate', name: '疾射', desc: '射速 +20%', color: '#57e0a8' },
    { id: 'energy', name: '節能', desc: '能量消耗 -1', color: '#4aa3f0' },
    { id: 'thorns', name: '荊棘', desc: '受傷時對周圍造成傷害', color: '#c7f08a' },
    { id: 'magnet', name: '磁吸', desc: '掉落物自動飛向你', color: '#ffd166' },
    { id: 'multishot', name: '多重射擊', desc: '每次射擊多 1 發子彈', color: '#8cf0ff' },
    { id: 'bounce', name: '彈跳', desc: '子彈額外彈跳 +1 次', color: '#7fe0c0' },
    { id: 'frostbite', name: '霜咬', desc: '子彈命中減速 1.5 秒', color: '#a8e8ff' },
    { id: 'venom', name: '劇毒', desc: '子彈附加中毒 2 秒', color: '#a8e05a' },
    { id: 'headshot', name: '爆頭', desc: '暴擊傷害提升 30%', color: '#ff7a7a' },
    { id: 'swift', name: '疾風', desc: '移動速度 +12%', color: '#57e0a8' },
    { id: 'barrier', name: '護盾', desc: '每層開始獲得 1 層護盾', color: '#9ad0ff' },
    { id: 'bloodlust', name: '嗜血', desc: '擊殺恢復 3 點生命', color: '#e2574c' },
    { id: 'chainblast', name: '連環爆', desc: '敵人死亡時爆炸', color: '#ffb347' },
    { id: 'rage', name: '狂怒', desc: '怒氣持續時間 +2 秒', color: '#ff6b3c' },
    { id: 'focus', name: '專注', desc: '大招充能速度 +25%', color: '#c9b6ff' },
    { id: 'greed', name: '貪婪', desc: '金幣獲得 +25%', color: '#ffd166' },
    { id: 'fortune', name: '幸運', desc: '稀有度 +8%', color: '#f3c250' },
    { id: 'vitality', name: '生命', desc: '最大生命 +20%', color: '#e2574c' },
    { id: 'resilience', name: '韌性', desc: '受到傷害 -10%', color: '#cfd8ec' },
    { id: 'reflective', name: '反射', desc: '受傷時反彈傷害給周圍', color: '#bff3ff' },
    { id: 'executioner', name: '處刑', desc: '所有傷害 +12%', color: '#ff5d4a' },
    { id: 'combo', name: '連擊', desc: '連續擊殺疊加傷害（最多 5 層）', color: '#ff9a3c' },
    { id: 'slowaura', name: '寒域', desc: '周圍敵人持續減速', color: '#8cf0ff' },
    { id: 'vampire', name: '吸血鬼', desc: '吸血 +3%', color: '#c2185b' },
    { id: 'fusion', name: '元素融合', desc: '天賦與武器融合：武器附帶你擁有的元素（燃燒／連鎖／冰緩／劇毒）', color: '#ff8ac8' },
    { id: 'ruin', name: '焦土', desc: '擊殺與爆炸把地面變成廢墟，站在廢墟上的敵人受到額外 25% 傷害', color: '#a08060' },
    { id: 'echo', name: '回聲震盪', desc: '使用技能時額外引發一次回聲爆炸', color: '#8cf0ff' },
    { id: 'overdrive', name: '超載', desc: '能量高於 70% 時射速 +30%、傷害 +10%', color: '#57e0a8' }
  ];

  /* 每名角色的專屬天賦（依角色定位給不同機制） */
  var HERO_TALENTS = {
    knight:      { name: '誓約壁壘', desc: '每次擊殺獲得 1.5 秒護盾', color: '#8cf0ff' },
    mage:        { name: '奧術迴響', desc: '技能冷卻 -25%', color: '#b07cf0' },
    ranger:      { name: '鷹眼', desc: '暴擊率 +10%、幸運 +10%', color: '#8be08b' },
    samurai:     { name: '居合', desc: '暴擊傷害 +25%、移動速度 +8%', color: '#dfe7f7' },
    paladin:     { name: '聖癒', desc: '生命回復 +40%，受到傷害 -8%', color: '#ffe6a1' },
    assassin:    { name: '暗影', desc: '擊殺後 2 秒內移速 +25%、暴擊 +15%', color: '#b07cf0' },
    berserker:   { name: '狂血', desc: '生命越低傷害越高（最多 +35%）', color: '#ff5d4a' },
    engineer:    { name: '超頻', desc: '大招充能速度 +35%', color: '#8cf0ff' },
    necromancer: { name: '亡靈契約', desc: '擊殺時額外回復 5 點生命', color: '#a8e05a' },
    monk:        { name: '氣', desc: '衝刺冷卻 -40%', color: '#ffd166' },
    gunslinger:  { name: '快槍', desc: '能量回復 +35%', color: '#ffb347' },
    tech:        { name: '過載', desc: '能量上限 +25%', color: '#8cf0ff' },
    astromancer: { name: '星軌', desc: '每 5 秒自動降下一顆小流星', color: '#c9b6ff' },
    chronomancer:{ name: '時間殘影', desc: '受傷時 20% 機率完全閃避', color: '#a8fff0' },
    dragonkin:   { name: '龍鱗', desc: '受到傷害 -12%，反彈傷害', color: '#ffb347' },
    voidlord:    { name: '深淵凝視', desc: '所有傷害 +18%，暴擊傷害 +25%', color: '#c9a6ff' },
    sunpriest:   { name: '黎明祝福', desc: '生命回復 +60%，受到傷害 -10%', color: '#fff3c4' },
    default:     { name: '天賦', desc: '依角色定位強化', color: '#cfc6ee' }
  };

  /* 鑰匙分級：不同寶箱用不同鑰匙，掉落率也不同 */
  var KEY_TYPES = [
    { id: 'bronze', name: '銅鑰匙', color: '#c8a06a', drop: 0.10 },
    { id: 'silver', name: '銀鑰匙', color: '#cfd8ec', drop: 0.035 },
    { id: 'gold',   name: '金鑰匙', color: '#f3c250', drop: 0.012 },
    { id: 'mythic', name: '神話鑰匙', color: '#ff3bd4', drop: 0.0025 }
  ];

  /* ---------------- 章節永久強化（每章解鎖一種，可疊加） ---------------- */
  var CHAPTER_UPGRADES = [
    { id: 'ch1', chapter: 1, name: '墓穴韌性', desc: '生命 +4%', stat: 'hpPct', v: 0.04, max: 5 },
    { id: 'ch2', chapter: 2, name: '群島輕身', desc: '移速 +3%', stat: 'spdPct', v: 0.03, max: 5 },
    { id: 'ch3', chapter: 3, name: '霓虹銳眼', desc: '暴擊 +2%', stat: 'critPct', v: 0.02, max: 5 },
    { id: 'ch4', chapter: 4, name: '熔岩怒火', desc: '攻擊 +3%', stat: 'atkPct', v: 0.03, max: 5 },
    { id: 'ch5', chapter: 5, name: '聖堂庇護', desc: '減傷 +2%', stat: 'armorPct', v: 0.02, max: 5 },
    { id: 'ch6', chapter: 6, name: '虛空幸運', desc: '幸運 +4%', stat: 'luckPct', v: 0.04, max: 5 },
    { id: 'ch7', chapter: 7, name: '冰霜抗性', desc: '生命 +4%', stat: 'hpPct', v: 0.04, max: 5 },
    { id: 'ch8', chapter: 8, name: '荊棘反噬', desc: '減傷 +2%', stat: 'armorPct', v: 0.02, max: 5 },
    { id: 'ch9', chapter: 9, name: '深海肺息', desc: '能量 +6%', stat: 'enPct', v: 0.06, max: 5 },
    { id: 'ch10', chapter: 10, name: '沙漠商路', desc: '金幣 +5%', stat: 'coinPct', v: 0.05, max: 5 },
    { id: 'ch11', chapter: 11, name: '齒輪傳動', desc: '射速 +3%', stat: 'ratePct', v: 0.03, max: 5 },
    { id: 'ch12', chapter: 12, name: '血月嗜血', desc: '吸血 +1.5%', stat: 'lsPct', v: 0.015, max: 5 },
    { id: 'ch13', chapter: 13, name: '星辰共鳴', desc: '攻擊 +3%', stat: 'atkPct', v: 0.03, max: 5 },
    { id: 'ch14', chapter: 14, name: '鏡影步法', desc: '移速 +3%', stat: 'spdPct', v: 0.03, max: 5 },
    { id: 'ch15', chapter: 15, name: '王座威壓', desc: '暴擊 +2%', stat: 'critPct', v: 0.02, max: 5 },
    { id: 'ch16', chapter: 16, name: '地獄火抗', desc: '減傷 +2%', stat: 'armorPct', v: 0.02, max: 5 },
    { id: 'ch17', chapter: 17, name: '水晶折射', desc: '幸運 +4%', stat: 'luckPct', v: 0.04, max: 5 },
    { id: 'ch18', chapter: 18, name: '腐化再生', desc: '生命回復 +8%', stat: 'regenPct', v: 0.08, max: 5 },
    { id: 'ch19', chapter: 19, name: '競技榮耀', desc: '攻擊 +3%', stat: 'atkPct', v: 0.03, max: 5 },
    { id: 'ch20', chapter: 20, name: '深淵主宰', desc: '生命 +4%', stat: 'hpPct', v: 0.04, max: 5 }
  ];

  /* ---------------- 局外裝備（鑰匙開箱獲得） ---------------- */
  var META_STAT_POOL = ['atk', 'spd', 'hp', 'crit', 'luck', 'regen', 'coin', 'lifesteal', 'armor'];
  var META_SLOTS = 4;

  /* 每個大招的冷卻時間（依技能強弱界定） */
  var ULT_CD = {
    knight: 14, mage: 12, ranger: 13, paladin: 15, assassin: 12, engineer: 13,
    monk: 14, necromancer: 13, berserker: 15, alchemist: 13, druid: 14,
    samurai: 12, gunslinger: 13, astromancer: 16, chronomancer: 15,
    dragonkin: 16, voidlord: 16, sunpriest: 15
  };

  /* 首領輪替順序：新舊交替，並保證「同一章節不與前三章重複」 */
  var BOSS_ORDER = [
    'warden', 'ironjaw', 'hydra',
    'hornfang', 'titan', 'hunter0',
    'behemoth', 'gazer', 'avatar',
    'ouroboros', 'spider', 'magma2',
    'frost', 'wraithking', 'darkknight',
    'shellback', 'mirrorknight', 'clockwork'
  ];

  return {
    FLOORS_PER_STAGE: FLOORS_PER_STAGE,
    STAGES_PER_CHAPTER: STAGES_PER_CHAPTER,
    THEMES: THEMES,
    CHAPTERS: CHAPTERS,
    PREMIUM_WEAPON: PREMIUM_WEAPON,
    PREMIUM_WEAPONS: PREMIUM_WEAPONS,
    MYTHIC_PRICE: MYTHIC_PRICE,
    LEGEND_PRICE: LEGEND_PRICE,
    ULTIMATE_WEAPON: ULTIMATE_WEAPON,
    LEGEND_EQUIP: LEGEND_EQUIP,
    MYTHIC_EQUIP: MYTHIC_EQUIP,
    TALENTS: TALENTS,
    HERO_TALENTS: HERO_TALENTS,
    KEY_TYPES: KEY_TYPES,
    weaponsOfTier: weaponsOfTier,
    TIER_WEAPONS: TIER_WEAPONS,
    META_SLOTS: META_SLOTS,
    makeSpecies: makeSpecies,
    CHAPTER_MONSTERS: CHAPTER_MONSTERS,
    shiftHex: shiftHex,
    RARITY: RARITY,
    HEROES: HEROES,
    ULTIMATES: ULTIMATES,
    ULT_CD: ULT_CD,
    BOSS_ORDER: BOSS_ORDER,
    DIFFICULTY: DIFFICULTY,
    WEAPONS: WEAPONS,
    DROPPABLE: DROPPABLE,
    TIERS: TIERS,
    ENEMIES: ENEMIES,
    BOSSES: BOSSES,
    STATS: STATS,
    EQUIP_SLOTS: EQUIP_SLOTS,
    EQUIP_PREFIX: EQUIP_PREFIX,
    EQUIP_SPECIALS: EQUIP_SPECIALS,
    CHAPTER_UPGRADES: CHAPTER_UPGRADES,
    CHESTS: CHESTS,
    HERO_ROSTER: ['knight','mage','ranger','paladin','assassin','engineer','monk','necromancer','berserker','alchemist','druid'],
    HERO_IDS: ['knight','paladin','assassin','engineer','monk','necromancer','berserker','alchemist','druid']
  };
})();
