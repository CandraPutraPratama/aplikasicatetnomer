# Aplikasi Catet Nomer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web pribadi (PWA) yang cepat, ringan, dan responsif untuk mengelola daftar nomor telepon beserta dua penanda voucher (V1 & V2), mendukung input massal, penandaan instan, reset massal, hapus massal, pencarian/filter, serta penyimpanan persisten dengan export/import.

**Architecture:** Client-side Single Page Application (SPA) modular berbasis Vanilla HTML5, CSS3, dan ES6 JavaScript dengan LocalStorage persistence dan PWA manifest/service-worker untuk offline use di HP & desktop.

**Tech Stack:** HTML5, CSS3 (Modern responsive flex/grid, mobile safe-area), JavaScript (ES Modules), LocalStorage API, Node.js built-in test runner (`node --test`).

**Spec:** Dokumen permintaan user (7 fitur utama: Tambah Cepat/Massal, Penanda Status V1/V2, Hapus Massal, Reset Massal, Pencarian & Filter, Antarmuka Mobile/Desktop, Penyimpanan LocalStorage + Backup Export/Import).

## Global Constraints

- Standalone: Berjalan langsung di browser tanpa instalasi backend database yang rumit.
- Responsif: Ramah jempol di HP (touch targets >= 44px) dan nyaman digunakan di desktop.
- Kecepatan & Ketahanan: Persistensi otomatis ke LocalStorage; data tidak boleh hilang saat refresh atau tutup browser.
- Higienis: Tidak ada styling slop/gradient berlebihan; tipografi angka tabular (`tabular-nums`); dialog konfirmasi untuk aksi destruktif.

## Review Focus

1. Parsing nomor telepon kotor dari clipboard (format campuran: spasi, strip, +62, awalan 62, 08, newline, koma, duplikat).
2. Reset voucher massal parsial vs total (hanya mereset item terpilih atau seluruh nomor).
3. Hapus massal dengan konfirmasi jelas (mencegah ketidaksengajaan hilang stok).
4. Penanganan kuota atau format data saat import JSON (validasi skema sebelum menimpa state).
5. Kinerja rendering saat daftar nomor mencapai ratusan nomor (DOM update yang efisien tanpa re-render penuh yang membuat patah-patah).

---

### Task 1: Core Store & Data Layer with Unit Tests

**Files:**
- Create: `js/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: LocalStorage API (atau memory storage fallback untuk environment test)
- Produces: `PhoneStore` class dengan method:
  - `parseRawNumbers(input: string): string[]`
  - `addNumbers(rawText: string): { added: number, duplicates: number }`
  - `toggleVoucher(id: string, voucherIndex: 1 | 2): boolean`
  - `deleteNumbers(ids: string[]): number`
  - `resetVouchers(ids?: string[]): number`
  - `getFiltered(searchQuery: string, filterStatus: string): PhoneItem[]`
  - `getStats(): { totalNumbers: number, v1Used: number, v2Used: number, totalVouchersUsed: number, totalVouchersAvailable: number }`
  - `exportData(): string` (JSON string)
  - `exportCSV(): string`
  - `importData(jsonString: string, mode: 'merge' | 'replace'): { imported: number, skipped: number }`

- [ ] **Step 1: Write unit tests in `tests/store.test.js`**
- [ ] **Step 2: Run test with `node --test tests/store.test.js` to verify it fails**
- [ ] **Step 3: Implement `PhoneStore` in `js/store.js`**
- [ ] **Step 4: Run test with `node --test tests/store.test.js` to verify it passes**
- [ ] **Step 5: Git commit**

---

### Task 2: Responsive UI Skeleton & Layout (HTML5 + CSS3)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Consumes: Semantic HTML5, CSS custom properties, responsive breakpoints
- Produces: Layout aplikasi lengkap:
  - Header: Judul aplikasi, status penyimpanan, tombol Backup/Restore, tombol Tambah Nomor
  - Stats Cards: Total Nomor, V1 Digunakan, V2 Digunakan, Status Stok
  - Search & Filter Bar: Input pencarian real-time, filter pill (Semua, Belum Ditandai, 1 X, 2 X)
  - Selection Control Bar: Checkbox Pilih Semua, Jumlah Terpilih, Tombol Aksi Massal (Tandai V1, Tandai V2, Reset X, Hapus)
  - Phone List Container: Tampilan kartu/baris dengan nomor (tabular font), badge V1 & V2 yang mudah di-tap, tombol hapus tunggal
  - Empty State: Ilustrasi & pesan jika belum ada data atau filter kosong
  - Modals:
    - Modal Tambah Nomor (Paste massal / satu-satu)
    - Modal Konfirmasi Hapus Massal
    - Modal Konfirmasi Reset Massal
    - Modal Backup & Restore (Export JSON/CSV, Import file/paste JSON)
    - Toast Notification container

- [ ] **Step 1: Write `index.html` structure**
- [ ] **Step 2: Write modern, responsive, mobile-first styling in `css/style.css`**
- [ ] **Step 3: Verify visually and inspect DOM elements**
- [ ] **Step 4: Git commit**

---

### Task 3: UI Controller & Interactivity (JavaScript)

**Files:**
- Create: `js/ui.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `PhoneStore` from `js/store.js`
- Produces:
  - Event binding untuk tap/click pada indikator V1 dan V2
  - Selection management (pilih satu per satu, shift-select, pilih semua)
  - Bulk action toolbar yang muncul/sticky saat ada item terpilih
  - Real-time search dan filter switching
  - Modal workflows (Tambah Massal, Konfirmasi Hapus, Konfirmasi Reset, Import/Export)
  - Toast notifications untuk umpan balik instan
  - Keyboard shortcuts (Esc tutup modal, Ctrl+V langsung prompt tambah, / untuk fokus pencarian)

- [ ] **Step 1: Implement UI rendering & event listeners in `js/ui.js`**
- [ ] **Step 2: Implement app bootstrap and glue in `js/app.js`**
- [ ] **Step 3: Verify complete end-to-end functionality in browser**
- [ ] **Step 4: Git commit**

---

### Task 4: PWA Support (Manifest & Service Worker) & Verification

**Files:**
- Create: `manifest.json`
- Create: `sw.js`
- Create: `icons/icon-192.png`, `icons/icon-512.png` (atau generated SVG/Canvas icons)
- Test: End-to-end verification of all buttons, filters, storage persistence, and export/import.

**Interfaces:**
- Consumes: Service Worker Cache API, Web App Manifest
- Produces: Installable offline-capable PWA on Android/iOS/Desktop.

- [ ] **Step 1: Create `manifest.json` and SVG/PNG app icons**
- [ ] **Step 2: Implement `sw.js` for offline caching**
- [ ] **Step 3: Test local server and verify all 7 requirements**
- [ ] **Step 4: Git commit**
