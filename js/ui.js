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
      
      dividerModal: document.getElementById('dividerModal'),
      dividerModalTitle: document.getElementById('dividerModalTitle'),
      dividerModalDesc: document.getElementById('dividerModalDesc'),
      dividerTitleInput: document.getElementById('dividerTitleInput'),
      btnConfirmDivider: document.getElementById('btnConfirmDivider'),
      btnAddHeaderTop: document.getElementById('btnAddHeaderTop'),
      btnAddSubheaderTop: document.getElementById('btnAddSubheaderTop'),

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
    const visiblePhones = items.filter(item => !item.type || item.type === 'phone');
    this.elements.activeCountText.textContent = `Menampilkan ${visiblePhones.length} dari ${totalCount} nomor`;

    // Render items
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Render Divider (Header / Subheader)
      if (item.type === 'header' || item.type === 'subheader') {
        const isHeader = item.type === 'header';

        // Count phone numbers belonging to this section
        let sectionPhoneCount = 0;
        for (let j = i + 1; j < items.length; j++) {
          const next = items[j];
          if (isHeader && next.type === 'header') break;
          if (!isHeader && (next.type === 'header' || next.type === 'subheader')) break;
          if (!next.type || next.type === 'phone') {
            sectionPhoneCount++;
          }
        }

        const dividerCard = document.createElement('div');
        dividerCard.className = `divider-card ${isHeader ? 'divider-header' : 'divider-subheader'}`;
        dividerCard.dataset.id = item.id;

        const badgeText = isHeader ? 'APLIKASI' : 'SUB';
        const badgeClass = isHeader ? 'header-badge' : 'subheader-badge';
        const titleClass = isHeader ? 'header-title' : 'subheader-title';
        const countLabel = `${sectionPhoneCount} nomor`;

        dividerCard.innerHTML = `
          <div class="divider-left">
            <span class="divider-badge ${badgeClass}">${badgeText}</span>
            <span class="divider-title ${titleClass}">${this.escapeHtml(item.title)}</span>
            <span class="divider-count-badge">${countLabel}</span>
          </div>
          <div class="divider-actions">
            <button class="btn-divider-action" data-action="move-item" data-direction="up" data-id="${item.id}" title="Geser ke atas" aria-label="Geser ke atas">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="btn-divider-action" data-action="move-item" data-direction="down" data-id="${item.id}" title="Geser ke bawah" aria-label="Geser ke bawah">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="btn-divider-action" data-action="edit-divider" data-id="${item.id}" title="Ubah nama pembatas" aria-label="Ubah nama">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn-divider-action danger" data-action="delete-divider" data-id="${item.id}" title="Hapus pembatas ini" aria-label="Hapus pembatas">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;
        fragment.appendChild(dividerCard);

        // Add inline insert strip under this divider
        const insertStrip = document.createElement('div');
        insertStrip.className = 'card-insert-strip';
        insertStrip.innerHTML = `
          <button class="btn-insert-inline" data-action="insert-header" data-after-id="${item.id}" title="Sisipkan Judul di bawah ini">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Judul</span>
          </button>
          <button class="btn-insert-inline" data-action="insert-subheader" data-after-id="${item.id}" title="Sisipkan Sub Judul di bawah ini">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Sub Judul</span>
          </button>
        `;
        fragment.appendChild(insertStrip);
        continue;
      }

      // Render Phone Card
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
        ? '<span class="status-pill status-pill-rose"><span class="status-dot"></span>Semua Terpakai</span>'
        : (!item.v1 && !item.v2)
          ? '<span class="status-pill status-pill-emerald"><span class="status-dot"></span>2 Voucher Siap</span>'
          : '<span class="status-pill status-pill-amber"><span class="status-dot"></span>1 Voucher Siap</span>';

      card.innerHTML = `
        <div class="phone-card-top">
          <div class="phone-main-info">
            <label class="custom-checkbox-label" title="Pilih nomor ini">
              <input type="checkbox" class="custom-checkbox row-select-checkbox" data-select-id="${item.id}" ${isSelected ? 'checked' : ''}>
              <span class="checkbox-box"></span>
            </label>
            <div class="phone-number-wrap">
              <span class="phone-number tabular-nums">${item.phone}</span>
              <button class="btn-copy-number" data-copy-phone="${item.phone}" title="Salin nomor ${item.phone}" aria-label="Salin nomor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
          <button class="btn-card-delete" data-action="delete-single" data-id="${item.id}" title="Hapus nomor ini" aria-label="Hapus nomor">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>

        <div class="phone-card-bottom">
          <div class="phone-status-meta">
            ${statusBadge}
          </div>
          <div class="phone-card-actions">
            <button class="voucher-btn ${v1Class}" data-action="toggle-v" data-v="1" data-id="${item.id}" title="Klik untuk ubah status Voucher 1">
              ${v1Text}
            </button>
            <button class="voucher-btn ${v2Class}" data-action="toggle-v" data-v="2" data-id="${item.id}" title="Klik untuk ubah status Voucher 2">
              ${v2Text}
            </button>
          </div>
        </div>
      `;

      fragment.appendChild(card);

      // Add inline insert strip under each phone card
      const insertStrip = document.createElement('div');
      insertStrip.className = 'card-insert-strip';
      insertStrip.innerHTML = `
        <button class="btn-insert-inline" data-action="insert-header" data-after-id="${item.id}" title="Sisipkan Judul di bawah nomor ini">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Judul</span>
        </button>
        <button class="btn-insert-inline" data-action="insert-subheader" data-after-id="${item.id}" title="Sisipkan Sub Judul di bawah nomor ini">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Sub Judul</span>
        </button>
      `;
      fragment.appendChild(insertStrip);
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
    const phoneItems = displayedItems.filter(item => !item.type || item.type === 'phone');
    if (phoneItems.length === 0) {
      this.elements.selectAllCheckbox.checked = false;
      this.elements.selectAllCheckbox.indeterminate = false;
      return;
    }

    let selectedCountInView = 0;
    for (const item of phoneItems) {
      if (this.selectedIds.has(item.id)) {
        selectedCountInView++;
      }
    }

    if (selectedCountInView === phoneItems.length) {
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
