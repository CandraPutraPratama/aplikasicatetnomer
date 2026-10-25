# Aplikasi Catet Nomer & Voucher

Aplikasi web pribadi (PWA) yang cepat, ringan, dan efisien untuk mengelola daftar nomor telepon beserta 2 penanda voucher per nomor. Dibuat khusus untuk kebutuhan operasional stok nomor HP pribadi, baik di ponsel maupun di komputer.

---

## 🌟 Fitur Utama

1. **Tambah Cepat & Massal (Clipboard Friendly)**
   - Mendukung input satu atau ratusan nomor sekaligus.
   - Bisa langsung salin & tempel dari WhatsApp, Excel, atau Catatan HP.
   - Otomatis membersihkan format kotor (`+62`, `62`, strip `-`, titik, spasi, atau kurung) menjadi format nomor standar.
   - Mendeteksi dan melewati nomor duplikat secara otomatis.

2. **Dua Penanda Voucher Terpisah (V1 & V2)**
   - Setiap nomor memiliki dua tombol penanda status (`V1` dan `V2`).
   - Cukup 1 kali tap/klik untuk menandai silang (**X**) saat voucher digunakan, atau tap lagi untuk membatalkan.
   - Indikator warna kontras tinggi: **Hijau (Tersedia)** dan **Merah (Terpakai X)** agar jelas terbaca di layar HP.

3. **Aksi Massal Cepat (Bulk Actions)**
   - Checkbox pada setiap baris + **Pilih Semua (Select All)**.
   - Bar aksi melayang (*floating action bar*) yang muncul otomatis saat nomor dipilih:
     - **Tandai V1 X Massal**: Menandai voucher 1 pada semua nomor terpilih.
     - **Tandai V2 X Massal**: Menandai voucher 2 pada semua nomor terpilih.
     - **Reset X Terpilih**: Mengembalikan voucher nomor terpilih ke status tersedia.
     - **Hapus Massal**: Menghapus nomor-nomor lama sekaligus disertai konfirmasi keamanan.

4. **Reset Penanda Global**
   - Tombol **"Reset Semua X"** di toolbar atas untuk mereset seluruh penanda voucher tanpa menghapus nomor teleponnya. Mempermudah siklus perbaruan voucher.

5. **Pencarian Cepat & Filter Status**
   - Kotak pencarian nomor secara instan (*real-time search*).
   - Filter tab:
     - **Semua**: Seluruh daftar nomor.
     - **Belum Terpakai**: Nomor yang belum ditandai sama sekali (0 X).
     - **1 Terpakai (X)**: Nomor dengan 1 voucher terpakai.
     - **Habis (2 X)**: Nomor yang kedua vouchernya sudah terpakai.
   - Kartu statistik di atas: Total Nomor, Voucher Tersisa, Total Terpakai (X), dan rincian V1/V2.

6. **Penyimpanan Lokal & Backup Aman**
   - **Tersimpan Otomatis**: Menggunakan `LocalStorage` browser. Data tidak akan hilang saat browser ditutup, HP direstart, atau halaman dimuat ulang (*refresh*).
   - **Ekspor Cadangan**: Unduh cadangan dalam format **JSON** (lengkap) atau **CSV** (bisa dibuka di Excel / Google Sheets).
   - **Impor Cadangan**: Kemampuan restore data dari file JSON dengan opsi **Gabungkan (Merge)** atau **Timpa Total (Replace)**.

7. **Dukungan Mobile & PWA (Installable)**
   - Desain responsif ramah jempol (*mobile-first*).
   - Dapat diinstall langsung ke layar utama HP (*Add to Home screen*).
   - Berfungsi 100% offline tanpa internet melalui *Service Worker*.

8. **Pembatas Judul & Sub Judul (Pengelompokan Stok per Aplikasi)**
   - Bebas disisipkan di sela-sela baris nomor telepon dengan tombol `+ Judul` dan `+ Sub Judul` di bawah setiap baris nomor maupun pada toolbar atas.
   - **Judul (Header)**: Menandai aplikasi utama (misal: *APLIKASI 1*, *SHOPEE*, *DANA*), dilengkapi badge jumlah nomor yang ada di bawah bagian tersebut.
   - **Sub Judul (Subheader)**: Menandai sub-kelompok atau nomor urut (misal: *1*, *2*, *Batch A*).
   - Tombol aksi interaktif pada setiap pembatas: Ubah nama judul (Edit), Geser posisi naik/turun (↑ / ↓), dan Hapus (dilengkapi fitur Urungkan / Undo).
   - Pilihan sort **Urutan Posisi (Default)** menjaga tata letak pembatas tetap utuh.
   - Ekspor & Impor (JSON & CSV) mempertahankan seluruh struktur pembatas dan urutan nomor.

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Server Lokal (Rekomendasi untuk Akses HP & Laptop)

Pastikan Node.js sudah terpasang, lalu di terminal jalankan:

```bash
npm start
```
Atau:
```bash
node server.js
```

Terminal akan menampilkan link akses:
- **Di Laptop/PC**: Buka browser ke `http://localhost:3000`
- **Di HP (dalam jaringan WiFi yang sama)**: Buka browser HP ke `http://<IP-Laptop-Anda>:3000` (alamat IP ditampilkan otomatis di terminal).

### Opsi 2: Buka Langsung Tanpa Server
Kamu juga bisa membuka file `index.html` langsung dengan mengklik ganda file tersebut di browser (Chrome, Edge, Firefox, Safari).

---

## 📁 Struktur Kode

```
aplikasicatetnomer/
├── index.html          # Markup antarmuka utama (HTML5 semantik & aksesibel)
├── css/
│   └── style.css       # Desain antarmuka modern, high contrast, mobile-friendly
├── js/
│   ├── store.js        # State manager, normalisasi nomor, LocalStorage sync, import/export
│   ├── ui.js           # Rendering UI, modal controller, toast notifications
│   └── app.js          # Event listener, hotkeys, integrasi store & UI
├── icons/
│   └── icon.svg        # Ikon aplikasi PWA
├── manifest.json       # Konfigurasi instalasi aplikasi di HP/Desktop (PWA)
├── sw.js               # Service Worker untuk dukungan offline 100%
├── server.js           # Server lokal ringan zero-dependency
├── package.json        # Script npm start dan npm test
└── tests/
    ├── store.test.js   # Unit test logika data & LocalStorage
    ├── e2e-simulation.test.js # Test simulasi alur lengkap pengguna
    └── server.test.js  # Test pengiriman file HTTP statis
```

---

## 🧪 Menjalankan Pengujian (Testing)

Aplikasi ini dilengkapi pengujian otomatis lengkap tanpa dependensi pihak ketiga:

```bash
npm test
```
Semua 19 pengujian pada 3 berkas pengujian lulus 100%.
