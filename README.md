# Cephe 1936 — Tarayıcıda İki Kişilik Büyük Strateji

Hearts of Iron IV tarzında, gerçek dünya haritası üzerinde oynanan, **iki oyunculu çevrimiçi** (iki ayrı bilgisayar) bir büyük strateji oyunu. 1 Ocak 1936'da başlar, 1 Ocak 1946'da biter. Tamamen statik dosyalardan oluşur: sunucu kodu yoktur, derleme adımı yoktur, GitHub Pages üzerinde doğrudan çalışır. Arayüz Türkçedir.

- **Harita:** Natural Earth ülke sınırlarından üretilmiş 432 il (büyük ülkeler Voronoi yöntemiyle bölündü), kara komşulukları, boğaz bağlantıları, nehir geçişleri, 70 deniz bölgesi.
- **Bağlantı:** PeerJS (WebRTC) ile eşler arası. Ev sahibi simülasyonu yürütür (host-authoritative); misafir yalnız komut gönderir.
- **Tek oyunculu mod:** Yapay zekâya karşı; ikinci bilgisayar olmadan denemek için.

---

## 1. Yerelde çalıştırma

Tarayıcılar ES modüllerini ve `fetch` ile veri okumayı `file://` üzerinden engeller. Bu yüzden `index.html` dosyasına çift tıklamak yerine basit bir web sunucusu kullanın:

```bash
cd hoi-web
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000` adresini açın.

## 2. GitHub Pages'te yayınlama

1. GitHub'da yeni bir depo oluşturun (ör. `cephe1936`).
2. Bu klasörün **içeriğini** (index.html, css/, js/, data/, README.md, .nojekyll …) deponun köküne yükleyin:
   ```bash
   cd hoi-web
   git init && git add . && git commit -m "Cephe 1936"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/cephe1936.git
   git push -u origin main
   ```
   (Web arayüzünden "Add file → Upload files" ile sürükle-bırak da olur.)
3. Depoda **Settings → Pages** bölümüne gidin. "Build and deployment" altında **Source: Deploy from a branch**, **Branch: main**, klasör **/ (root)** seçip kaydedin.
4. Bir-iki dakika sonra oyun `https://KULLANICI_ADINIZ.github.io/cephe1936/` adresinde yayında olur.

`data/src/` klasöründeki ham GeoJSON dosyaları yalnızca haritayı yeniden üretmek içindir; oyun çalışırken sadece `data/world.json` okunur. İsterseniz `data/src/` klasörünü yüklemeyebilirsiniz.

## 3. Çevrimiçi oynama (iki bilgisayar)

**Ev sahibi**
1. Ana menüde komutan adınızı yazın ve **Çevrimiçi Oda Kur**'a basın.
2. Ekranda bir **oda kodu** (ör. `K7Q2M`, eş kimliği `hoiw-K7Q2M`) ve bir **davet bağlantısı** (`…/index.html?join=K7Q2M`) çıkar. Bunlardan birini arkadaşınıza gönderin.
3. Haritadan ya da listeden ülkenizi seçin. Misafirin seçimi de lobide görünür.
4. Misafir bağlanıp ülke seçince **Oyunu Başlat**.

**Misafir**
1. Davet bağlantısını açın ya da ana menüde kodu yazıp **Odaya Katıl**'a basın.
2. Ülkenizi seçin ve ev sahibinin başlatmasını bekleyin.

**Oyun sırasında**
- Zamanı (duraklat, hız 1–5) yalnız ev sahibi yönetir. Misafir ❚❚ düğmesiyle (ya da Boşluk tuşuyla) **duraklatma isteği** gönderebilir; oyun hemen durur.
- Sağ üstteki 💬 düğmesiyle **sohbet** açılır.
- **Kopma/yeniden bağlanma:** Misafirin bağlantısı koparsa oyun otomatik duraklar. Misafir aynı tarayıcıda sayfayı yenilediğinde ya da bağlantıyı yeniden açtığında aynı kimlikle (tarayıcıda saklanan jetonla) geri katılır ve **tam anlık görüntü** alır. Misafir tarafı koptuğunda her 4 saniyede bir kendiliğinden yeniden bağlanmayı dener.
- Ev sahibi tarayıcıyı kapatırsa oda kapanır. Oyun her 6 ayda bir ve dakikada bir **otomatik kaydedilir**; ev sahibi ana menüden **Son oyuna devam et** ya da **Kayıtlı Oyun Yükle → Oda kur** ile aynı oda koduyla (tarayıcıda saklanır) odayı yeniden açabilir, misafir yeniden katılır.

## 4. Kontroller

| Eylem | Kontrol |
|---|---|
| Haritayı kaydır | Sol tuşla sürükle, orta tuşla sürükle, WASD / ok tuşları |
| Yakınlaştır | Fare tekerleği, + / − |
| İl ya da tümen yığını seç | Sol tık (Shift ile seçime ekle) |
| Kutu seçimi | Shift + sol sürükle |
| Hareket emri | Seçili tümenlerle bir ile **sağ tık** (yol bulma otomatik) |
| Deniz indirmesi / nakli | Kara yolu olmayan bir kıyı iline sağ tık (başlangıç ili de kıyıda olmalı) |
| Filo hareketi | Filo sayacına tıklayın, sonra denize ya da kıyı iline sağ tık |
| Duraklat / hız | Boşluk, 1–5 |
| Seçimi temizle / paneli kapat | Esc |

Tümen sayaçları HOI4 tarzındadır: NATO sembolü (X piyade, X+tekerlek motorlu, elips zırhlı), tümen sayısı, yeşil çubuk organizasyon, beyaz çubuk güç. Kırmızı çizgiler cephe hattını, çizgili iller işgali, kırmızı daireler süren muharebeleri gösterir. "!" işareti ikmalin kesildiği birlikleri belirtir.

## 5. Oyun sistemleri

- **Zaman:** 1 Ocak 1936'dan itibaren gün gün; hız 1–5 ve duraklatma.
- **Ekonomi:** Sivil fabrikalar (tüketim malları + ticaretten arta kalanlar inşaat yapar; proje başına en çok 15 fabrika, fabrika başına günde 5 puan, altyapı hızı artırır), askerî fabrikalar ve tersaneler. İnşaat: sivil/askerî fabrika, tersane, altyapı, kara tahkimatı. Her ilin bina yuvası sınırı vardır.
- **Kaynaklar:** Çelik, petrol, alüminyum, kauçuk, tungsten, krom; gerçek dünya yataklarına göre illere dağıtılmıştır. Fethedilen ilin kaynağı fethedene geçer. **Ticaret:** her sivil fabrika dünya pazarından 8 birim kaynak getirir. Eksik kaynak ilgili üretim hattını yavaşlatır.
- **Üretim:** Askerî fabrikalar üretim hatlarına atanır (piyade teçhizatı, topçu, motorlu araç, tank, avcı, yakın destek uçağı); tersaneler gemi üretir. Hat verimliliği zamanla büyür (%10 → %50+, teknolojiyle daha yüksek). Ekipman stokta birikir.
- **Ordu:** Tabur tabanlı tümen şablonları (piyade, topçu, motorlu, tank, süvari, dağ piyadesi, tanksavar) ve şablon düzenleyici. Eğitim (30 gün) insan gücü ve ekipman harcar; tümenler seçilen ilde konuşlanır. Stoktan kendiliğinden takviye olurlar.
- **Muharebe (HOI4 benzeri):** yumuşak/sert saldırı, savunma, yarma, organizasyon, güç (can), zırh/delicilik, sertlik, cephe genişliği (ek yönlerden saldırı genişliği artırır), arazi cezaları, nehir ve boğaz geçişi, tahkimat, mevzilenme, hava üstünlüğü ve yakın hava desteği, ikmal durumu, çıkarma cezası. Organizasyonu biten savunan geri çekilir; çekilecek yeri yoksa **kuşatılmış sayılır ve teslim olur**. İkmal hattı kesilen birlikler zayıflar.
- **Savaş planı (basit):** Seçili tümenlere **Cephe tut** (kendiliğinden cepheye dağılıp savunur) ya da **Otomatik saldırı** (cepheye dağılır, kazanma ihtimali yüksek olduğunda kendiliğinden saldırır) emri verilebilir.
- **Hava:** Avcı ve yakın destek kanatları bir ile konuşlanır, 2 il çevresini kapsar; bölgesel hava üstünlüğü muharebe çarpanlarını belirler, karşılıklı yıpranma olur.
- **Deniz:** Filolar deniz bölgeleri arasında hareket eder, düşman filolarla çatışır. Deniz üstünlüğü indirmeleri ve denizaşırı ikmali belirler.
- **Araştırma:** 8 dalda 52 teknoloji (Piyade, Zırhlı, Topçu, Sanayi, Elektronik, Hava, Deniz, Doktrin), 1934–1945; zamanından önce araştırma cezası, araştırma slotları, birbirini dışlayan kara doktrinleri.
- **Siyaset:** Siyasi güç, istikrar, savaş desteği, ekonomi ve askerlik kanunları, ideolojiler (demokrasi, faşizm, komünizm, tarafsız), dünya gerginliği. **Ulusal odaklar:** genel ağaç (24 odak) + Türkiye (12), Almanya, SSCB, ABD, Birleşik Krallık, Fransa, İtalya ve Japonya'ya özel odaklar (Montrö, Hatay, Etatizm, Karabük, Balkan Antantı, Anschluss, Beş Yıllık Planlar, Yeni Düzen …).
- **Diplomasi:** İttifak kurma, davet etme, katılma isteme, ayrılma (Müttefikler, Komintern, Mihver, ya da kendi paktınız); savaş gerekçesi hazırlama → savaş ilanı (ittifak üyeleri ve kuklalar otomatik katılır); beyaz barış teklifi. **Teslimiyet ve barış:** Bir ülke çekirdek zafer puanlarının büyük kısmını kaybedince teslim olur; galipler işgal ettikleri illeri alır, kalan topraklar en çok işgal eden ülkenin kuklası olur.
- **Yapay zekâ:** Oyuncu olmayan bütün ülkeler: odak ve araştırma seçer, üretim/inşaat yapar, tümen eğitir, sınırları savunur, savaşta cepheye dağılıp hesaplı saldırır, deniz indirmesi ve hava kanadı kullanır. Büyük güçler kabaca tarihî bir takvim izler (Polonya 1939, Fransa 1940, Barbarossa 1941, Çin 1937, Pasifik 1941 …) — yalnız kendileri yapay zekâ kontrolündeyse.
- **Kayıt/Yükleme:** Tarayıcı belleğine (localStorage) en çok 6 kayıt + otomatik kayıt (yalnız ev sahibi / tek oyunculu).
- **Zafer:** Diğer oyuncunun ülkesi teslim olursa kazanırsınız; 1 Ocak 1946'da oyun biter ve en çok zafer puanına sahip oyuncu kazanır.

## 6. Basitleştirmeler

- Eyalet/il ayrımı yoktur; her il HOI4'teki bir "state" gibidir (bina yuvaları, kaynaklar, zafer puanı il düzeyinde).
- 1936 sınırları modern Natural Earth ülkelerinin birleştirilmesiyle yaklaşık olarak kuruldu (ör. SSCB, Yugoslavya, Çekoslovakya, sömürge imparatorlukları; Mançukuo Kuzeydoğu Çin'den ayrıldı). Hatay, Danzig gibi küçük sınır ayrıntıları yoktur.
- Arazi türleri bölgesel kutularla atandı; nehirler yalnız büyük nehirlerdir.
- Ekipman tek nesildir (teknolojiler modifikatör olarak uygulanır); şablon değişikliği mevcut tümenlere anında yansır.
- Hava kuvvetleri tek tip "hava üstünlüğü + yakın destek"tir; stratejik bombardıman, konvoy baskını, denizaltı savaşı yoktur. Gemiler tek bir soyut "savaş gemisi" birimidir.
- İkmal, başkente (ya da en büyük ile) kara/deniz bağlantısı olup olmadığına bakar; ikmal kapasitesi ve yakıt tüketimi yoktur.
- Barış konferansı otomatiktir (işgal edilen iller galibe, kalan topraklar kukla).
- Siyasi partiler, danışmanlar, kararlar, casusluk, lend-lease yoktur.

## 7. Bilinen sınırlamalar

- **NAT/güvenlik duvarı:** PeerJS'in ücretsiz genel eşleştirme sunucusu ve yalnız STUN kullanılır; TURN sunucusu yoktur. Bazı kurumsal/simetrik NAT ağlarında (bazı mobil hatlar) iki bilgisayar doğrudan bağlanamayabilir. Bu durumda farklı bir ağ deneyin.
- Genel PeerJS sunucusu zaman zaman yavaş ya da erişilemez olabilir; tek oyunculu mod internetsiz de çalışır (yalnız PeerJS betiği yüklenemezse çevrimiçi düğmeler uyarı verir).
- Ev sahibi kapanırsa oyun durur; misafirin elinde simülasyon yoktur (ev sahibi otoriter mimari).
- Yapay zekâ basit ve ucuzdur; tarih her oyunda farklı akar (ör. Fransa direnebilir, Çin erken düşebilir).
- Kayıtlar tarayıcıya özeldir; başka bilgisayara taşınmaz.
- Mobil/dokunmatik destek temel düzeydedir (tek parmak kaydırma, iki parmak yakınlaştırma, dokunarak seçim; sağ tık gerektiren hareket emri masaüstü içindir).
- Sis perdesi basittir: yalnız kendi ve müttefik topraklarınıza komşu illerdeki düşman birlikleri görünür.

## 8. Dosya yapısı

```
index.html            Giriş sayfası (menü, lobi, oyun ekranı)
css/style.css         Koyu askerî tema
js/main.js            Menü, lobi, oyun döngüsü, girdi, kayıt/yükleme, ağ bağlama
js/sim.js             Simülasyon: ekonomi, üretim, araştırma, odak, hareket, muharebe, hava, deniz, ikmal, savaş/barış, komutlar
js/ai.js              Yapay zekâ
js/net.js             PeerJS taşıyıcı, parçalı mesajlar, durum farkı (diff) motoru, ev sahibi/misafir oturumları, sahte taşıyıcı
js/render.js          Canvas2D harita çizimi (yalnız değişiklikte çizer)
js/ui.js              Üst çubuk, paneller, il paneli, birlik çubuğu, bildirimler
js/scenario.js        1936 senaryosu: ülkeler, kaynaklar, taburlar, kanunlar, tarihî YZ planları
js/tech.js, focus.js  Teknoloji ağacı ve ulusal odaklar
js/mapdata.js, util.js, flags.js
data/world.json       Önceden işlenmiş harita (iller, komşuluk, kenarlar, deniz bölgeleri)
data/src/*.geojson    Natural Earth ham verisi (yalnız yeniden üretim için)
tools/build_map.cjs   Harita ön işleme (node tools/build_map.cjs)
tools/test_*.mjs      Node testleri
tools/e2e_*.mjs       Playwright tarayıcı testleri
```

## 9. Geliştirme ve testler

```bash
node tools/build_map.cjs        # data/src -> data/world.json
node tools/test_sim.mjs 1500    # 1500 günlük yapay zekâ simülasyonu (performans + olay günlüğü)
node tools/test_mechanics.mjs   # savaş ilanı, deniz indirmesi, teslimiyet, barış, şablon, ticaret
node tools/test_net.mjs         # ev sahibi + misafir, sahte taşıyıcı üzerinden ağ mantığı
# Tarayıcı testleri (Playwright kurulu olmalı; önce python3 -m http.server 8765):
node tools/e2e_sp.mjs           # tek oyunculu: başlat, gün ilerlet, paneller, konsol hatası kontrolü, ekran görüntüsü
node tools/e2e_mp.mjs           # iki tarayıcı: gerçek PeerJS ile oda kur, katıl, komut, sohbet, duraklatma, yeniden bağlanma
```

Veri kaynağı: [Natural Earth](https://www.naturalearthdata.com/) (kamu malı). Ağ: [PeerJS](https://peerjs.com/) (MIT).
