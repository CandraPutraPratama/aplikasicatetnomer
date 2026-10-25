# Pembatas Judul dan Sub Judul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur pembatas Judul (misal: "APLIKASI 1") dan Sub Judul (misal: "1", "2") yang fleksibel disisipkan di sela-sela baris nomor telepon beserta tombol insert di bawah setiap baris nomor, edit judul, reorder, dan dukungan backup ekspor/impor.

**Architecture:** 
- Ekstensi model data `PhoneStore` untuk mendukung item bertipe `'header'` dan `'subheader'` selain tipe standar `'phone'`.
- Penyisipan pembatas pada posisi manapun menggunakan parameter `afterId` (`splice`).
- Pemeliharaan urutan manual sebagai default (`sortBy = 'manual'`) agar posisi pembatas tidak teracak oleh tanggal pembuatan.
- Penyesuaian kalkulasi statistik `getStats()` agar hanya menghitung nomor telepon asli (bukan pembatas).
- Desain komponen visual banner Judul & Sub Judul di `index.html` dan `css/style.css` dengan tombol aksi (Edit, Geser Atas/Bawah, Hapus).
- Tombol penyisip baris (`+ Judul` dan `+ Sub Judul`) di bawah setiap baris nomor dan pada toolbar atas.
- Integrasi Controller di `js/ui.js` dan `js/app.js` dengan modal input nama pembatas yang interaktif.
- Dukungan penuh ekspor/impor JSON dan CSV.

**Tech Stack:** Vanilla JS (ES Modules), HTML5 semantik, CSS modern (Flexbox/Grid, mobile-first), Node.js Built-in Test Runner (`node --test`).

**Spec:** Kebutuhan pengguna: Memisahkan dan mengelompokkan stok nomor per aplikasi dan per nomor urut (contoh: Judul "APLIKASI 1", Sub Judul "1", "2"). Fleksibel ditempatkan di mana saja di sela-sela nomor dengan tombol `+Judul` dan `+Sub Judul` di bawah setiap baris nomor.

---

## Global Constraints
- Tetap zero-dependency runtime (berjalan di browser tanpa build step).
- Kompatibel 100% dengan data LocalStorage yang sudah ada sebelumnya (item tanpa properti `type` dianggap `phone`).
- Responsif dan ramah jempol (*thumb-friendly*) di layar HP maupun desktop.
- Semua pengujian eksisting dan baru harus lulus 100% (`npm test`).

## Review Focus
1. Backward compatibility: Item lama di LocalStorage yang belum punya `type` harus tetap terbaca normal sebagai nomor telepon.
2. Statistik: Total Nomor dan Voucher Tersisa tidak boleh bertambah ketika pembatas Judul/Sub Judul ditambahkan.
3. Posisi Sisip: Menambahkan pembatas di bawah baris nomor tertentu harus menempatkannya tepat di bawah baris tersebut di `this.items`.
4. Backup/Restore: Ekspor JSON dan impor kembali harus menjaga urutan dan tipe pembatas tanpa data korup.
5. Search & Filter: Saat mencari atau memfilter, pembatas tidak boleh menimbulkan crash atau salah format.

---

### Task 1: Model & Storage Layer Enhancements (`store.js` + `tests/store.test.js`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/js/store.js`
- Test: `websitebisnis/aplikasicatetnomer/tests/store.test.js`

- [ ] **Step 1: Tulis tes unit untuk fungsionalitas pembatas di `tests/store.test.js`**
  - Tes `addDivider(type, title, afterId)` untuk `'header'` dan `'subheader'`.
  - Tes penyisipan di awal (`afterId = null` atau index 0), di sela-sela (`afterId = idItem`), dan di akhir.
  - Tes `updateDividerTitle(id, newTitle)` dan `deleteDivider(id)`.
  - Tes `moveItem(id, direction)` (geser naik / turun).
  - Tes `getStats()` mengabaikan pembatas dalam penghitungan nomor dan voucher.
  - Tes default sorting `'manual'` menjaga posisi indeks urutan array.
  - Tes ekspor/impor JSON dan CSV mempertahankan data pembatas.

- [ ] **Step 2: Jalankan tes untuk memastikan tes baru gagal (RED)**
  - Command: `cd websitebisnis/aplikasicatetnomer; npm test`

- [ ] **Step 3: Implementasikan logika pembatas di `js/store.js`**
  - Tambahkan method `addDivider(type, title, afterId = null)` yang membuat objek pembatas dengan `id: (type === 'header' ? 'hdr_' : 'sub_') + ...`, `type`, `title`, `createdAt`, `updatedAt` dan menyisipkannya dengan `splice` sesuai `afterId`.
  - Tambahkan method pembantu `addHeader(title, afterId = null)` dan `addSubheader(title, afterId = null)`.
  - Tambahkan `updateDividerTitle(id, newTitle)`.
  - Tambahkan `deleteDivider(id)` dengan `pushUndoSnapshot()`.
  - Tambahkan `moveItem(id, direction)` (`'up'` atau `'down'`) dengan `pushUndoSnapshot()`.
  - Perbarui `getStats()` untuk memfilter `item.type !== 'header' && item.type !== 'subheader'`.
  - Perbarui `getFiltered(searchQuery, filterStatus, sortBy = 'manual')` agar default sort `'manual'` mempertahankan urutan asli array. Jika ada query pencarian, cocokkan nomor telepon dan judul pembatas.
  - Perbarui `exportJSON()` dan `importJSON()` untuk menangani pembatas secara utuh.
  - Perbarui `exportCSV()` untuk menyertakan baris pembatas dengan format jelas.

- [ ] **Step 4: Jalankan tes kembali untuk memastikan semua tes lolos (GREEN)**
  - Command: `cd websitebisnis/aplikasicatetnomer; npm test`

---

### Task 2: UI Markup & CSS Styling (`index.html` + `css/style.css`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/index.html`
- Modify: `websitebisnis/aplikasicatetnomer/css/style.css`

- [ ] **Step 1: Perbarui `index.html`**
  - Tambahkan tombol `+ Judul` dan `+ Sub Judul` di toolbar daftar nomor / header.
  - Perbarui elemen `<select id="sortSelect">` untuk menyertakan opsi `<option value="manual" selected>📋 Urutan Posisi (Sesuai Pembatas)</option>`.
  - Tambahkan modal dialog untuk input/edit pembatas (`#dividerModal`):
    - Title dialog dinamis ("Tambah Judul", "Tambah Sub Judul", "Edit Pembatas").
    - Input text nama pembatas (`#dividerTitleInput`) dengan placeholder deskriptif.
    - Tombol Batal dan Simpan.

- [ ] **Step 2: Perbarui `css/style.css`**
  - Gaya visual untuk banner Judul (`.divider-card.divider-header`): background tegas, border kiri tebal (misal: warna indigo/cyan cerah), icon, font tebal, badge info jumlah nomor.
  - Gaya visual untuk banner Sub Judul (`.divider-card.divider-subheader`): aksen sekunder elegan (amber/emerald), font sub-judul, badge ringkas.
  - Tombol aksi pada kartu pembatas (`.divider-actions`): tombol edit nama, tombol geser naik `↑`, tombol geser turun `↓`, tombol hapus `🗑`.
  - Gaya visual untuk baris tombol penyisip di bawah setiap baris nomor (`.card-insert-bar`):
    - Tampilan minimalis, tombol `+ Judul` dan `+ Sub Judul` yang rapi dan mudah ditekan di HP tanpa membuat antarmuka terasa penuh/sesak.
  - Transisi hover & active state yang nyaman untuk jempol ponsel.

---

### Task 3: UI & Application Controller Integration (`js/ui.js` + `js/app.js`)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/js/ui.js`
- Modify: `websitebisnis/aplikasicatetnomer/js/app.js`

- [ ] **Step 1: Perbarui `js/ui.js`**
  - Tambahkan cache element modal pembatas (`dividerModal`, `dividerTitleInput`, `dividerModalTitle`, `btnConfirmDivider`).
  - Perbarui method `renderList(items, totalCount)`:
    - Jika `item.type === 'header'`, render banner Judul lengkap dengan tombol aksi dan baris penyisip `+ Judul` & `+ Sub Judul`.
    - Jika `item.type === 'subheader'`, render banner Sub Judul lengkap dengan tombol aksi dan baris penyisip.
    - Jika `item.type === 'phone'` (atau tanpa type), render kartu nomor seperti biasa DITAMBAH baris penyisip di bawahnya (`+ Judul` dan `+ Sub Judul`) membawa `data-after-id="${item.id}"`.
  - Hitung secara dinamis jumlah nomor di bawah setiap pembatas untuk ditampilkan sebagai badge (misal: "5 nomor").

- [ ] **Step 2: Perbarui `js/app.js`**
  - Simpan state sementara saat membuka modal pembatas: `pendingDividerAction: { type: 'header' | 'subheader' | 'edit', targetId: null, afterId: null }`.
  - Pasang event listener pada tombol `+ Judul` dan `+ Sub Judul`:
    - Di toolbar atas (`afterId = null` -> tambah di posisi teratas/terbawah).
    - Di bawah setiap kartu nomor/pembatas (`afterId = cardId` -> tambah tepat setelah baris tersebut).
  - Pasang event listener tombol aksi pada pembatas:
    - Edit judul (buka modal dengan teks yang sudah terisi).
    - Geser naik / turun (`store.moveItem(id, 'up' | 'down')`).
    - Hapus pembatas (`store.deleteDivider(id)`).
  - Hubungkan form submit / tombol Simpan modal pembatas ke `store` dan panggil `this.refresh()`.
  - Tambahkan shortcut keyboard (tombol Enter pada input nama pembatas untuk langsung menyimpan).

---

### Task 4: End-to-End Simulation & Verification (`tests/e2e-simulation.test.js` + Verification)

**Files:**
- Modify: `websitebisnis/aplikasicatetnomer/tests/e2e-simulation.test.js`

- [ ] **Step 1: Tambahkan skenario pengujian E2E di `tests/e2e-simulation.test.js`**
  - Skenario:
    1. Input batch nomor telepon.
    2. Sisipkan Judul "APLIKASI 1" di posisi awal.
    3. Sisipkan Sub Judul "1" di antara nomor.
    4. Sisipkan Sub Judul "2" dan Judul "APLIKASI 2".
    5. Geser posisi pembatas dan pastikan urutan berubah sesuai harapan.
    6. Verifikasi statistik nomor & voucher tetap valid.
    7. Verifikasi ekspor & impor JSON mempertahankan seluruh struktur pembatas.
    8. Verifikasi ekspor CSV memuat pembatas dengan benar.

- [ ] **Step 2: Jalankan seluruh test suite**
  - Command: `cd websitebisnis\aplikasicatetnomer; npm test`
  - Verifikasi semua suite lulus dengan 0 error.

- [ ] **Step 3: Uji manual server statis**
  - Pastikan `index.html` dan `server.js` dapat menyajikan aplikasi tanpa kendala sintaksis atau error di console browser.
