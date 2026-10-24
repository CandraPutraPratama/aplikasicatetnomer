/**
 * UI Renderer and View Controller
 */

export class PhoneUI {
  constructor() {
    this.selectedIds = new Set();
    this.currentFilter = 'all';
    this.currentSort = 'newest';
    this.searchQuery = '';
    
    // Cache DOM Elements
    this.elements = {
      phoneList: document.getElementById('phoneList'),
      emptyState: document.getElementById('emptyState'),
      emptyTitle: document.getElementById('emptyTitle'),
      emptyDesc: document.getElementById('emptyDesc'),
      btnEmptyAdd: document.getElementById('btnEmptyAdd'),
      
      // Stats
      statTotalNumbers: document.getElementById('statTotalNumbers'),
      statVouchersRemaining: document.getElementById('statVouchersRemaining'),
      statVouchersUsed: document.getElementById('statVouchersUsed'),
      statV1V2Used: document.getElementById('statV1V2Used'),
      
      // Badges
      badgeFilterAll: document.getElementById('badgeFilterAll'),
      badgeFilterNone: document.getElementById('badgeFilterNone'),
      badgeFilterOne: document.getElementById('badgeFilterOne'),
      badgeFilterBoth: document.getElementById('badgeFilterBoth'),
      
      // Search & Filters & Sort
      searchInput: document.getElementById('searchInput'),
      btnClearSearch: document.getElementById('btnClearSearch'),
      sortSelect: document.getElementById('sortSelect'),
      filterPills: document.querySelectorAll('.filter-pill'),
      
      // Select all & Bulk bar
      selectAllCheckbox: document.getElementById('selectAllCheckbox'),
      activeCountText: document.getElementById('activeCountText'),
      bulkActionBar: document.getElementById('bulkActionBar'),
      bulkSelectedCount: document.getElementById('bulkSelectedCount'),
      btnBulkCopy: document.getElementById('btnBulkCopy'),
      btnBulkMarkV1: document.getElementById('btnBulkMarkV1'),
      btnBulkMarkV2: document.getElementById('btnBulkMarkV2'),
      btnBulkReset: document.getElementById('btnBulkReset'),
      btnBulkDelete: document.getElementById('btnBulkDelete'),
      btnCancelSelection: document.getElementById('btnCancelSelection'),
      btnQuickResetAll: document.getElementById('btnQuickResetAll'),
      
      // Modals
      addModal: document.getElementById('addModal'),
      btnOpenAddModal: document.getElementById('btnOpenAddModal'),
      bulkInputArea: document.getElementById('bulkInputArea'),
      parsedPreviewCount: document.getElementById('parsedPreviewCount'),
      btnPasteClipboard: document.getElementById('btnPasteClipboard'),
      btnConfirmAdd: document.getElementById('btnConfirmAdd'),
      
      deleteModal: document.getElementById('deleteModal'),
      deleteModalMessage: document.getElementById('deleteModalMessage'),
      btnConfirmDelete: document.getElementById('btnConfirmDelete'),
      
      resetModal: document.getElementById('resetModal'),
      resetModalMessage: document.getElementById('resetModalMessage'),
      btnConfirmReset: document.getElementById('btnConfirmReset'),
      
      backupModal: document.getElementById('backupModal'),
      btnOpenBackup: document.getElementById('btnOpenBackup'),
      btnExportJSON: document.getElementById('btnExportJSON'),
      btnExportCSV: document.getElementById('btnExportCSV'),
      btnTriggerFileInput: document.getElementById('btnTriggerFileInput'),
      importFileInput: document.getElementById('importFileInput'),
      
      toastContainer: document.getElementById('toastContainer')
    };

    this.pendingDeleteIds = [];
    this.pendingResetIds = null; // null means reset all
  }

  /**
   * Subtle haptic feedback for mobile devices.
   */
  vibrate(ms = 30) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // Ignore if vibration is disallowed
      }
    }
  }

  /**
   * Display a clean toast message with optional Action button (e.g. Undo).
   */
  showToast(message, type = 'info', duration = 3000, action = null) {
    if (!this.elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'danger' ? 'toast-danger' : type === 'success' ? 'toast-success' : ''}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${this.escapeHtml(message)}</span>`;

    if (action && action.label && typeof action.callback === 'function') {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action-btn';
      actionBtn.textContent = action.label;
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        action.callback();
        toast.remove();
      });
      toast.appendChild(actionBtn);
    }

    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  /**
   * Open modal by DOM element.
   */
  openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('hidden');
    // Autofocus input if available
    const textarea = modalElement.querySelector('textarea, input[type="text"]');
    if (textarea) {
      setTimeout(() => textarea.focus(), 100);
    }
  }

  /**
   * Close modal by DOM element.
   */
  closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('hidden');
  }

  /**
   * Render the list of phone cards.
   */
  renderList(items, totalCount) {
    const container = this.elements.phoneList;
    container.innerHTML = '';

    // Handle Empty State
    if (items.length === 0) {
      this.elements.emptyState.classList.remove('hidden');
      if (totalCount === 0) {
        this.elements.emptyTitle.textContent = 'Belum ada nomor telepon';
        this.elements.emptyDesc.textContent = 'Mulai dengan menambahkan nomor baru atau tempel dari clipboard.';
        this.elements.btnEmptyAdd.classList.remove('hidden');
      } else {
        this.elements.emptyTitle.textContent = 'Tidak ada nomor yang cocok';
        this.elements.emptyDesc.textContent = 'Coba ubah kata kunci pencarian atau ganti pilihan filter status voucher.';
        this.elements.btnEmptyAdd.classList.add('hidden');
      }
    } else {
      this.elements.emptyState.classList.add('hidden');
    }

    // Update active count text
    this.elements.activeCountText.textContent = `Menampilkan ${items.length} dari ${totalCount} nomor`;

    // Render items
    const fragment = document.createDocumentFragment();

    for (const item of items) {
      const isSelected = this.selectedIds.has(item.id);
      const card = document.createElement('div');
      card.className = `phone-card ${isSelected ? 'selected' : ''}`;
      card.dataset.id = item.id;

      // Status badges
      const v1Class = item.v1 ? 'used' : 'unused';
      const v1Text = item.v1 ? '<span class="voucher-x-mark">✕</span> V1' : 'V1 Tersedia';
      const v2Class = item.v2 ? 'used' : 'unused';
      const v2Text = item.v2 ? '<span class="voucher-x-mark">✕</span> V2' : 'V2 Tersedia';

      const statusBadge = (item.v1 && item.v2) 
        ? '<span style="color:#f43f5e;font-weight:600;">Semua Terpakai</span>'
        : (!item.v1 && !item.v2)
          ? '<span style="color:#10b981;font-weight:600;">2 Voucher Siap</span>'
          : '<span style="color:#f59e0b;font-weight:600;">1 Voucher Siap</span>';

      card.innerHTML = `
        <div class="phone-card-left">
          <label class="custom-checkbox-label" title="Pilih nomor ini">
            <input type="checkbox" class="custom-checkbox row-select-checkbox" data-select-id="${item.id}" ${isSelected ? 'checked' : ''}>
            <span class="checkbox-box"></span>
          </label>
          <div class="phone-number-group">
            <div style="display:flex;align-items:center;gap:0.35rem;">
              <span class="phone-number tabular-nums">${item.phone}</span>
              <button class="btn-copy-number" data-copy-phone="${item.phone}" title="Salin nomor">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
            <div class="phone-status-meta">
              <span>${statusBadge}</span>
            </div>
          </div>
        </div>

        <div class="phone-card-actions">
          <button class="voucher-btn ${v1Class}" data-action="toggle-v" data-v="1" data-id="${item.id}" title="Klik untuk ubah status Voucher 1">
            ${v1Text}
          </button>
          <button class="voucher-btn ${v2Class}" data-action="toggle-v" data-v="2" data-id="${item.id}" title="Klik untuk ubah status Voucher 2">
            ${v2Text}
          </button>
          <button class="btn-card-delete" data-action="delete-single" data-id="${item.id}" title="Hapus nomor ini">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      fragment.appendChild(card);
    }

    container.appendChild(fragment);

    // Update select-all checkbox state
    this.updateSelectAllCheckbox(items);
    this.updateBulkActionBar();
  }

  /**
   * Update header summary statistics.
   */
  updateStats(stats) {
    this.elements.statTotalNumbers.textContent = stats.totalNumbers.toLocaleString('id-ID');
    this.elements.statVouchersRemaining.textContent = stats.totalVouchersRemaining.toLocaleString('id-ID');
    this.elements.statVouchersUsed.textContent = stats.totalVouchersUsed.toLocaleString('id-ID');
    this.elements.statV1V2Used.textContent = `${stats.v1Used} / ${stats.v2Used}`;

    // Filter pill count badges
    this.elements.badgeFilterAll.textContent = stats.totalNumbers;
    this.elements.badgeFilterNone.textContent = stats.countNone;
    this.elements.badgeFilterOne.textContent = stats.countOne;
    this.elements.badgeFilterBoth.textContent = stats.countBoth;
  }

  /**
   * Sync the Select All master checkbox.
   */
  updateSelectAllCheckbox(displayedItems) {
    if (displayedItems.length === 0) {
      this.elements.selectAllCheckbox.checked = false;
      this.elements.selectAllCheckbox.indeterminate = false;
      return;
    }

    let selectedCountInView = 0;
    for (const item of displayedItems) {
      if (this.selectedIds.has(item.id)) {
        selectedCountInView++;
      }
    }

    if (selectedCountInView === displayedItems.length) {
      this.elements.selectAllCheckbox.checked = true;
      this.elements.selectAllCheckbox.indeterminate = false;
    } else if (selectedCountInView > 0) {
      this.elements.selectAllCheckbox.checked = false;
      this.elements.selectAllCheckbox.indeterminate = true;
    } else {
      this.elements.selectAllCheckbox.checked = false;
      this.elements.selectAllCheckbox.indeterminate = false;
    }
  }

  /**
   * Show/hide floating bulk action bar and update counts.
   */
  updateBulkActionBar() {
    const count = this.selectedIds.size;
    if (count > 0) {
      this.elements.bulkActionBar.classList.remove('hidden');
      this.elements.bulkSelectedCount.textContent = count;
    } else {
      this.elements.bulkActionBar.classList.add('hidden');
    }
  }

  /**
   * Trigger download of file in browser.
   */
  downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Escape HTML utility to prevent XSS.
   */
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
