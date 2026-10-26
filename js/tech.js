// Teknoloji ağacı (1936-1945)
export const TECH_CATS = {
  inf: 'Piyade', arm: 'Zırhlı', art: 'Topçu', ind: 'Sanayi', ele: 'Elektronik', air: 'Hava', nav: 'Deniz', doc: 'Doktrin'
};
const T = (id, name, cat, year, req, eff, desc, extra = {}) => ({ id, name, cat, year, req, eff, desc, cost: 1, ...extra });
export const TECHS = [
  T('inf1', 'Temel Piyade Teçhizatı', 'inf', 1936, [], { infAtk: 0.10 }, 'Piyade saldırısı +%10'),
  T('sup1', 'Destek Birlikleri', 'inf', 1936, [], { org: 0.05 }, 'Organizasyon +%5'),
  T('mot1', 'Motorizasyon', 'inf', 1936, [], {}, 'Motorlu piyade taburunu açar'),
  T('mtn1', 'Dağ Piyadesi', 'inf', 1937, ['inf1'], {}, 'Dağ piyadesi taburunu açar (dağ/tepelikte +%25)'),
  T('inf2', 'Geliştirilmiş Piyade Teçhizatı', 'inf', 1939, ['inf1'], { infAtk: 0.10, infDef: 0.10 }, 'Piyade saldırı/savunma +%10'),
  T('mot2', 'Mekanize Piyade', 'inf', 1940, ['mot1', 'inf2'], { spd: 0.10, infDef: 0.05 }, 'Hız +%10, piyade savunması +%5'),
  T('inf3', 'Gelişmiş Piyade Teçhizatı', 'inf', 1942, ['inf2'], { infAtk: 0.10, infDef: 0.15 }, 'Piyade saldırısı +%10, savunması +%15'),
  T('sup2', 'Gelişmiş Lojistik', 'inf', 1941, ['sup1'], { org: 0.05, reinforce: 0.25 }, 'Organizasyon +%5, takviye hızı +%25'),

  T('tank1', 'Hafif Tank', 'arm', 1934, [], {}, 'Tank taburunu açar'),
  T('tank2', 'Orta Tank', 'arm', 1939, ['tank1'], { armAtk: 0.25, armArmor: 15 }, 'Tank saldırısı +%25, zırh +15'),
  T('tank3', 'Ağır Tank', 'arm', 1941, ['tank2'], { armAtk: 0.2, armDef: 0.3, armArmor: 20 }, 'Tank saldırı +%20, savunma +%30, zırh +20'),
  T('tank4', 'Modern Tank', 'arm', 1944, ['tank3'], { armAtk: 0.3, armDef: 0.3, armArmor: 20 }, 'Tank saldırı/savunma +%30'),
  T('arm_spd', 'Gelişmiş Motorlar', 'arm', 1940, ['tank2'], { spd: 0.10 }, 'Birlik hızı +%10'),

  T('art1', 'Topçu', 'art', 1934, [], { artAtk: 0.1 }, 'Topçu saldırısı +%10'),
  T('at1', 'Tanksavar', 'art', 1937, ['art1'], {}, 'Tanksavar taburunu açar'),
  T('art2', 'Geliştirilmiş Topçu', 'art', 1938, ['art1'], { artAtk: 0.2 }, 'Topçu saldırısı +%20'),
  T('aa1', 'Uçaksavar Topları', 'art', 1938, ['art1'], { aa: 0.25 }, 'Düşman hava üstünlüğü etkisi -%25'),
  T('art3', 'Gelişmiş Topçu', 'art', 1941, ['art2'], { artAtk: 0.25 }, 'Topçu saldırısı +%25'),
  T('at2', 'Gelişmiş Tanksavar', 'art', 1942, ['at1', 'art2'], { pierce: 30 }, 'Delicilik +30'),

  T('ind1', 'Temel Makine Aletleri', 'ind', 1936, [], { ind: 0.10, effCap: 0.05 }, 'Fabrika verimi +%10, verimlilik sınırı +%5'),
  T('con1', 'İnşaat Mühendisliği', 'ind', 1936, [], { build: 0.10 }, 'İnşaat hızı +%10'),
  T('ind2', 'Geliştirilmiş Makine Aletleri', 'ind', 1938, ['ind1'], { ind: 0.10, effCap: 0.10 }, 'Fabrika verimi +%10, verimlilik sınırı +%10'),
  T('con2', 'Prefabrik Yapılar', 'ind', 1938, ['con1'], { build: 0.15 }, 'İnşaat hızı +%15'),
  T('syn1', 'Sentetik Yakıt ve Kauçuk', 'ind', 1938, ['ind1'], { res: { oil: 20, rubber: 15 } }, '+20 petrol, +15 kauçuk'),
  T('ind3', 'Gelişmiş Makine Aletleri', 'ind', 1940, ['ind2'], { ind: 0.10, effCap: 0.10 }, 'Fabrika verimi +%10'),
  T('con3', 'Gelişmiş İnşaat', 'ind', 1941, ['con2'], { build: 0.2 }, 'İnşaat hızı +%20'),
  T('ind4', 'Seri Üretim Hatları', 'ind', 1942, ['ind3'], { ind: 0.15, effCap: 0.10 }, 'Fabrika verimi +%15'),

  T('ele1', 'Hesap Makineleri', 'ele', 1936, [], { research: 0.05 }, 'Araştırma hızı +%5'),
  T('radio1', 'Askerî Telsiz', 'ele', 1937, ['ele1'], { org: 0.05, brk: 0.05 }, 'Organizasyon +%5, yarma +%5'),
  T('radar1', 'Radar', 'ele', 1938, ['ele1'], { airAtk: 0.15 }, 'Hava üstünlüğü gücü +%15'),
  T('ele2', 'Elektromekanik Bilgisayarlar', 'ele', 1940, ['ele1'], { research: 0.10 }, 'Araştırma hızı +%10'),
  T('ele3', 'Atom Araştırması', 'ele', 1943, ['ele2'], { research: 0.10, stab: 0.05 }, 'Araştırma +%10, istikrar +%5'),

  T('ftr1', 'Erken Avcı Uçakları', 'air', 1936, [], { airAtk: 0.10 }, 'Avcı uçağı üretimini açar'),
  T('cas1', 'Yakın Hava Desteği', 'air', 1936, [], {}, 'YHD uçağı üretimini açar'),
  T('ftr2', 'Geliştirilmiş Avcılar', 'air', 1940, ['ftr1'], { airAtk: 0.25 }, 'Hava üstünlüğü +%25'),
  T('cas2', 'Geliştirilmiş YHD', 'air', 1940, ['cas1'], { cas: 0.3 }, 'YHD hasarı +%30'),
  T('ftr3', 'Jet Avcıları', 'air', 1944, ['ftr2'], { airAtk: 0.4 }, 'Hava üstünlüğü +%40'),

  T('nav1', 'Muhrip ve Kruvazörler', 'nav', 1936, [], { navy: 0.10 }, 'Donanma gücü +%10'),
  T('amph1', 'Çıkarma Gemileri', 'nav', 1938, ['nav1'], { amph: 0.25 }, 'Deniz indirmesi cezası -%25, hazırlık daha kısa'),
  T('nav2', 'Gelişmiş Savaş Gemileri', 'nav', 1940, ['nav1'], { navy: 0.25 }, 'Donanma gücü +%25'),
  T('sub1', 'Denizaltı Filoları', 'nav', 1939, ['nav1'], { navy: 0.10 }, 'Donanma gücü +%10'),
  T('nav3', 'Uçak Gemisi Grupları', 'nav', 1943, ['nav2'], { navy: 0.3 }, 'Donanma gücü +%30'),

  // Doktrinler: aynı gruptan yalnız bir dal
  T('doc_mob1', 'Hareketli Harp', 'doc', 1936, [], { armAtk: 0.15, spd: 0.05, brk: 0.10 }, 'Tank saldırı +%15, yarma +%10', { grp: 'land' }),
  T('doc_mob2', 'Yıldırım Harbi', 'doc', 1939, ['doc_mob1'], { armAtk: 0.15, brk: 0.15, spd: 0.05 }, 'Tank saldırı +%15, yarma +%15'),
  T('doc_fp1', 'Üstün Ateş Gücü', 'doc', 1936, [], { artAtk: 0.2, infDef: 0.05 }, 'Topçu +%20', { grp: 'land' }),
  T('doc_fp2', 'Entegre Destek', 'doc', 1939, ['doc_fp1'], { artAtk: 0.2, cas: 0.2 }, 'Topçu +%20, YHD +%20'),
  T('doc_mass1', 'Kitlesel Saldırı', 'doc', 1936, [], { org: 0.10, reinforce: 0.3 }, 'Organizasyon +%10, takviye +%30', { grp: 'land' }),
  T('doc_mass2', 'Derin Harekât', 'doc', 1939, ['doc_mass1'], { infAtk: 0.15, brk: 0.1 }, 'Piyade saldırı +%15'),
  T('doc_gb1', 'Büyük Savaş Planı', 'doc', 1936, [], { infDef: 0.15, fortBonus: 0.05 }, 'Piyade savunma +%15, tahkimat etkisi', { grp: 'land' }),
  T('doc_gb2', 'Derinlemesine Savunma', 'doc', 1939, ['doc_gb1'], { infDef: 0.15, org: 0.10 }, 'Savunma +%15, organizasyon +%10'),
  T('doc_air1', 'Hava Üstünlüğü Doktrini', 'doc', 1937, [], { airAtk: 0.15 }, 'Hava üstünlüğü +%15'),
  T('doc_nav1', 'Filo Muharebesi', 'doc', 1937, [], { navy: 0.15 }, 'Donanma gücü +%15')
];
export const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));
export const BASE_RESEARCH_DAYS = 90;

export function techAvailable(c, t) {
  if (c.research.done[t.id]) return false;
  if (c.research.cur.some(r => r.id === t.id)) return false;
  if (!t.req.every(r => c.research.done[r])) return false;
  if (t.grp) { // doktrin grubu: başka bir dal seçilmişse kilitli
    for (const o of TECHS) if (o.grp === t.grp && o.id !== t.id && (c.research.done[o.id] || c.research.cur.some(r => r.id === o.id))) return false;
  }
  return true;
}
export function techDays(c, t, year) {
  const ahead = Math.max(0, t.year - year);
  return BASE_RESEARCH_DAYS * t.cost * (1 + ahead * 0.8);
}
