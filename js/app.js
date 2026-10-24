/**
 * Application Bootstrap & Event Controller
 */

import { PhoneStore } from './store.js';
import { PhoneUI } from './ui.js';

class App {
  constructor() {
    this.store = new PhoneStore();
    this.ui = new PhoneUI();
  }

  init() {
    this.bindEvents();
    this.refresh();
    this.initServiceWorker();
  }

  /**
   * Refresh current view and statistics.
   */
  refresh() {
    const filteredItems = this.store.getFiltered(
      this.ui.searchQuery,
      this.ui.currentFilter,
      this.ui.currentSort
    );
    const totalCount = this.store.getAll().length;
    const stats = this.store.getStats();

    this.ui.renderList(filteredItems, totalCount);
    this.ui.updateStats(stats);
  }

  /**
   * Bind all user interactions and event listeners.
   */
  bindEvents() {
    const { elements } = this.ui;

    // --- 1. Search & Sort Interactions ---
    elements.searchInput.addEventListener('input', (e) => {
      this.ui.searchQuery = e.target.value;
      if (this.ui.searchQuery.trim().length > 0) {
        elements.btnClearSearch.classList.remove('hidden');
      } else {
        elements.btnClearSearch.classList.add('hidden');
      }
      this.refresh();
    });

    elements.btnClearSearch.addEventListener('click', () => {
      elements.searchInput.value = '';
      this.ui.searchQuery = '';
      elements.btnClearSearch.classList.add('hidden');
      elements.searchInput.focus();
      this.refresh();
    });

    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        this.ui.currentSort = e.target.value;
        this.ui.vibrate(20);
        this.refresh();
      });
    }

    // --- 2. Filter Pills ---
    elements.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        this.ui.currentFilter = pill.dataset.filter;
        this.ui.vibrate(20);
        this.refresh();
      });
    });

    // --- 3. Delegate Events on Phone List (Voucher Toggle, Copy, Select, Delete) ---
    elements.phoneList.addEventListener('click', (e) => {
      // Copy phone button
      const copyBtn = e.target.closest('[data-copy-phone]');
      if (copyBtn) {
        const phone = copyBtn.dataset.copyPhone;
        this.ui.vibrate(25);
        this.copyToClipboard(phone, `Nomor ${phone} disalin`);
        return;
      }

      // Voucher toggle button
      const voucherBtn = e.target.closest('[data-action="toggle-v"]');
      if (voucherBtn) {
        const id = voucherBtn.dataset.id;
        const vIndex = parseInt(voucherBtn.dataset.v, 10);
        this.ui.vibrate(35);
        this.store.toggleVoucher(id, vIndex);
        this.refresh();
        return;
      }

      // Single item delete button
      const singleDeleteBtn = e.target.closest('[data-action="delete-single"]');
      if (singleDeleteBtn) {
        const id = singleDeleteBtn.dataset.id;
        const item = this.store.getItem(id);
        if (item) {
          this.ui.vibrate(25);
          this.ui.pendingDeleteIds = [id];
          elements.deleteModalMessage.textContent = `Hapus nomor ${item.phone} dari daftar?`;
          this.ui.openModal(elements.deleteModal);
        }
        return;
      }
    });

    // Row selection checkbox change
    elements.phoneList.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.row-select-checkbox');
      if (checkbox) {
        const id = checkbox.dataset.selectId;
        const card = checkbox.closest('.phone-card');
        this.ui.vibrate(20);
        if (checkbox.checked) {
          this.ui.selectedIds.add(id);
          card.classList.add('selected');
        } else {
          this.ui.selectedIds.delete(id);
          card.classList.remove('selected');
        }
        const filteredItems = this.store.getFiltered(
          this.ui.searchQuery,
          this.ui.currentFilter,
          this.ui.currentSort
        );
        this.ui.updateSelectAllCheckbox(filteredItems);
        this.ui.updateBulkActionBar();
      }
    });

    // --- 4. Master Select All Checkbox ---
    elements.selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.ui.vibrate(25);
      const visibleItems = this.store.getFiltered(
        this.ui.searchQuery,
        this.ui.currentFilter,
        this.ui.currentSort
      );

      if (isChecked) {
        for (const item of visibleItems) {
          this.ui.selectedIds.add(item.id);
        }
      } else {
        for (const item of visibleItems) {
          this.ui.selectedIds.delete(item.id);
        }
      }

      this.refresh();
    });

    // Cancel selection button
    elements.btnCancelSelection.addEventListener('click', () => {
      this.ui.vibrate(20);
      this.ui.selectedIds.clear();
      this.refresh();
    });

    // --- 5. Bulk Actions ---
    // Bulk Copy numbers to clipboard
    if (elements.btnBulkCopy) {
      elements.btnBulkCopy.addEventListener('click', () => {
        const count = this.ui.selectedIds.size;
        if (count === 0) return;
        const phoneList = [];
        for (const id of this.ui.selectedIds) {
          const item = this.store.getItem(id);
          if (item) phoneList.push(item.phone);
        }
        const textToCopy = phoneList.join('\r\n');
        this.ui.vibrate(30);
        this.copyToClipboard(textToCopy, `${count} nomor disalin ke clipboard!`);
      });
    }

    // Bulk Mark V1
    elements.btnBulkMarkV1.addEventListener('click', () => {
      const count = this.ui.selectedIds.size;
      if (count === 0) return;
      this.ui.vibrate(30);
      this.store.setVouchersForIds(Array.from(this.ui.selectedIds), 1, true);
      this.ui.showToast(`Voucher 1 ditandai X untuk ${count} nomor`, 'success');
      this.refresh();
    });

    // Bulk Mark V2
    elements.btnBulkMarkV2.addEventListener('click', () => {
      const count = this.ui.selectedIds.size;
      if (count === 0) return;
      this.ui.vibrate(30);
      this.store.setVouchersForIds(Array.from(this.ui.selectedIds), 2, true);
      this.ui.showToast(`Voucher 2 ditandai X untuk ${count} nomor`, 'success');
      this.refresh();
    });

    // Bulk Reset Vouchers (Selected)
    elements.btnBulkReset.addEventListener('click', () => {
      const count = this.ui.selectedIds.size;
      if (count === 0) return;
      this.ui.pendingResetIds = Array.from(this.ui.selectedIds);
      elements.resetModalMessage.textContent = `Hapus semua tanda silang (X) pada ${count} nomor terpilih? Nomor tidak akan dihapus.`;
      this.ui.openModal(elements.resetModal);
    });

    // Quick Reset All Vouchers (Header button)
    elements.btnQuickResetAll.addEventListener('click', () => {
      const total = this.store.getAll().length;
      if (total === 0) {
        this.ui.showToast('Belum ada nomor untuk direset');
        return;
      }
      this.ui.pendingResetIds = null; // null represents ALL items
      elements.resetModalMessage.textContent = `Reset semua tanda silang (X) pada seluruh ${total} nomor telepon? Kedua voucher akan kembali tersedia.`;
      this.ui.openModal(elements.resetModal);
    });

    // Confirm Reset Action in Modal with Undo Option
    elements.btnConfirmReset.addEventListener('click', () => {
      const ids = this.ui.pendingResetIds;
      const count = this.store.resetVouchers(ids);
      this.ui.vibrate(40);
      this.ui.closeModal(elements.resetModal);
      this.ui.showToast(`Tanda voucher direset pada ${count} nomor`, 'success', 5000, {
        label: 'Urungkan (Undo)',
        callback: () => {
          this.store.undo();
          this.ui.vibrate(30);
          this.ui.showToast('Reset voucher dibatalkan', 'success');
          this.refresh();
        }
      });
      this.refresh();
    });

    // Bulk Delete
    elements.btnBulkDelete.addEventListener('click', () => {
      const count = this.ui.selectedIds.size;
      if (count === 0) return;
      this.ui.pendingDeleteIds = Array.from(this.ui.selectedIds);
      elements.deleteModalMessage.textContent = `Apakah Anda yakin ingin menghapus ${count} nomor yang dipilih? Data yang dihapus tidak bisa dikembalikan.`;
      this.ui.openModal(elements.deleteModal);
    });

    // Confirm Delete Action in Modal with Undo Option
    elements.btnConfirmDelete.addEventListener('click', () => {
      const ids = this.ui.pendingDeleteIds;
      const deleted = this.store.deleteNumbers(ids);
      for (const id of ids) {
        this.ui.selectedIds.delete(id);
      }
      this.ui.vibrate(40);
      this.ui.closeModal(elements.deleteModal);
      this.ui.showToast(`${deleted} nomor berhasil dihapus`, 'danger', 5000, {
        label: 'Urungkan (Undo)',
        callback: () => {
          this.store.undo();
          this.ui.vibrate(30);
          this.ui.showToast('Penghapusan nomor dibatalkan', 'success');
          this.refresh();
        }
      });
      this.refresh();
    });

    // --- 6. Add Numbers Modal & Clipboard Handler ---
    const openAddHandler = () => {
      elements.bulkInputArea.value = '';
      elements.parsedPreviewCount.textContent = '0 nomor terdeteksi';
      this.ui.openModal(elements.addModal);
    };

    elements.btnOpenAddModal.addEventListener('click', openAddHandler);
    elements.btnEmptyAdd.addEventListener('click', openAddHandler);

    // Live preview count when typing or pasting
    elements.bulkInputArea.addEventListener('input', (e) => {
      const parsed = this.store.parseRawNumbers(e.target.value);
      elements.parsedPreviewCount.textContent = `${parsed.length} nomor terdeteksi`;
    });

    // Paste from clipboard button
    elements.btnPasteClipboard.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          this.ui.showToast('Gunakan Ctrl+V / tempel langsung di kotak teks');
          return;
        }
        const text = await navigator.clipboard.readText();
        if (text) {
          const current = elements.bulkInputArea.value;
          elements.bulkInputArea.value = current ? current + '\n' + text : text;
          const parsed = this.store.parseRawNumbers(elements.bulkInputArea.value);
          elements.parsedPreviewCount.textContent = `${parsed.length} nomor terdeteksi`;
          this.ui.showToast('Teks berhasil ditempel dari clipboard');
        } else {
          this.ui.showToast('Clipboard kosong');
        }
      } catch (err) {
        this.ui.showToast('Izin clipboard tidak aktif, silakan tempel manual');
      }
    });

    // Confirm Add Button
    elements.btnConfirmAdd.addEventListener('click', () => {
      const rawText = elements.bulkInputArea.value;
      if (!rawText.trim()) {
        this.ui.showToast('Silakan masukkan nomor terlebih dahulu');
        return;
      }

      const result = this.store.addNumbers(rawText);
      if (result.added === 0 && result.duplicates === 0) {
        this.ui.showToast('Tidak ada nomor telepon valid yang ditemukan');
        return;
      }

      let msg = `${result.added} nomor berhasil ditambahkan!`;
      if (result.duplicates > 0) {
        msg += ` (${result.duplicates} duplikat diabaikan)`;
      }

      this.ui.closeModal(elements.addModal);
      this.ui.showToast(msg, 'success');
      this.refresh();
    });

    // --- 7. Backup & Restore Modal ---
    elements.btnOpenBackup.addEventListener('click', () => {
      this.ui.openModal(elements.backupModal);
    });

    // Export JSON
    elements.btnExportJSON.addEventListener('click', () => {
      const json = this.store.exportJSON();
      const dateStr = new Date().toISOString().slice(0, 10);
      this.ui.downloadFile(`catet-nomer-backup-${dateStr}.json`, json, 'application/json');
      this.ui.showToast('File backup JSON berhasil diunduh');
    });

    // Export CSV
    elements.btnExportCSV.addEventListener('click', () => {
      const csv = this.store.exportCSV();
      const dateStr = new Date().toISOString().slice(0, 10);
      this.ui.downloadFile(`daftar-nomer-${dateStr}.csv`, csv, 'text/csv;charset=utf-8;');
      this.ui.showToast('File CSV berhasil diunduh');
    });

    // File input trigger
    elements.btnTriggerFileInput.addEventListener('click', () => {
      elements.importFileInput.value = '';
      elements.importFileInput.click();
    });

    // Handle JSON file upload
    elements.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const modeInput = document.querySelector('input[name="importMode"]:checked');
          const mode = modeInput ? modeInput.value : 'merge';

          const res = this.store.importJSON(content, mode);
          this.ui.closeModal(elements.backupModal);
          this.ui.showToast(`Berhasil memulihkan ${res.imported} nomor!`, 'success');
          this.refresh();
        } catch (err) {
          this.ui.showToast(err.message || 'Gagal membaca file cadangan', 'danger');
        }
      };
      reader.readAsText(file);
    });

    // --- 8. Generic Modal Close Buttons & Backdrop Clicks ---
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        const modal = document.getElementById(modalId);
        if (modal) this.ui.closeModal(modal);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.ui.closeModal(modal);
        }
      });
    });

    // --- 9. Global Keyboard Shortcuts ---
    window.addEventListener('keydown', (e) => {
      // Escape closes any open modal
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
          this.ui.closeModal(modal);
        });
      }

      // '/' focuses search bar when not typing in an input
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        elements.searchInput.focus();
      }
    });
  }

  /**
   * Helper to copy text to clipboard with fallback.
   */
  async copyToClipboard(text, successMsg = 'Teks disalin ke clipboard') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.ui.showToast(successMsg, 'success');
        return;
      }
    } catch (e) {
      // Fallback
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.ui.showToast(successMsg, 'success');
    } catch (err) {
      this.ui.showToast('Gagal menyalin nomor', 'danger');
    }
    document.body.removeChild(textArea);
  }

  /**
   * Register Service Worker for offline PWA functionality.
   */
  initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.log('SW registration note:', err);
        });
      });
    }
  }
}

// Instantiate and start app
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
