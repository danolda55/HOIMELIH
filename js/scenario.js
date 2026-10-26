// 1936 senaryosu: ülkeler, kaynaklar, taburlar, şablonlar
export const IDEOLOGIES = {
  democracy: { name: 'Demokrasi', color: '#4a90d9', short: 'D' },
  fascism: { name: 'Faşizm', color: '#8a6d3b', short: 'F' },
  communism: { name: 'Komünizm', color: '#c0392b', short: 'K' },
  neutral: { name: 'Tarafsız', color: '#8c8c8c', short: 'T' }
};

// tag: [ad, renk, ideoloji, sivil, askerî, tersane, nüfus(M, efektif), tümen, gemi, istikrar, savaş desteği, araştırma slotu, gelişmişlik(0-1), anavatan modern kodları]
export const COUNTRIES = {
  GER: ['Almanya', '#59615f', 'fascism', 30, 28, 8, 67, 36, 28, 0.60, 0.35, 3, 0.9, ['DEU']],
  SOV: ['SSCB', '#962020', 'communism', 34, 32, 6, 160, 85, 24, 0.55, 0.30, 3, 0.55, ['RUS', 'UKR', 'BLR', 'KAZ', 'UZB', 'TKM', 'KGZ', 'TJK', 'GEO', 'ARM', 'AZE']],
  USA: ['ABD', '#3a77a8', 'democracy', 60, 14, 12, 128, 22, 85, 0.70, 0.10, 3, 0.9, ['USA']],
  ENG: ['Birleşik Krallık', '#c4505d', 'democracy', 22, 10, 16, 60, 26, 125, 0.65, 0.20, 3, 0.9, ['GBR']],
  FRA: ['Fransa', '#3b58b0', 'democracy', 25, 16, 7, 42, 45, 50, 0.50, 0.20, 3, 0.85, ['FRA']],
  ITA: ['İtalya', '#4d8c3d', 'fascism', 18, 12, 8, 43, 36, 45, 0.65, 0.45, 3, 0.7, ['ITA']],
  JAP: ['Japonya', '#d9b17f', 'fascism', 22, 14, 12, 70, 30, 80, 0.60, 0.50, 3, 0.75, ['JPN']],
  TUR: ['Türkiye', '#2e9e8f', 'neutral', 10, 3, 1, 16.5, 18, 6, 0.70, 0.25, 2, 0.45, ['TUR']],
  CHI: ['Çin', '#c4a94a', 'neutral', 12, 6, 1, 120, 75, 4, 0.35, 0.45, 2, 0.32, ['CHN']],
  MAN: ['Mançukuo', '#9a8a4c', 'fascism', 4, 2, 0, 34, 8, 0, 0.45, 0.30, 2, 0.4, ['CHN']],
  RAJ: ['Britanya Hindistanı', '#e2989a', 'democracy', 10, 3, 2, 60, 10, 4, 0.50, 0.20, 2, 0.3, ['IND', 'PAK', 'BGD', 'BTN']],
  CAN: ['Kanada', '#b8424e', 'democracy', 6, 1, 2, 11, 4, 6, 0.70, 0.20, 2, 0.85, ['CAN']],
  AST: ['Avustralya', '#c9783c', 'democracy', 6, 1, 2, 7, 4, 8, 0.70, 0.20, 2, 0.8, ['AUS']],
  SAF: ['Güney Afrika', '#b98a5d', 'democracy', 4, 1, 0, 10, 3, 1, 0.60, 0.20, 2, 0.6, ['ZAF']],
  NZL: ['Yeni Zelanda', '#7c3c6a', 'democracy', 2, 0, 1, 1.6, 1, 2, 0.75, 0.20, 2, 0.8, ['NZL']],
  IRE: ['İrlanda', '#5aa05a', 'democracy', 2, 0, 0, 3, 2, 0, 0.70, 0.10, 2, 0.7, ['IRL']],
  POL: ['Polonya', '#c96a8c', 'neutral', 12, 6, 1, 34, 30, 4, 0.55, 0.35, 2, 0.55, ['POL']],
  CZE: ['Çekoslovakya', '#5a8fbf', 'democracy', 12, 7, 0, 15, 22, 0, 0.60, 0.40, 2, 0.75, ['CZE', 'SVK']],
  AUS: ['Avusturya', '#e6e6e6', 'neutral', 5, 2, 0, 6.8, 7, 0, 0.45, 0.20, 2, 0.75, ['AUT']],
  HUN: ['Macaristan', '#9c6b3e', 'neutral', 6, 2, 0, 9, 7, 0, 0.55, 0.30, 2, 0.6, ['HUN']],
  ROM: ['Romanya', '#d8c040', 'neutral', 7, 4, 1, 19, 20, 3, 0.50, 0.25, 2, 0.5, ['ROU', 'MDA']],
  YUG: ['Yugoslavya', '#5f5fa0', 'neutral', 6, 3, 1, 15, 20, 3, 0.45, 0.25, 2, 0.45, ['SRB', 'HRV', 'SVN', 'BIH', 'MNE', 'MKD', 'KOS']],
  BUL: ['Bulgaristan', '#6f8f4f', 'neutral', 3, 1, 0, 6, 9, 0, 0.55, 0.25, 2, 0.45, ['BGR']],
  GRE: ['Yunanistan', '#6fa8dc', 'neutral', 4, 2, 1, 7, 10, 5, 0.50, 0.25, 2, 0.5, ['GRC']],
  ALB: ['Arnavutluk', '#a33f3f', 'neutral', 1, 0, 0, 1, 2, 0, 0.50, 0.20, 2, 0.3, ['ALB']],
  SPR: ['İspanya', '#d4b03a', 'democracy', 12, 6, 4, 25, 20, 15, 0.30, 0.40, 2, 0.6, ['ESP']],
  POR: ['Portekiz', '#3f7f5f', 'neutral', 4, 1, 2, 7, 6, 6, 0.60, 0.15, 2, 0.5, ['PRT']],
  SWI: ['İsviçre', '#d06060', 'democracy', 5, 2, 0, 4, 9, 0, 0.80, 0.30, 2, 0.9, ['CHE']],
  BEL: ['Belçika', '#c9b44a', 'democracy', 8, 3, 0, 8.3, 12, 0, 0.60, 0.20, 2, 0.9, ['BEL']],
  HOL: ['Hollanda', '#e08a3c', 'democracy', 8, 2, 3, 8.5, 10, 12, 0.65, 0.15, 2, 0.9, ['NLD']],
  LUX: ['Lüksemburg', '#7fb3d5', 'democracy', 1, 0, 0, 0.3, 1, 0, 0.80, 0.10, 2, 0.9, ['LUX']],
  DEN: ['Danimarka', '#b03a48', 'democracy', 4, 1, 1, 3.7, 3, 3, 0.75, 0.10, 2, 0.85, ['DNK']],
  NOR: ['Norveç', '#8b5a7a', 'democracy', 3, 1, 1, 2.9, 4, 3, 0.75, 0.10, 2, 0.8, ['NOR']],
  SWE: ['İsveç', '#3e75b8', 'democracy', 9, 3, 2, 6.2, 8, 8, 0.80, 0.15, 2, 0.85, ['SWE']],
  FIN: ['Finlandiya', '#e8e8f0', 'democracy', 3, 2, 0, 3.7, 9, 2, 0.70, 0.40, 2, 0.7, ['FIN']],
  EST: ['Estonya', '#4f7fa8', 'neutral', 1, 1, 0, 1.1, 3, 0, 0.60, 0.20, 2, 0.6, ['EST']],
  LAT: ['Letonya', '#8a3a3a', 'neutral', 1, 1, 0, 1.9, 4, 0, 0.60, 0.20, 2, 0.6, ['LVA']],
  LIT: ['Litvanya', '#c8b24a', 'neutral', 1, 1, 0, 2.5, 4, 0, 0.60, 0.20, 2, 0.55, ['LTU']],
  MEX: ['Meksika', '#4f9a6a', 'neutral', 6, 2, 1, 19, 10, 2, 0.55, 0.15, 2, 0.45, ['MEX']],
  BRA: ['Brezilya', '#3f9f3f', 'neutral', 8, 2, 2, 40, 14, 6, 0.50, 0.15, 2, 0.4, ['BRA']],
  ARG: ['Arjantin', '#8fbfdf', 'neutral', 9, 2, 3, 13, 10, 10, 0.55, 0.15, 2, 0.6, ['ARG']],
  CHL: ['Şili', '#b0506a', 'democracy', 4, 1, 2, 4.7, 5, 6, 0.60, 0.15, 2, 0.5, ['CHL']],
  PRU: ['Peru', '#b85f3f', 'neutral', 3, 1, 1, 6.5, 5, 2, 0.50, 0.15, 2, 0.35, ['PER']],
  COL: ['Kolombiya', '#d8c86a', 'democracy', 3, 1, 0, 8.5, 4, 1, 0.55, 0.10, 2, 0.35, ['COL']],
  VEN: ['Venezuela', '#7a5fb0', 'neutral', 3, 1, 0, 3.5, 3, 1, 0.50, 0.10, 2, 0.4, ['VEN']],
  BOL: ['Bolivya', '#9fa04f', 'neutral', 1, 1, 0, 3, 4, 0, 0.40, 0.20, 2, 0.25, ['BOL']],
  PAR: ['Paraguay', '#6f6fbf', 'neutral', 1, 1, 0, 1, 4, 0, 0.45, 0.20, 2, 0.25, ['PRY']],
  URG: ['Uruguay', '#5fa0c0', 'democracy', 2, 0, 0, 2, 2, 0, 0.65, 0.10, 2, 0.55, ['URY']],
  ECU: ['Ekvador', '#c0a050', 'neutral', 1, 0, 0, 2.5, 2, 0, 0.45, 0.10, 2, 0.3, ['ECU']],
  CUB: ['Küba', '#4060a0', 'neutral', 2, 0, 0, 4.2, 2, 1, 0.50, 0.10, 2, 0.4, ['CUB']],
  GUA: ['Guatemala', '#5f8fbf', 'neutral', 1, 0, 0, 2, 1, 0, 0.50, 0.10, 2, 0.25, ['GTM']],
  HON: ['Honduras', '#4f7f9f', 'neutral', 1, 0, 0, 1, 1, 0, 0.45, 0.10, 2, 0.2, ['HND']],
  ELS: ['El Salvador', '#3f5f9f', 'neutral', 1, 0, 0, 1.6, 1, 0, 0.50, 0.10, 2, 0.25, ['SLV']],
  NIC: ['Nikaragua', '#5f9fbf', 'neutral', 1, 0, 0, 1, 1, 0, 0.45, 0.10, 2, 0.2, ['NIC']],
  COS: ['Kosta Rika', '#6a6aa0', 'democracy', 1, 0, 0, 0.6, 1, 0, 0.70, 0.10, 2, 0.35, ['CRI']],
  PAN: ['Panama', '#a05f5f', 'democracy', 1, 0, 0, 0.6, 1, 0, 0.60, 0.10, 2, 0.35, ['PAN']],
  HAI: ['Haiti', '#5f4fa0', 'neutral', 1, 0, 0, 2.5, 1, 0, 0.40, 0.10, 2, 0.15, ['HTI']],
  DOM: ['Dominik Cumhuriyeti', '#4f6fa0', 'neutral', 1, 0, 0, 1.5, 1, 0, 0.55, 0.10, 2, 0.25, ['DOM']],
  MON: ['Moğolistan', '#a05050', 'communism', 1, 0, 0, 0.8, 4, 0, 0.60, 0.40, 2, 0.15, ['MNG']],
  SIA: ['Siyam', '#5f8f9f', 'neutral', 3, 1, 1, 14, 6, 3, 0.55, 0.20, 2, 0.3, ['THA']],
  PER: ['İran', '#3f8f6f', 'neutral', 4, 1, 0, 15, 8, 0, 0.50, 0.15, 2, 0.3, ['IRN']],
  AFG: ['Afganistan', '#6f7f4f', 'neutral', 1, 0, 0, 7, 5, 0, 0.45, 0.20, 2, 0.1, ['AFG']],
  IRQ: ['Irak', '#7f9f5f', 'neutral', 2, 0, 0, 3.6, 4, 0, 0.45, 0.15, 2, 0.25, ['IRQ']],
  SAU: ['Suudi Arabistan', '#3f7f3f', 'neutral', 1, 0, 0, 3, 3, 0, 0.55, 0.20, 2, 0.15, ['SAU']],
  YEM: ['Yemen', '#9f4f4f', 'neutral', 1, 0, 0, 3, 2, 0, 0.45, 0.20, 2, 0.1, ['YEM']],
  OMA: ['Umman', '#bf5f5f', 'neutral', 1, 0, 0, 0.5, 1, 0, 0.50, 0.10, 2, 0.1, ['OMN']],
  ETH: ['Etiyopya', '#5f9f3f', 'neutral', 1, 0, 0, 12, 12, 0, 0.40, 0.60, 2, 0.1, ['ETH']],
  LIB: ['Liberya', '#9f9fcf', 'democracy', 1, 0, 0, 1.5, 1, 0, 0.50, 0.10, 2, 0.15, ['LBR']],
  EGY: ['Mısır', '#c8b878', 'neutral', 3, 1, 0, 16, 4, 1, 0.50, 0.15, 2, 0.35, ['EGY']],
  NEP: ['Nepal', '#bf6f6f', 'neutral', 1, 0, 0, 6, 3, 0, 0.60, 0.20, 2, 0.1, ['NPL']]
};
export const MAJORS = ['GER', 'SOV', 'USA', 'ENG', 'FRA', 'ITA', 'JAP', 'TUR'];

// Başlangıç ilişkileri
export const START_PUPPETS = { MAN: 'JAP', RAJ: 'ENG', MON: 'SOV' };
export const START_FACTIONS = [
  { id: 'allies', name: 'Müttefikler', leader: 'ENG', members: ['ENG', 'CAN', 'AST', 'NZL', 'SAF', 'RAJ'], color: '#3d6fb5' },
  { id: 'comintern', name: 'Komintern', leader: 'SOV', members: ['SOV', 'MON'], color: '#b02020' }
];
export const START_WARS = [['ITA', 'ETH']];

// Başlangıç teknolojileri
export const START_TECH = {
  _major: ['inf1', 'art1', 'sup1', 'ind1', 'ftr1', 'nav1'],
  _minor: ['inf1'],
  GER: ['tank1', 'mot1', 'cas1', 'ele1', 'con1'],
  SOV: ['tank1', 'mot1', 'con1'],
  USA: ['mot1', 'ele1', 'con1'],
  ENG: ['tank1', 'mot1', 'ele1'],
  FRA: ['tank1', 'mot1', 'con1'],
  ITA: ['tank1', 'mot1'],
  JAP: ['tank1', 'cas1'],
  TUR: ['art1'],
  CZE: ['art1', 'tank1'], POL: ['art1'], SWE: ['art1', 'ind1'], CHI: [], SPR: ['art1']
};

// Dünya kaynak yatakları: [boylam, enlem, kaynak, miktar]
export const RESOURCES = { steel: 'Çelik', oil: 'Petrol', alu: 'Alüminyum', rubber: 'Kauçuk', tung: 'Tungsten', chrom: 'Krom' };
export const RES_SPOTS = [
  [7, 51.5, 'steel', 50], [18.5, 50.3, 'steel', 18], [6, 49, 'steel', 40], [20, 67.8, 'steel', 60], [-1.5, 53, 'steel', 40], [38, 48, 'steel', 70], [60, 57, 'steel', 60], [87, 54, 'steel', 40],
  [-80, 40.4, 'steel', 120], [-93, 47, 'steel', 90], [-87, 33.5, 'steel', 40], [123, 41.5, 'steel', 40], [85.5, 23, 'steel', 40], [131, 33.8, 'steel', 14], [32.6, 41.2, 'steel', 4],
  [-3, 43.2, 'steel', 15], [-44, -19.9, 'steel', 20], [151.7, -32.9, 'steel', 20], [114.3, 30.5, 'steel', 15], [10.5, 43, 'steel', 8], [5, 50.5, 'steel', 15], [14, 50, 'steel', 15],
  [33.3, 47.9, 'steel', 40], [28, -26, 'steel', 15], [-79.4, 43.5, 'steel', 25], [14.5, 47.3, 'steel', 6], [14, 66, 'steel', 5], [10, 52, 'steel', 14],
  [49.8, 40.4, 'oil', 120], [45.7, 43.3, 'oil', 30], [26, 45, 'oil', 50], [-97, 31, 'oil', 200], [-118.5, 35, 'oil', 120], [-97.5, 35.5, 'oil', 100], [-71.6, 10.6, 'oil', 100],
  [-97.5, 21, 'oil', 30], [49, 31, 'oil', 60], [44.4, 35.5, 'oil', 40], [50, 26, 'oil', 16], [47.8, 29.3, 'oil', 10], [117, 1, 'oil', 20], [103, -1.5, 'oil', 40], [95, 20, 'oil', 8],
  [-81, -4.5, 'oil', 10], [-74, 7, 'oil', 10], [-61.3, 10.4, 'oil', 10], [-68, -46, 'oil', 10], [22.5, 49.5, 'oil', 4], [16.8, 48.3, 'oil', 4], [142.8, 53, 'oil', 8], [16.7, 46.6, 'oil', 4],
  [19.6, 40.7, 'oil', 4], [33, 28, 'oil', 4], [10, 52.5, 'oil', 4],
  [102, 3.5, 'rubber', 200], [99, 2, 'rubber', 120], [110, -7, 'rubber', 40], [106, 11, 'rubber', 50], [100, 7, 'rubber', 40], [80.7, 7, 'rubber', 30], [-9.5, 6.5, 'rubber', 30],
  [-60, -3, 'rubber', 20], [23, -2, 'rubber', 20], [97, 16, 'rubber', 10], [124, 8, 'rubber', 10],
  [114.5, 26, 'tung', 80], [-6, 42, 'tung', 15], [-8, 40.5, 'tung', 25], [98, 18, 'tung', 15], [-117, 37, 'tung', 20], [127.5, 37, 'tung', 15], [43.5, 43.3, 'tung', 10], [-66, -19, 'tung', 15],
  [147, -42, 'tung', 5], [99, 14, 'tung', 5], [-36.5, -6, 'tung', 5],
  [39.7, 38.5, 'chrom', 40], [29.2, 36.8, 'chrom', 20], [27.5, -25, 'chrom', 40], [30.5, -19.5, 'chrom', 30], [59, 51, 'chrom', 50], [20.5, 42.2, 'chrom', 15], [20.2, 41.6, 'chrom', 10],
  [120.5, 15.5, 'chrom', 15], [-76, 20.5, 'chrom', 10], [165.5, -21.5, 'chrom', 15], [22, 40.4, 'chrom', 8], [86, 21, 'chrom', 15], [-40, -10, 'chrom', 5],
  [5.5, 43.5, 'alu', 40], [17.5, 47, 'alu', 20], [18, 43.5, 'alu', 20], [-58.5, 6, 'alu', 30], [-55.2, 5.5, 'alu', 40], [13.8, 45, 'alu', 10], [13, 51, 'alu', 20], [-92.5, 34.6, 'alu', 150],
  [-71, 48.4, 'alu', 60], [33.5, 60, 'alu', 25], [61, 59, 'alu', 20], [6, 60, 'alu', 20], [22.5, 38.5, 'alu', 10], [140, 36, 'alu', 8], [-1, 6, 'alu', 10], [104.5, 1, 'alu', 10], [8.5, 47, 'alu', 6]
];

// Ekipman: [ad, IC maliyeti, fabrika başına kaynak ihtiyacı]
export const EQUIP = {
  inf: { name: 'Piyade Teçhizatı', cost: 0.5, res: { steel: 0.5 } },
  art: { name: 'Topçu', cost: 3.5, res: { steel: 1, tung: 0.5 } },
  mot: { name: 'Motorlu Araç', cost: 2.5, res: { steel: 0.5, rubber: 0.5, oil: 0.3 } },
  tank: { name: 'Tank', cost: 8, res: { steel: 1, chrom: 0.5, oil: 0.3 } },
  ftr: { name: 'Avcı Uçağı', cost: 22, res: { alu: 1, rubber: 0.3, oil: 0.2 } },
  cas: { name: 'Yakın Destek Uçağı', cost: 24, res: { alu: 1.2, rubber: 0.3, oil: 0.2 } },
  ship: { name: 'Savaş Gemisi', cost: 480, res: { steel: 1, chrom: 0.5 }, dock: true }
};
export const LAND_EQ = ['inf', 'art', 'mot', 'tank', 'ftr', 'cas'];

// Taburlar
export const BATTALIONS = {
  inf: { name: 'Piyade', sa: 6, ha: 1, def: 22, brk: 3, org: 60, hp: 25, armor: 0, pierce: 4, hard: 0, spd: 4, width: 2, mp: 1, eq: { inf: 100 }, cls: 'inf' },
  art: { name: 'Topçu', sa: 25, ha: 2, def: 10, brk: 6, org: 0, hp: 0.6, armor: 0, pierce: 5, hard: 0, spd: 4, width: 3, mp: 0.5, eq: { art: 12, inf: 30 }, cls: 'art' },
  mot: { name: 'Motorlu Piyade', sa: 6, ha: 1, def: 24, brk: 3, org: 60, hp: 25, armor: 0, pierce: 4, hard: 0.1, spd: 12, width: 2, mp: 1, eq: { inf: 100, mot: 35 }, cls: 'inf', req: 'mot1' },
  arm: { name: 'Tank', sa: 14, ha: 10, def: 4, brk: 28, org: 10, hp: 2, armor: 30, pierce: 30, hard: 0.85, spd: 8, width: 2, mp: 0.5, eq: { tank: 50 }, cls: 'arm', req: 'tank1' },
  cav: { name: 'Süvari', sa: 5, ha: 0.5, def: 18, brk: 4, org: 70, hp: 25, armor: 0, pierce: 2, hard: 0, spd: 6, width: 2, mp: 1, eq: { inf: 120 }, cls: 'inf' },
  mtn: { name: 'Dağ Piyadesi', sa: 6, ha: 1, def: 20, brk: 3, org: 60, hp: 20, armor: 0, pierce: 4, hard: 0, spd: 4, width: 2, mp: 1, eq: { inf: 120 }, cls: 'inf', req: 'mtn1' },
  at: { name: 'Tanksavar', sa: 2, ha: 15, def: 4, brk: 1, org: 0, hp: 0.6, armor: 0, pierce: 60, hard: 0, spd: 4, width: 1, mp: 0.5, eq: { art: 8, inf: 20 }, cls: 'art', req: 'at1' }
};
export const DEFAULT_TEMPLATES = [
  { id: 't0', name: 'Piyade Tümeni', bn: { inf: 7, art: 2 } },
  { id: 't1', name: 'Motorlu Tümen', bn: { mot: 6, art: 2 } },
  { id: 't2', name: 'Zırhlı Tümen', bn: { arm: 4, mot: 3, art: 1 } },
  { id: 't3', name: 'Süvari Tümeni', bn: { cav: 6 } },
  { id: 't4', name: 'Hafif Piyade', bn: { inf: 6 } }
];

export const TERRAIN = {
  plains: { name: 'Ova', atk: 0, arm: 0, move: 1, width: 1 },
  forest: { name: 'Orman', atk: -0.15, arm: -0.25, move: 1.3, width: 1 },
  hills: { name: 'Tepelik', atk: -0.25, arm: -0.25, move: 1.4, width: 1 },
  mountain: { name: 'Dağlık', atk: -0.5, arm: -0.5, move: 1.8, width: 0.75 },
  jungle: { name: 'Orman (Tropikal)', atk: -0.3, arm: -0.5, move: 1.7, width: 0.8 },
  marsh: { name: 'Bataklık', atk: -0.4, arm: -0.6, move: 1.8, width: 0.75 },
  desert: { name: 'Çöl', atk: -0.1, arm: 0, move: 1.2, width: 1 },
  tundra: { name: 'Tundra', atk: -0.1, arm: -0.2, move: 1.5, width: 1 },
  urban: { name: 'Şehir', atk: -0.3, arm: -0.4, move: 1.2, width: 0.9 }
};

export const LAWS = {
  econ: [
    { name: 'Sivil Ekonomi', cg: 0.35, build: -0.3, mil: -0.1 },
    { name: 'Erken Seferberlik', cg: 0.30, build: -0.1, mil: 0 },
    { name: 'Kısmi Seferberlik', cg: 0.25, build: 0.1, mil: 0.1, ws: 0.15 },
    { name: 'Savaş Ekonomisi', cg: 0.20, build: 0.2, mil: 0.15, ws: 0.4, war: true },
    { name: 'Topyekûn Seferberlik', cg: 0.10, build: 0.3, mil: 0.2, ws: 0.8, war: true }
  ],
  consc: [
    { name: 'Gönüllü Ordu', rate: 0.015 },
    { name: 'Sınırlı Askerlik', rate: 0.025, ws: 0 },
    { name: 'Yaygın Askerlik', rate: 0.05, ws: 0.2 },
    { name: 'Kapsamlı Askerlik', rate: 0.08, ws: 0.5 },
    { name: 'Topyekûn Askerlik', rate: 0.12, ws: 0.75, war: true }
  ]
};
export const START_LAWS = { GER: [1, 1], SOV: [1, 1], JAP: [2, 1], ITA: [1, 1], CHI: [1, 2], ETH: [1, 2] };

// İnşaat maliyetleri (inşaat puanı; sivil fabrika başına günlük 5 puan)
export const BUILDINGS = {
  civ: { name: 'Sivil Fabrika', cost: 10800, max: 20, slot: true },
  mil: { name: 'Askerî Fabrika', cost: 7200, max: 20, slot: true },
  dock: { name: 'Tersane', cost: 6400, max: 10, slot: true, coastal: true },
  infra: { name: 'Altyapı', cost: 3000, max: 5 },
  fort: { name: 'Kara Tahkimatı', cost: 2500, max: 5 },
  aa: { name: 'Uçaksavar', cost: 1500, max: 5 }
};

// Tarihî yapay zekâ planları (yalnız YZ kontrolündeki ülkeler için)
export const AI_PLANS = {
  GER: [{ after: '1939-09-01', target: 'POL' }, { after: '1940-05-10', target: 'FRA' }, { after: '1940-05-10', target: 'BEL' }, { after: '1940-05-10', target: 'HOL' }, { after: '1940-05-10', target: 'LUX' }, { after: '1940-04-09', target: 'DEN' }, { after: '1941-06-22', target: 'SOV' }],
  JAP: [{ after: '1937-07-07', target: 'CHI' }, { after: '1941-12-07', target: 'USA' }, { after: '1941-12-08', target: 'ENG' }, { after: '1941-12-10', target: 'HOL' }],
  SOV: [{ after: '1939-11-30', target: 'FIN' }],
  ITA: [{ after: '1940-06-10', target: 'FRA' }, { after: '1940-10-28', target: 'GRE' }]
};
