// Ulusal odak ağaçları (genel + ülkeye özel)
const F = (id, name, x, y, req, eff, desc, extra = {}) => ({ id, name, x, y, req, eff, desc, days: 70, ...extra });

export const GENERIC_FOCUS = [
  // Sanayi
  F('g_ind1', 'Sanayi Hamlesi', 0, 0, [], [{ civ: 2 }], '+2 sivil fabrika'),
  F('g_ind2', 'Altyapı Yatırımı', 0, 1, ['g_ind1'], [{ infra: 3 }, { mod: { build: 0.1 } }], '3 ilde altyapı +1, inşaat +%10'),
  F('g_ind3', 'Silah Sanayii', 1, 1, ['g_ind1'], [{ mil: 2 }], '+2 askerî fabrika'),
  F('g_ind4', 'Araştırma Enstitüleri', 0, 2, ['g_ind2'], [{ slot: 1 }], '+1 araştırma slotu'),
  F('g_ind5', 'Ağır Sanayi', 1, 2, ['g_ind3'], [{ mil: 3 }, { mod: { effCap: 0.05 } }], '+3 askerî fabrika, verimlilik sınırı +%5'),
  F('g_ind6', 'Sentetik Malzeme', 0, 3, ['g_ind4'], [{ res: { oil: 10, rubber: 10 } }], '+10 petrol, +10 kauçuk'),
  F('g_ind7', 'Seferberlik Altyapısı', 1, 3, ['g_ind5'], [{ civ: 2 }, { mil: 2 }], '+2 sivil, +2 askerî fabrika'),
  // Ordu
  F('g_army1', 'Ordu Reformu', 2, 0, [], [{ mod: { infAtk: 0.05, infDef: 0.05 } }, { pp: 25 }], 'Piyade +%5'),
  F('g_army2', 'Topçu Programı', 2, 1, ['g_army1'], [{ stock: { art: 300 } }, { mod: { artAtk: 0.1 } }], '+300 topçu, topçu +%10'),
  F('g_army3', 'Seferberlik Hazırlığı', 3, 1, ['g_army1'], [{ ws: 0.1 }, { mp: 50 }], 'Savaş desteği +%10, +50B insan gücü'),
  F('g_army4', 'Zırhlı Kuvvetler', 2, 2, ['g_army2'], [{ tech: 'tank1' }, { tech: 'mot1' }, { stock: { tank: 100, mot: 200 } }], 'Tank ve motorizasyon'),
  F('g_army5', 'Kurmay Akademisi', 3, 2, ['g_army3'], [{ mod: { org: 0.1 } }], 'Organizasyon +%10'),
  // Hava / Deniz
  F('g_air1', 'Hava Kuvvetleri', 4, 0, [], [{ stock: { ftr: 60 } }, { mil: 1 }], '+60 avcı, +1 askerî fabrika'),
  F('g_air2', 'Hava Üstünlüğü', 4, 1, ['g_air1'], [{ mod: { airAtk: 0.15 } }, { tech: 'cas1' }], 'Hava gücü +%15'),
  F('g_nav1', 'Donanma Genişlemesi', 5, 0, [], [{ dock: 2 }], '+2 tersane'),
  F('g_nav2', 'Çıkarma Kuvvetleri', 5, 1, ['g_nav1'], [{ tech: 'amph1' }, { ships: 4 }], 'Çıkarma gemileri, +4 gemi'),
  // Siyaset
  F('g_pol1', 'Siyasi Etki', 6, 0, [], [{ mod: { ppGain: 0.5 } }], 'Siyasi güç +0.5/gün'),
  F('g_pol2', 'Milli Birlik', 6, 1, ['g_pol1'], [{ stab: 0.1 }], 'İstikrar +%10'),
  F('g_pol3', 'Savaş Propagandası', 7, 1, ['g_pol1'], [{ ws: 0.15 }], 'Savaş desteği +%15'),
  F('g_dem', 'Demokrasiye Bağlılık', 6, 2, ['g_pol2'], [{ ideology: 'democracy' }, { stab: 0.05 }], 'İdeoloji: Demokrasi', { excl: ['g_fas', 'g_com'] }),
  F('g_fas', 'Faşizmi Benimse', 7, 2, ['g_pol3'], [{ ideology: 'fascism' }, { ws: 0.1 }], 'İdeoloji: Faşizm', { excl: ['g_dem', 'g_com'] }),
  F('g_com', 'Komünizmi Benimse', 8, 2, ['g_pol3'], [{ ideology: 'communism' }, { ws: 0.05 }], 'İdeoloji: Komünizm', { excl: ['g_dem', 'g_fas'] }),
  F('g_pact', 'Kendi Paktını Kur', 7, 3, [], [{ faction: true }], 'Kendi ittifakını kur', { reqAny: ['g_dem', 'g_fas', 'g_com'] }),
  F('g_ally', 'Büyük Güce Yanaş', 8, 3, [], [{ joinBest: true }], 'İdeolojine uygun ittifaka katılım talebi', { reqAny: ['g_dem', 'g_fas', 'g_com'] })
];

const N = (id, name, x, y, req, eff, desc, extra = {}) => F(id, name, x + 10, y, req, eff, desc, extra);
export const NATIONAL_FOCUS = {
  TUR: [
    N('tur_montreux', 'Montrö Boğazlar Sözleşmesi', 0, 0, [], [{ fortNear: [[29, 41], [26.4, 40.1]], lvl: 3 }, { ws: 0.05 }, { pp: 30 }], 'Boğazlar tahkim edilir, +30 SG'),
    N('tur_etatism', 'Devletçilik', 1, 0, [], [{ civ: 3 }], '+3 sivil fabrika'),
    N('tur_neutral', 'Yurtta Sulh, Cihanda Sulh', 2, 0, [], [{ stab: 0.15 }, { mod: { ppGain: 0.25 } }], 'İstikrar +%15, SG +0.25'),
    N('tur_hatay', 'Hatay Meselesi', 0, 1, ['tur_montreux'], [{ cede: { from: 'FRA', lon: 36.6, lat: 36.4 } }], 'Hatay\'ı (Kuzey Suriye) kazan'),
    N('tur_5yp', 'Birinci Beş Yıllık Sanayi Planı', 1, 1, ['tur_etatism'], [{ civ: 2 }, { mil: 2 }], '+2 sivil, +2 askerî fabrika'),
    N('tur_army', 'Ordu Modernizasyonu', 2, 1, ['tur_neutral'], [{ mod: { infDef: 0.1, infAtk: 0.05 } }, { stock: { art: 200, inf: 1500 } }], 'Piyade güçlenir, ekipman'),
    N('tur_balkan', 'Balkan Antantı', 0, 2, ['tur_montreux'], [{ faction: { id: 'balkan', name: 'Balkan Antantı' } }, { invite: ['GRE', 'YUG', 'ROM'] }], 'Balkan Antantı\'nı kur, Yunanistan, Yugoslavya, Romanya\'yı davet et'),
    N('tur_karabuk', 'Karabük Demir-Çelik', 1, 2, ['tur_5yp'], [{ res: { steel: 16 } }, { mil: 1 }], '+16 çelik, +1 askerî fabrika'),
    N('tur_thk', 'Türk Hava Kurumu', 2, 2, ['tur_army'], [{ stock: { ftr: 80 } }, { mil: 1 }, { tech: 'ftr1' }], '+80 avcı uçağı'),
    N('tur_saadabad', 'Sadabat Paktı', 0, 3, ['tur_balkan'], [{ invite: ['PER', 'IRQ', 'AFG'] }], 'İran, Irak ve Afganistan\'ı davet et'),
    N('tur_chrome', 'Krom İhracatı', 1, 3, ['tur_karabuk'], [{ res: { chrom: 20 } }, { civ: 2 }], '+20 krom, +2 sivil fabrika'),
    N('tur_nation', 'Milli Şef', 2, 3, ['tur_thk'], [{ stab: 0.1 }, { ws: 0.1 }, { slot: 1 }], 'İstikrar, savaş desteği, +1 araştırma')
  ],
  GER: [
    N('ger_rhine', 'Ren Bölgesini Askerileştir', 0, 0, [], [{ ws: 0.1 }, { fortBorder: 'FRA', lvl: 2 }], 'Savaş desteği +%10, Fransa sınırına tahkimat'),
    N('ger_4yp', 'Dört Yıllık Plan', 1, 0, [], [{ mil: 3 }, { civ: 2 }], '+3 askerî, +2 sivil'),
    N('ger_axis', 'Mihver', 2, 0, [], [{ faction: { id: 'axis', name: 'Mihver' } }], 'Mihver ittifakını kur'),
    N('ger_anschluss', 'Anschluss', 0, 1, ['ger_rhine'], [{ annex: 'AUS' }], 'Avusturya\'yı ilhak et (Mart 1938 sonrası)', { after: '1938-03-01' }),
    N('ger_luft', 'Luftwaffe', 1, 1, ['ger_4yp'], [{ stock: { ftr: 200, cas: 100 } }, { tech: 'cas1' }], '+200 avcı, +100 YHD'),
    N('ger_sudet', 'Südet Krizi', 0, 2, ['ger_anschluss'], [{ annex: 'CZE' }], 'Çekoslovakya\'yı ilhak et (Eylül 1938 sonrası)', { after: '1938-09-15' }),
    N('ger_zplan', 'Z Planı', 1, 2, ['ger_luft'], [{ dock: 4 }], '+4 tersane'),
    N('ger_invite', 'Mihver Genişlemesi', 2, 1, ['ger_axis'], [{ invite: ['ITA', 'JAP', 'HUN', 'ROM', 'BUL'] }], 'Müttefik davetleri (1939 sonrası)', { after: '1939-01-01' }),
    N('ger_danzig', 'Danzig ya da Savaş', 0, 3, ['ger_sudet'], [{ wargoal: 'POL' }], 'Polonya\'ya karşı savaş gerekçesi (1939 sonrası)', { after: '1939-03-01' })
  ],
  SOV: [
    N('sov_5yp', 'İkinci Beş Yıllık Plan', 0, 0, [], [{ civ: 4 }], '+4 sivil fabrika'),
    N('sov_purge', 'Büyük Temizlik', 1, 0, [], [{ stab: 0.15 }, { mod: { ppGain: 0.5 } }], 'İstikrar +%15, SG +0.5'),
    N('sov_3yp', 'Üçüncü Beş Yıllık Plan', 0, 1, ['sov_5yp'], [{ mil: 5 }], '+5 askerî fabrika'),
    N('sov_deep', 'Derin Harekât', 1, 1, ['sov_purge'], [{ tech: 'doc_mass1' }, { mod: { infAtk: 0.05 } }], 'Kitlesel saldırı doktrini'),
    N('sov_ural', 'Ural Sanayi Bölgesi', 0, 2, ['sov_3yp'], [{ mil: 3 }, { civ: 2 }], '+3 askerî, +2 sivil'),
    N('sov_baltic', 'Baltık Talepleri', 1, 2, ['sov_deep'], [{ annex: 'EST' }, { annex: 'LAT' }, { annex: 'LIT' }], 'Baltık ülkelerini ilhak et (Haziran 1940 sonrası)', { after: '1940-06-15' }),
    N('sov_finn', 'Fin Meselesi', 1, 3, ['sov_baltic'], [{ wargoal: 'FIN' }], 'Finlandiya\'ya karşı savaş gerekçesi (1939 sonrası)', { after: '1939-10-01' })
  ],
  USA: [
    N('usa_newdeal', 'Yeni Düzen', 0, 0, [], [{ civ: 4 }], '+4 sivil fabrika'),
    N('usa_neutral', 'Tarafsızlık Yasası', 1, 0, [], [{ stab: 0.1 }], 'İstikrar +%10'),
    N('usa_navy', 'İki Okyanus Donanması', 0, 1, ['usa_newdeal'], [{ dock: 6 }, { ships: 10 }], '+6 tersane, +10 gemi'),
    N('usa_arsenal', 'Demokrasinin Cephaneliği', 1, 1, ['usa_neutral'], [{ mil: 6 }], '+6 askerî fabrika'),
    N('usa_draft', 'Seçici Hizmet Yasası', 1, 2, ['usa_arsenal'], [{ ws: 0.2 }, { mp: 300 }], 'Savaş desteği +%20, +300B insan gücü'),
    N('usa_allies', 'Müttefiklere Katıl', 0, 2, ['usa_navy'], [{ join: 'allies' }], 'Müttefiklere katıl (gerginlik %70, 1941 sonrası)', { tension: 70, after: '1941-06-01' })
  ],
  ENG: [
    N('eng_rearm', 'Yeniden Silahlanma', 0, 0, [], [{ mil: 3 }], '+3 askerî fabrika'),
    N('eng_radar', 'Chain Home Radar Ağı', 1, 0, [], [{ tech: 'radar1' }, { mod: { airAtk: 0.1 } }], 'Radar, hava gücü +%10'),
    N('eng_navy', 'Kraliyet Donanması', 0, 1, ['eng_rearm'], [{ dock: 4 }, { ships: 15 }], '+4 tersane, +15 gemi'),
    N('eng_france', 'Fransa ile İttifak', 1, 1, ['eng_radar'], [{ invite: ['FRA', 'POL', 'BEL', 'HOL'] }], 'Fransa, Polonya, Belçika ve Hollanda\'yı davet et (1939 sonrası)', { after: '1939-03-01' }),
    N('eng_empire', 'İmparatorluk Seferberliği', 0, 2, ['eng_navy'], [{ civ: 2 }, { mil: 2 }, { mp: 150 }], 'Sömürge kaynakları')
  ],
  FRA: [
    N('fra_maginot', 'Maginot Hattı', 0, 0, [], [{ fortBorder: 'GER', lvl: 4 }], 'Alman sınırına güçlü tahkimat'),
    N('fra_ind', 'Ulusal Sanayileşme', 1, 0, [], [{ civ: 2 }, { mil: 2 }], '+2 sivil, +2 askerî'),
    N('fra_allies', 'İngiltere ile Bağlar', 0, 1, ['fra_maginot'], [{ join: 'allies' }], 'Müttefiklere katıl (1939 sonrası)', { after: '1939-03-01' })
  ],
  ITA: [
    N('ita_autarky', 'Otarşi', 0, 0, [], [{ mil: 2 }, { res: { steel: 6 } }], '+2 askerî, +6 çelik'),
    N('ita_navy', 'Mare Nostrum', 1, 0, [], [{ dock: 2 }, { ships: 6 }], '+2 tersane, +6 gemi'),
    N('ita_albania', 'Arnavutluk Seferi', 0, 1, ['ita_autarky'], [{ annex: 'ALB' }], 'Arnavutluk\'u ilhak et (Nisan 1939 sonrası)', { after: '1939-04-01' }),
    N('ita_axis', 'Çelik Pakt', 1, 1, ['ita_navy'], [{ join: 'axis' }], 'Mihver\'e katıl')
  ],
  JAP: [
    N('jap_man', 'Mançurya Sanayisi', 0, 0, [], [{ civ: 3 }], '+3 sivil fabrika'),
    N('jap_navy', 'Kantai Kessen', 1, 0, [], [{ dock: 4 }, { ships: 10 }], '+4 tersane, +10 gemi'),
    N('jap_china', 'Çin Seferi', 0, 1, ['jap_man'], [{ wargoal: 'CHI' }], 'Çin\'e karşı savaş gerekçesi (1937 sonrası)', { after: '1937-05-01' }),
    N('jap_axis', 'Üçlü Pakt', 1, 1, ['jap_navy'], [{ join: 'axis' }], 'Mihver\'e katıl'),
    N('jap_south', 'Güney Genişlemesi', 1, 2, ['jap_axis'], [{ wargoal: 'HOL' }, { mil: 2 }], 'Hollanda Doğu Hint Adaları hedefi (1941 sonrası)', { after: '1941-06-01' })
  ]
};
function afterDay(str) { const [y, m, d] = str.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1936, 0, 1)) / 86400000); }
export function focusTree(tag) { return GENERIC_FOCUS.concat(NATIONAL_FOCUS[tag] || []); }
export function focusById(tag, id) { return focusTree(tag).find(f => f.id === id); }
export function focusAvailable(state, c, f) {
  if (f.after && state.day < afterDay(f.after)) return false;
  if (c.focus.done[f.id] || c.focus.cur === f.id) return false;
  if (!f.req.every(r => c.focus.done[r])) return false;
  if (f.reqAny && !f.reqAny.some(r => c.focus.done[r])) return false;
  if (f.excl && f.excl.some(r => c.focus.done[r] || c.focus.cur === r)) return false;
  return true;
}
// YZ öncelik sırası
export const AI_FOCUS_ORDER = {
  GER: ['ger_4yp', 'ger_rhine', 'ger_axis', 'ger_anschluss', 'ger_luft', 'ger_sudet', 'ger_invite', 'ger_danzig', 'ger_zplan'],
  SOV: ['sov_5yp', 'sov_purge', 'sov_3yp', 'sov_deep', 'sov_ural', 'sov_baltic', 'sov_finn'],
  USA: ['usa_newdeal', 'usa_neutral', 'usa_arsenal', 'usa_navy', 'usa_draft', 'usa_allies'],
  ENG: ['eng_rearm', 'eng_radar', 'eng_navy', 'eng_france', 'eng_empire'],
  FRA: ['fra_maginot', 'fra_ind', 'fra_allies'],
  ITA: ['ita_autarky', 'ita_navy', 'ita_axis', 'ita_albania'],
  JAP: ['jap_man', 'jap_navy', 'jap_china', 'jap_axis', 'jap_south'],
  TUR: ['tur_etatism', 'tur_montreux', 'tur_5yp', 'tur_neutral', 'tur_karabuk', 'tur_army', 'tur_hatay', 'tur_thk', 'tur_chrome', 'tur_nation']
};
