# Aplikasi Catet Nomer Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur kenyamanan penggunaan (*Quality of Life*): Bulk Copy nomor ke clipboard, opsi Pengurutan (Sorting), Haptic Feedback getar di HP, tombol Undo untuk aksi penting, dan file starter shortcut Windows (`Jalankan-Aplikasi.bat`).

**Architecture:** Client-side modular additions pada `store.js`, `ui.js`, dan `app.js` tanpa merusak kompatibilitas data yang sudah tersimpan di LocalStorage.

---

### Task 1: Store & Sorting Updates with Unit Tests
- Tambahkan kemampuan sorting pada `getFiltered(searchQuery, filterStatus, sortBy)`:
  - `newest` (default)
  - `oldest`
  - `phone-asc`
  - `available-desc` (voucher paling banyak tersisa di atas)
  - `used-desc` (voucher paling banyak habis di atas)
- Tambahkan unit test di `tests/store.test.js` dan jalankan verifikasi.

### Task 2: UI & Features Enhancements
- Tambahkan dropdown Sort di samping Search/Filter.
- Tambahkan tombol "Salin Nomor" di Floating Bulk Action Bar.
- Tambahkan haptic feedback (`navigator.vibrate`) pada toggle voucher dan aksi massal.
- Tambahkan kemampuan Undo untuk delete / reset terakhir dengan toast action.
- Update CSS styling untuk sort dropdown dan bulk copy button.

### Task 3: Windows Quick Starter Script & Verification
- Buat `Jalankan-Aplikasi.bat` untuk 1-click launch di Windows.
- Jalankan seluruh unit test dan integrasi (`npm test`).
- Commit perubahan dan beri laporan lengkap kepada pengguna.
