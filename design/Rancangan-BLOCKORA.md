# BLOCKORA --- Rancangan Game Puzzle Offline

**Tagline:** *Place. Match. Clear. Repeat.*

## 1. Ringkasan Proyek

**BLOCKORA** adalah game puzzle kasual yang terinspirasi dari mekanisme
permainan menyusun balok seperti Block Blast. Pemain menyusun berbagai
bentuk balok pada papan berukuran 10 × 10. Baris atau kolom yang terisi
penuh akan dihapus dan menghasilkan poin.

Game dirancang agar: - Bisa dimainkan di HP Android dan laptop. - Dapat
berjalan secara offline setelah aset dan aplikasi berhasil dimuat serta
tersimpan di perangkat. - Tidak membutuhkan akun, server, database
online, atau layanan berbayar. - Memiliki tiga mode permainan: Classic,
Time Challenge, dan Daily Challenge. - Menggunakan identitas visual dan
aset orisinal milik BLOCKORA.

> Catatan: BLOCKORA menggunakan mekanisme puzzle balok secara umum
> sebagai inspirasi. Nama, logo, ilustrasi, suara, dan tampilan harus
> dibuat sendiri, bukan menyalin aset atau identitas merek game lain.

## 2. Tujuan

1.  Menghasilkan game puzzle yang ringan dan mudah dimainkan.
2.  Memberikan pengalaman bermain yang nyaman pada layar sentuh maupun
    mouse.
3.  Menyediakan tantangan dengan tingkat variasi berbeda.
4.  Menyimpan skor dan statistik secara lokal di perangkat.
5.  Menjadi proyek portofolio yang dapat dikembangkan secara bertahap.

## 3. Target Platform

  Platform         Dukungan
  ---------------- ------------------------------------------------------
  Android          Browser modern; dapat dipasang sebagai PWA
  Laptop/Desktop   Browser modern
  Offline          Ya, setelah proses pemuatan awal dan caching selesai

**PWA (Progressive Web App)** adalah website yang dapat dipasang seperti
aplikasi. Service Worker menyimpan file penting agar aplikasi dapat
dibuka kembali tanpa internet.

## 4. Teknologi yang Digunakan

  -----------------------------------------------------------------------
  Teknologi                           Fungsi
  ----------------------------------- -----------------------------------
  HTML                                Struktur halaman aplikasi

  CSS                                 Tampilan menu dan elemen antarmuka

  JavaScript                          Logika permainan

  Phaser.js                           Rendering game, input, animasi, dan
                                      pengelolaan scene

  Vite                                Menjalankan server pengembangan dan
                                      membuat build produksi

  LocalStorage                        Menyimpan pengaturan dan data
                                      sederhana

  IndexedDB                           Menyimpan statistik atau riwayat
                                      permainan yang lebih besar

  PWA + Service Worker                Instalasi dan dukungan offline

  GitHub Pages                        Hosting gratis untuk versi web
  -----------------------------------------------------------------------

Tidak diperlukan backend atau API berbayar untuk versi pertama.

### Alasan memilih Phaser.js

Phaser.js merupakan framework JavaScript untuk membuat game 2D berbasis
browser. Framework ini menangani tampilan objek, input, animasi, dan
siklus permainan sehingga pengembangan game puzzle lebih terstruktur.

## 5. Konsep Visual dan Identitas

**Nama:** BLOCKORA\
**Tagline:** Place. Match. Clear. Repeat.

Arah desain: - Modern, minimalis, dan bersih. - Latar belakang putih
atau abu-abu sangat muda. - Balok menggunakan beberapa warna yang
harmonis. - Sudut kotak sedikit membulat. - Tipografi sederhana dan
mudah dibaca. - Animasi singkat saat balok ditempatkan dan baris/kolom
dihapus. - Tombol dan area sentuh cukup besar untuk pengguna HP. - Fokus
utama layar permainan adalah papan 10 × 10.

## 6. Mekanisme Permainan Utama

### 6.1 Papan permainan

-   Papan terdiri dari 10 kolom dan 10 baris.
-   Total terdapat 100 sel.
-   Sel kosong dapat ditempati oleh bagian balok.
-   Sel yang sudah terisi tidak dapat ditempati kembali sebelum baris
    atau kolomnya terhapus.

Contoh inisialisasi papan menggunakan JavaScript:

``` js
const board = Array.from(
  { length: 10 },
  () => Array(10).fill(0)
);
```

Nilai `0` berarti sel kosong. Sel yang terisi dapat menggunakan nilai
atau kode warna tertentu.

### 6.2 Bentuk balok

Pemain mendapatkan tiga pilihan balok pada satu waktu. Bentuk balok
dapat berupa: - Kotak kecil. - Garis lurus. - Bentuk L. - Bentuk T. -
Bentuk Z. - Bentuk lainnya yang sesuai dengan desain game.

Contoh data bentuk balok garis:

``` js
const line = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0]
];
```

Contoh data bentuk balok L:

``` js
const shapeL = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 2]
];
```

Koordinat tersebut menunjukkan posisi setiap kotak dalam satu bentuk
balok.

### 6.3 Drag and drop

Alur interaksi: 1. Pemain memilih salah satu dari tiga balok. 2. Pemain
menggeser balok ke papan menggunakan jari atau mouse. 3. Game
menampilkan pratinjau posisi balok (*placement preview*). 4. Jika posisi
valid, balok mengikuti posisi sel pada papan. 5. Pemain melepas balok
untuk menempatkannya. 6. Jika posisi tidak valid, balok kembali ke
tempat semula.

Posisi dinyatakan valid jika: - Seluruh bagian balok berada di dalam
papan. - Tidak ada bagian balok yang menimpa sel yang sudah terisi.

Untuk perangkat HP, input sentuh harus dibuat nyaman dan halaman tidak
boleh ikut bergulir secara tidak sengaja ketika pemain sedang menggeser
balok.

### 6.4 Menghapus baris dan kolom

Setelah balok ditempatkan: 1. Periksa seluruh baris. 2. Jika satu baris
terisi penuh, hapus semua sel pada baris tersebut. 3. Periksa seluruh
kolom. 4. Jika satu kolom terisi penuh, hapus semua sel pada kolom
tersebut. 5. Perbarui skor dan animasikan sel yang terhapus.

Baris dan kolom yang penuh dapat terhapus dalam satu giliran. Sistem
harus menghitung seluruh baris dan kolom yang selesai pada penempatan
tersebut.

### 6.5 Pergantian balok

-   Tiga balok ditampilkan pada area pilihan.
-   Pemain bebas menggunakan balok yang tersedia.
-   Setelah ketiga balok digunakan, game membuat tiga balok baru.
-   Balok baru dipilih secara acak pada Classic dan Time Challenge.
-   Daily Challenge menggunakan pola atau urutan yang ditentukan dari
    tanggal agar tantangannya konsisten pada tanggal yang sama.

### 6.6 Game Over

Permainan berakhir jika tidak ada satu pun balok yang tersedia yang
dapat ditempatkan pada posisi mana pun di papan.

Layar hasil menampilkan: - Skor akhir. - Skor terbaik. - Jumlah baris
yang dihapus. - Tombol main lagi. - Tombol kembali ke menu.

## 7. Mode Permainan

### 7.1 Classic Mode

Mode permainan utama tanpa batas waktu.

Fitur: - Tidak menggunakan timer. - Pemain bermain sampai tidak ada
balok yang dapat ditempatkan. - Skor bertambah berdasarkan balok yang
ditempatkan dan baris/kolom yang dihapus. - Tersedia skor terbaik (*high
score*). - Tersedia tombol pause dan restart.

Tujuan mode ini adalah memperoleh skor setinggi mungkin.

### 7.2 Time Challenge

Mode permainan dengan batas waktu.

Rancangan awal: - Durasi permainan: 120 detik. - Pemain harus
mengumpulkan poin sebanyak mungkin. - Poin didapat dari penempatan balok
dan penghapusan baris/kolom. - Permainan berakhir saat waktu habis. -
Hasil terbaik disimpan secara lokal.

Durasi dan sistem poin dapat disesuaikan setelah pengujian permainan.

### 7.3 Daily Challenge

Mode tantangan harian dengan target khusus.

Contoh target: - Mendapatkan skor minimal 500. - Menghapus 10 baris atau
kolom. - Menyelesaikan target dalam jumlah langkah tertentu.

Ketentuan: - Tantangan ditentukan berdasarkan tanggal lokal perangkat. -
Gunakan *seed* acak yang berasal dari tanggal agar susunan tantangan
pada hari yang sama konsisten. - Simpan hasil dan progres di
perangkat. - Tantangan berganti ketika tanggal berubah. - Tidak
membutuhkan server atau koneksi internet.

**Catatan:** Karena tanggal mengikuti perangkat, pengguna yang mengubah
tanggal HP dapat memengaruhi pergantian tantangan. Untuk versi offline
tanpa server, hal ini merupakan batasan yang perlu diterima.

## 8. Sistem Skor

Nilai awal yang dapat digunakan untuk pengujian:

  Aksi                                                                  Poin
  ------------------------------------- ------------------------------------
  Setiap satu sel balok ditempatkan                                       +1
  Menghapus satu baris penuh                                             +10
  Menghapus satu kolom penuh                                             +10
  Bonus menghapus dua garis sekaligus                                    +20
  Combo                                   Bonus tambahan sesuai aturan combo

Aturan combo perlu ditentukan secara konsisten. Contohnya, pemain
memperoleh bonus jika berhasil menghapus garis pada beberapa giliran
berturut-turut.

Nilai di atas adalah rancangan awal dan sebaiknya disesuaikan melalui
playtesting agar permainan tetap seimbang.

## 9. Halaman dan Tampilan Aplikasi

### 9.1 Main Menu

Berisi: - Logo BLOCKORA. - Tombol Classic Mode. - Tombol Time
Challenge. - Tombol Daily Challenge. - Tombol Statistics. - Tombol
Settings.

### 9.2 Game Screen

Berisi: - Nama mode. - Skor saat ini. - Timer, khusus Time Challenge. -
Papan 10 × 10. - Tiga balok yang dapat dipilih. - Tombol pause atau
kembali.

### 9.3 Game Over / Result

Berisi: - Skor akhir. - Skor terbaik. - Statistik singkat permainan. -
Tombol Play Again. - Tombol Main Menu.

### 9.4 Daily Challenge

Berisi: - Tanggal tantangan. - Deskripsi target. - Indikator progres. -
Status selesai atau belum selesai. - Hasil tantangan hari tersebut.

### 9.5 Statistics

Berisi data seperti: - Total permainan. - Skor terbaik Classic. - Skor
terbaik Time Challenge. - Total garis yang dihapus. - Jumlah Daily
Challenge yang diselesaikan.

### 9.6 Settings

Berisi: - Pengaturan suara. - Pengaturan musik. - Pilihan getaran jika
didukung perangkat. - Informasi aplikasi. - Tombol reset data lokal
dengan konfirmasi.

## 10. Penyimpanan Data

Data disimpan di perangkat pengguna, bukan di server.

  Data                       Penyimpanan yang disarankan
  -------------------------- -----------------------------
  Pengaturan suara           LocalStorage
  Skor terbaik               LocalStorage
  Statistik permainan        IndexedDB
  Riwayat Daily Challenge    IndexedDB
  Progres tantangan harian   IndexedDB

Konsekuensi penyimpanan lokal: - Data tidak otomatis tersinkronisasi
antara HP dan laptop. - Menghapus data browser dapat menghapus data
permainan. - Data tidak otomatis tersedia di perangkat lain.

## 11. Dukungan Offline dan Instalasi

Agar BLOCKORA dapat dimainkan offline: 1. Buat file manifest PWA. 2.
Buat Service Worker. 3. Cache file HTML, CSS, JavaScript, aset gambar,
suara, dan file penting lainnya. 4. Pastikan seluruh aset game dapat
dimuat dari cache. 5. Uji aplikasi dengan mematikan koneksi internet
setelah proses pemuatan awal selesai.

Pengguna dapat memasang aplikasi melalui browser yang mendukung
instalasi PWA.

**Penting:** Kunjungan pertama tetap membutuhkan internet jika aplikasi
diakses dari hosting online. Setelah file aplikasi berhasil dimuat dan
tersimpan di cache, game dapat dibuka kembali secara offline. Jangan
menganggap mode offline sudah berfungsi sebelum pengujian dilakukan.

## 12. Struktur Folder Proyek

Struktur yang disarankan:

``` text
blockora/
│
├── public/
│   ├── assets/
│   │   ├── images/
│   │   ├── sounds/
│   │   └── icons/
│   ├── manifest.json
│   └── favicon.ico
│
├── src/
│   ├── main.js
│   ├── style.css
│   │
│   ├── game/
│   │   ├── config.js
│   │   ├── constants.js
│   │   │
│   │   ├── scenes/
│   │   │   ├── BootScene.js
│   │   │   ├── MenuScene.js
│   │   │   ├── GameScene.js
│   │   │   ├── ResultScene.js
│   │   │   └── SettingsScene.js
│   │   │
│   │   ├── objects/
│   │   │   ├── Board.js
│   │   │   ├── Block.js
│   │   │   └── BlockTray.js
│   │   │
│   │   ├── systems/
│   │   │   ├── BoardSystem.js
│   │   │   ├── BlockSystem.js
│   │   │   ├── ScoreSystem.js
│   │   │   ├── DragSystem.js
│   │   │   ├── ClearSystem.js
│   │   │   ├── TimerSystem.js
│   │   │   └── DailyChallenge.js
│   │   │
│   │   └── utils/
│   │       ├── Random.js
│   │       └── DateHelper.js
│   │
│   ├── storage/
│   │   ├── StorageManager.js
│   │   └── StatisticsManager.js
│   │
│   └── ui/
│       ├── MenuUI.js
│       ├── HUD.js
│       └── Modal.js
│
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

Struktur ini dapat disederhanakan pada tahap awal. Folder dan file
tambahan dibuat ketika fitur terkait mulai dikerjakan.

## 13. Tahapan Pengembangan

  -----------------------------------------------------------------------
  Tahap                   Pekerjaan               Hasil
  ----------------------- ----------------------- -----------------------
  1\. Setup               Membuat proyek Vite,    Proyek dapat dijalankan
                          memasang Phaser,        
                          menyiapkan konfigurasi  
                          dan ukuran layar        

  2\. Core Gameplay       Membuat papan 10 × 10,  Balok dapat dimainkan
                          bentuk balok, balok     
                          acak, drag and drop,    
                          validasi posisi         

  3\. Game Mechanics      Membuat penghapusan     Permainan inti selesai
                          baris/kolom, skor,      
                          combo, game over,       
                          restart                 

  4\. Game Modes          Membuat Classic, Time   Tiga mode dapat
                          Challenge, dan Daily    dimainkan
                          Challenge               

  5\. UI dan Storage      Membuat menu, hasil,    Aplikasi lebih lengkap
                          statistik, pengaturan,  
                          penyimpanan data        

  6\. Polish              Menambahkan animasi,    Game lebih nyaman
                          suara, responsivitas,   
                          dan perbaikan           
                          pengalaman pengguna     

  7\. Offline dan         Menambahkan PWA,        Game dapat dipasang dan
  Deployment              Service Worker, menguji dimainkan offline
                          offline, dan deploy ke  
                          GitHub Pages            
  -----------------------------------------------------------------------

Perkiraan pengerjaan sekitar 3--5 minggu, bergantung pada waktu belajar,
kompleksitas fitur, dan jumlah pengujian.

## 14. Persiapan Proyek

Pastikan Node.js sudah terpasang. Kemudian jalankan perintah berikut di
terminal VS Code:

``` bash
npm create vite@latest blockora -- --template vanilla

cd blockora

npm install

npm install phaser

npm run dev
```

Setelah server pengembangan berjalan, buka alamat lokal yang ditampilkan
di terminal.

## 15. Checklist Pengembangan

### Persiapan

-   [ ] Membuat folder proyek BLOCKORA.
-   [ ] Membuat proyek Vite.
-   [ ] Memasang Phaser.js.
-   [ ] Menyiapkan struktur folder.
-   [ ] Menentukan warna, tipografi, dan gaya visual.

### Gameplay inti

-   [ ] Membuat papan 10 × 10.
-   [ ] Membuat bentuk-bentuk balok.
-   [ ] Menampilkan tiga balok pilihan.
-   [ ] Membuat drag and drop dengan mouse.
-   [ ] Membuat drag and drop dengan sentuhan HP.
-   [ ] Membuat validasi posisi balok.
-   [ ] Membuat pratinjau posisi balok.
-   [ ] Membuat sistem penghapusan baris.
-   [ ] Membuat sistem penghapusan kolom.
-   [ ] Membuat sistem skor.
-   [ ] Membuat sistem combo.
-   [ ] Membuat sistem pergantian balok.
-   [ ] Membuat kondisi game over.
-   [ ] Membuat restart permainan.

### Mode permainan

-   [ ] Membuat Classic Mode.
-   [ ] Membuat Time Challenge.
-   [ ] Membuat Daily Challenge.
-   [ ] Membuat sistem target tantangan harian.
-   [ ] Menyimpan hasil setiap mode.

### Tampilan dan data

-   [ ] Membuat Main Menu.
-   [ ] Membuat Game Screen.
-   [ ] Membuat Result Screen.
-   [ ] Membuat halaman Statistics.
-   [ ] Membuat halaman Settings.
-   [ ] Menyimpan high score.
-   [ ] Menyimpan statistik permainan.
-   [ ] Menambahkan konfirmasi reset data.

### Offline dan pengujian

-   [ ] Membuat manifest PWA.
-   [ ] Membuat Service Worker.
-   [ ] Menambahkan caching untuk seluruh aset penting.
-   [ ] Menguji tampilan pada HP Android.
-   [ ] Menguji tampilan pada laptop.
-   [ ] Menguji kontrol sentuh.
-   [ ] Menguji seluruh mode permainan.
-   [ ] Menguji aplikasi setelah internet dimatikan.
-   [ ] Memastikan tidak ada aset penting yang gagal dimuat saat
    offline.
-   [ ] Deploy versi web ke GitHub Pages.

## 16. Kriteria Selesai Versi Pertama (MVP)

Versi pertama BLOCKORA dapat dianggap selesai jika: 1. Game berjalan di
browser HP dan laptop. 2. Papan 10 × 10 berfungsi. 3. Pemain dapat
menempatkan balok dengan mouse dan sentuhan. 4. Sistem validasi posisi
bekerja dengan benar. 5. Baris dan kolom penuh dapat dihapus. 6. Skor
dan kondisi game over bekerja. 7. Classic Mode dapat dimainkan dari awal
sampai selesai. 8. Skor terbaik tersimpan secara lokal. 9. Aplikasi
dapat dibuka kembali secara offline setelah caching berhasil.

Setelah MVP stabil, lanjutkan ke Time Challenge, Daily Challenge,
statistik, animasi, dan penyempurnaan visual.

## 17. Catatan Pengembangan

-   Bangun fitur secara bertahap dan uji setiap bagian sebelum
    melanjutkan.
-   Jangan membuat semua fitur sekaligus dalam satu tahap.
-   Prioritaskan gameplay inti sebelum animasi dan dekorasi.
-   Pastikan game tetap ringan pada HP Android.
-   Gunakan aset buatan sendiri atau aset yang lisensinya mengizinkan
    penggunaan.
-   Simpan proyek secara rutin di GitHub.
-   Uji permainan dengan beberapa ukuran layar dan kondisi perangkat.
-   Jangan menambahkan login, backend, atau fitur online jika belum ada
    kebutuhan yang jelas.

------------------------------------------------------------------------

**Ringkasan:** BLOCKORA adalah game puzzle balok 10 × 10 berbasis
JavaScript dan Phaser.js, dengan tiga mode permainan, penyimpanan lokal,
serta dukungan PWA agar dapat dipasang dan dimainkan offline setelah
proses caching awal selesai.
