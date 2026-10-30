# UI Enhancement, Tampilan Nomor Lengkap & Fleksibilitas Input Nomor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki tampilan aplikasi Catet Nomer agar lebih modern, rapi, dan nyaman dilihat, memastikan seluruh nomor telepon selalu terlihat penuh tanpa terpotong di layar HP/mobile, serta melonggarkan parsing/validasi nomor agar menerima semua format/panjang nomor tanpa ditolak.

**Architecture:**
- **Store & Data Layer (`js/store.js`):** Menghapus restriksi ketat `/^\d{8,16}$/` dan awalan wajib `+62|62|0` agar semua nomor (nomor pendek, nomor panjang, nomor luar negeri, kode uji/dummy, dll.) diterima dengan baik, tetap menormalkan format jika diawali `+62`/`62`, dan membersihkan simbol format.
- **Card UI & Layout (`js/ui.js` & `css/style.css`):** Mengubah tata letak kartu nomor telepon (`phone-card`) menjadi struktur responsif yang lapang (misal baris atas: checkbox + nomor HP lengkap + tombol salin + tombol hapus; baris bawah: status voucher + tombol aksi V1 dan V2). Nomor HP tidak lagi mengalami ellipsis (`overflow: hidden; text-overflow: ellipsis`) yang terhimpit oleh tombol voucher di layar kecil.
- **Header & Toolbar Polish (`index.html` & `css/style.css`):** Memperbaiki `.list-toolbar` agar elemen `Pilih Semua`, penghitung nomor, dan tombol aksi teratas (`+ Judul`, `+ Sub Judul`, `Reset Semua X`) tidak saling bertumpukan/tergencet menjadi 3 baris jelek. Menghilangkan duplikasi tanda plus ("+ + Judul" -> "+ Judul").
- **UI Design System Upgrade:** Mempercantik palet tema gelap, tipografi, kartu statistik, filter pills, pembatas judul/sub judul, dan modal agar tampak modern, elegan, dan profesional.

**Tech Stack:** Vanilla JavaScript (ES Modules), HTML5 semantik, CSS3 modern (Flexbox, Grid, CSS Variables), Node.js Test Runner (`node --test`).

**Spec:** Kebutuhan pengguna:
1. Tampilan lebih enak dilihat (desain bersih, modern, rapi, tidak bertumpuk).
2. Nomor telepon terlihat semua (tidak terpotong `081236...` seperti pada screenshot).
3. Tidak ada penolakan validasi nomor (menerima semua nomor tanpa batasan format/panjang kaku).

---

## Global Constraints
- Zero-dependency runtime (berjalan langsung di browser tanpa build step atau bundler).
- Kompatibilitas mundur dengan data yang sudah tersimpan di `localStorage`.
- Semua pengujian eksisting dan baru harus lulus 100% (`npm test`).
- Responsif mobile-first, ramah sentuhan (touch target minimum 36-44px).

## Review Focus
1. Nomor panjang (misal 15-20 digit) dan nomor pendek (misal 3-5 digit) tetap terlihat utuh dan tidak terpotong di layar selebar 320px - 400px.
2. Input nomor apapun (seperti `12345`, `08000`, `9999999999999999`, `+12025550123`) berhasil tersimpan dan tidak ditolak dengan pesan error "nomor tidak valid".
3. Toolbar atas tidak lagi patah atau menumpuk teks "Pilih Semua" secara vertikal.
4. Tombol tambah judul tidak lagi memunculkan icon plus ganda ("+ + Judul").
5. Fitur eksisting (toggle voucher, salin, multi-select, undo, filter pencarian, ekspor/impor) tetap berfungsi dengan sempurna.

---

### Task 1: Relax Number Validation & Format Handling (`store.js` + `tests/store.test.js`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/js/store.js`
- Modify: `websitebisnis/aplikasicatetnomer/tests/store.test.js`

- [ ] **Step 1: Tambahkan pengujian untuk nomor fleksibel di `tests/store.test.js`**
  - Uji penambahan nomor pendek (misal `12345`, `0811`), nomor panjang (>16 digit), nomor luar negeri (`+12025550123`), dan nomor dummy (`000000`).
  - Uji impor JSON dengan berbagai panjang nomor.
  - Pastikan nomor non-digit murni (seperti `invalid-text-here`) tetap diabaikan jika tidak ada digit sama sekali.

- [ ] **Step 2: Jalankan tes untuk memverifikasi kegagalan (RED)**
  - Command: `npm test`

- [ ] **Step 3: Perbaiki `parseRawNumbers` dan `importJSON` di `js/store.js`**
  - Di `parseRawNumbers`: jika baris/token memiliki digit, ekstrak nomornya tanpa batasan panjang `{8,16}`. Normalisasi awalan `+62`/`62` jika ada, bersihkan pemisah format (`-`, `.`, spasi, kurung).
  - Di `importJSON`: terima item phone selama memiliki karakter digit, tanpa filter kaku `/^\d{8,16}$/`.
  - Pastikan `addNumbers` menerima semua nomor yang diparsing.

- [ ] **Step 4: Jalankan tes untuk memastikan semuanya lulus (GREEN)**
  - Command: `npm test`

---

### Task 2: Redesign Card Layout to Prevent Number Truncation (`js/ui.js` & `css/style.css`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/js/ui.js`
- Modify: `websitebisnis/aplikasicatetnomer/css/style.css`

- [ ] **Step 1: Perbarui struktur HTML kartu nomor pada `js/ui.js`**
  - Susun ulang elemen di dalam `phone-card`:
    - Baris Header Kartu: Checkbox baris + Kontainer Nomor HP Lengkap (dengan tombol salin langsung di sampingnya) + Tombol Hapus (sampah) di pojok kanan atas.
    - Baris Aksi Kartu: Indikator status voucher ("2 Voucher Siap" / "1 Voucher Siap" / "Semua Terpakai") di sisi kiri, dan tombol voucher V1 & V2 di sisi kanan.
  - Pastikan tombol salin dan status voucher tetap responsif.

- [ ] **Step 2: Perbarui CSS untuk `phone-card` di `css/style.css`**
  - Ubah `.phone-card` menjadi layout vertikal/grid atau flex multi-baris yang rapi.
  - Hapus atau sesuaikan properti `text-overflow: ellipsis; overflow: hidden;` pada `.phone-number` agar nomor telepon ditampilkan secara utuh (`white-space: nowrap; word-break: keep-all; font-variant-numeric: tabular-nums`).
  - Berikan styling tombol voucher V1 & V2 yang proporsional, ramah jempol, dan modern.
  - Pastikan di layar sempit (320px - 400px seperti di screenshot) nomor telepon tampil lebar tanpa hambatan ruang dari tombol voucher.

---

### Task 3: Polish Toolbar, Header Controls & Section Dividers (`index.html`, `css/style.css`, `js/ui.js`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/index.html`
- Modify: `websitebisnis/aplikasicatetnomer/css/style.css`
- Modify: `websitebisnis/aplikasicatetnomer/js/ui.js`

- [ ] **Step 1: Perbaiki tombol dan markup di `index.html`**
  - Hapus karakter `+` berlebih pada tombol `btnAddHeaderTop` dan `btnAddSubheaderTop` (ganti `<span>+ Judul</span>` dengan `<span>Judul</span>` karena sudah ada ikon SVG plus).
  - Rapikan layout `.list-toolbar` agar terbagi dengan seimbang antara info/seleksi dan aksi cepat.
  - Perbarui hint teks pada modal tambah nomor agar menegaskan bahwa semua jenis nomor dapat diterima.

- [ ] **Step 2: Perbaiki layout `.list-toolbar` dan `.list-quick-actions` di `css/style.css`**
  - Definisikan `.list-quick-actions` dengan flex row, gap yang teratur, dan wrapping yang fleksibel.
  - Berikan gaya tombol yang lebih ramping dan rapi untuk aksi cepat (`+ Judul`, `+ Sub Judul`, `Reset Semua X`).
  - Cegah teks "Pilih Semua" dan "Menampilkan X nomor" terlipat menjadi tumpukan teks canggung.

- [ ] **Step 3: Percantik gaya pembatas Judul, Sub Judul, dan inline insert strip**
  - Buat visual pembatas `Judul` (header) dan `Sub Judul` (subheader) lebih elegan dengan aksen border halus dan badge modern.
  - Buat tombol sisip inline (`+ Judul`, `+ Sub Judul`) lebih subtle dan tidak mengganggu alur visual daftar nomor.

---

### Task 4: Visual Polish & Theme Elevation (`css/style.css`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/css/style.css`

- [ ] **Step 1: Perbaiki kartu statistik di bagian atas**
  - Tambahkan efek hover halus, perbaiki kontras teks label dan angka statistik, perhalus sudut kartu (`border-radius: 12px`).
  - Atur tipografi angka menggunakan tabular-nums dengan warna kontras yang tajam dan nyaman.

- [ ] **Step 2: Perbaiki pencarian, dropdown pengurutan, dan filter pills**
  - Berikan styling input pencarian yang lebih modern dengan efek fokus bercahaya lembut (*subtle blue glow*).
  - Rapikan padding filter pills agar nyaman digulir secara horizontal di HP tanpa terpotong kaku.

- [ ] **Step 3: Sempurnakan modal dialog & toast feedback**
  - Tingkatkan desain modal agar tampil seperti modern bottom-sheet atau dialog di HP dengan latar blur lembut (`backdrop-filter: blur(8px)`).
  - Perjelas tombol aksi primer, sekunder, dan bahaya.

---

### Task 5: Testing, Verification & Regression Check

**Files:**
- Test: `tests/store.test.js`
- Test: `tests/e2e-simulation.test.js`
- Test: `tests/server.test.js`

- [ ] **Step 1: Jalankan seluruh suite tes unit dan integrasi**
  - Command: `npm test`
  - Pastikan seluruh 30+ tes lulus tanpa error.

- [ ] **Step 2: Lakukan simulasi E2E pengujian nomor bebas validasi dan tampilan responsif**
  - Uji penambahan berbagai variasi nomor: angka pendek `12345`, `081`, nomor panjang 20 digit, nomor internasional, dummy string dengan angka.
  - Verifikasi bahwa semuanya tersimpan dan ter-render dengan nomor utuh di UI.

- [ ] **Step 3: Review visual akhir dan commit perubahan**
  - Pastikan tidak ada visual bug, clipping teks, atau error di konsol browser.

