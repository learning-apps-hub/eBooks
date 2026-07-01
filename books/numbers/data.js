// ─── Number data ──────────────────────────────────────────────────────────────

const EN_ONES = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
const EN_TEENS = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const EN_TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function englishNumber(n) {
  if (n === 100) return 'One Hundred';
  if (n < 10) return EN_ONES[n];
  if (n < 20) return EN_TEENS[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return o === 0 ? EN_TENS[t] : EN_TENS[t] + '-' + EN_ONES[o].toLowerCase();
}

const ZH_DIGITS = ['零','一','二','三','四','五','六','七','八','九'];
const ZH_PINYIN = ['líng','yī','èr','sān','sì','wǔ','liù','qī','bā','jiǔ'];

function chineseNumber(n) {
  if (n === 0)   return { word: '零',  pinyin: 'líng' };
  if (n === 100) return { word: '一百', pinyin: 'yī bǎi' };
  if (n < 10)    return { word: ZH_DIGITS[n], pinyin: ZH_PINYIN[n] };
  if (n === 10)  return { word: '十',  pinyin: 'shí' };
  if (n < 20) {
    return { word: `十${ZH_DIGITS[n-10]}`, pinyin: `shí ${ZH_PINYIN[n-10]}` };
  }
  const t = Math.floor(n / 10), o = n % 10;
  const base = `${ZH_DIGITS[t]}十`;
  const basePy = `${ZH_PINYIN[t]} shí`;
  if (o === 0) return { word: base, pinyin: basePy };
  return { word: base + ZH_DIGITS[o], pinyin: `${basePy} ${ZH_PINYIN[o]}` };
}

const PL_ONES = ['Zero','Jeden','Dwa','Trzy','Cztery','Pięć','Sześć','Siedem','Osiem','Dziewięć'];
const PL_TEENS = ['Dziesięć','Jedenaście','Dwanaście','Trzynaście','Czternaście','Piętnaście','Szesnaście','Siedemnaście','Osiemnaście','Dziewiętnaście'];
const PL_TENS = ['','','Dwadzieścia','Trzydzieści','Czterdzieści','Pięćdziesiąt','Sześćdziesiąt','Siedemdziesiąt','Osiemdziesiąt','Dziewięćdziesiąt'];

function polishNumber(n) {
  if (n === 100) return 'Sto';
  if (n < 10)  return PL_ONES[n];
  if (n < 20)  return PL_TEENS[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return o === 0 ? PL_TENS[t] : `${PL_TENS[t]} ${PL_ONES[o].toLowerCase()}`;
}

// Emoji illustrations per number (0-20 have unique ones; 21+ use dot grid)
const NUMBER_EMOJI = [
  '',          // 0 - empty
  '🦆',       // 1
  '🌸',       // 2
  '⭐',       // 3
  '🦋',       // 4
  '🍎',       // 5
  '🐟',       // 6
  '🌈',       // 7
  '🎈',       // 8
  '❤️',       // 9
  '🌟',       // 10
  '🍌',       // 11
  '🦄',       // 12
  '🐝',       // 13
  '🌺',       // 14
  '🐠',       // 15
  '🍓',       // 16
  '🌙',       // 17
  '🦊',       // 18
  '🍦',       // 19
  '🦁',       // 20
];

function getNumberData(n) {
  const zh = chineseNumber(n);
  return {
    numeral: String(n),
    en: englishNumber(n),
    zh: zh.word,
    zhPinyin: zh.pinyin,
    pl: polishNumber(n),
    emoji: NUMBER_EMOJI[n] || '🔵',
  };
}

// Pre-build all 101 number entries
const NUMBERS = Array.from({ length: 101 }, (_, i) => getNumberData(i));

// ─── Digit stroke paths (canvas coords: 0–200 x, 0–260 y) ────────────────────
// Each digit = array of strokes; each stroke = array of [x,y] waypoints

const DIGIT_STROKES = {
  '0': [[
    [100,12],[155,12],[188,50],[188,130],[188,200],[155,248],
    [100,260],[45,248],[12,200],[12,130],[12,50],[45,12],[100,12]
  ]],
  '1': [
    [[62,42],[100,18]],
    [[100,18],[100,258]]
  ],
  '2': [[
    [32,72],[45,38],[80,14],[130,14],[165,42],[165,85],
    [145,118],[108,148],[68,182],[28,222],[14,252],[188,252]
  ]],
  '3': [
    [[42,36],[88,14],[140,14],[172,44],[172,88],[140,122],[100,132]],
    [[100,132],[148,138],[178,170],[178,216],[148,248],[100,258],[54,250],[28,235]]
  ],
  '4': [
    [[135,14],[18,178]],
    [[18,178],[178,178]],
    [[135,14],[135,258]]
  ],
  '5': [
    [[158,14],[38,14]],
    [[38,14],[38,128],[85,110],[145,118],[170,152],[164,204],[135,240],[88,256],[40,248],[18,232]]
  ],
  '6': [[
    [148,35],[105,14],[60,24],[26,65],[14,118],[14,178],
    [34,228],[80,256],[128,254],[168,226],[178,186],[168,148],
    [145,112],[102,100],[60,108],[26,138],[14,178]
  ]],
  '7': [
    [[28,16],[178,16]],
    [[178,16],[75,258]]
  ],
  '8': [
    [[100,14],[148,14],[176,48],[176,92],[148,126],[100,136],
     [52,126],[24,92],[24,48],[52,14],[100,14]],
    [[100,136],[152,136],[182,170],[182,220],[152,254],[100,260],
     [48,254],[18,220],[18,170],[48,136],[100,136]]
  ],
  '9': [
    [[100,14],[150,14],[180,50],[180,102],[148,132],[100,142],
     [52,132],[20,102],[20,50],[52,14],[100,14]],
    [[180,78],[180,200],[158,242],[118,258]]
  ]
};
