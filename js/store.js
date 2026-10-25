/**
 * PhoneStore - LocalStorage-backed state manager for phone numbers and voucher status.
 */
export class PhoneStore {
  static STORAGE_KEY = 'catet_nomer_data_v1';

  constructor(storageEngine = null) {
    if (storageEngine) {
      this.storage = storageEngine;
    } else if (typeof localStorage !== 'undefined') {
      this.storage = localStorage;
    } else {
      this.storage = null;
    }
    this.items = [];
    this.undoStack = [];
    this.load();
  }

  /**
   * Save a snapshot to undo stack before destructive actions.
   */
  pushUndoSnapshot() {
    // Keep at most 10 undo steps
    if (this.undoStack.length >= 10) {
      this.undoStack.shift();
    }
    this.undoStack.push(JSON.parse(JSON.stringify(this.items)));
  }

  /**
   * Restore previous state from undo stack.
   */
  undo() {
    if (this.undoStack.length === 0) return false;
    const snapshot = this.undoStack.pop();
    this.items = snapshot;
    this.save();
    return true;
  }

  /**
   * Load items from storage engine.
   */
  load() {
    if (!this.storage) return;
    try {
      const data = this.storage.getItem(PhoneStore.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          this.items = parsed.items;
        }
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
      this.items = [];
    }
  }

  /**
   * Save items to storage engine.
   */
  save() {
    if (!this.storage) return;
    try {
      const payload = JSON.stringify(this.items);
      this.storage.setItem(PhoneStore.STORAGE_KEY, payload);
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  /**
   * Parse raw text containing phone numbers from clipboard or textarea.
   * Handles multi-line, comma, semicolons, tabs, spaces, and clean up symbols.
   * Converts +62 / 62 to 08 or 0 standard prefix.
   */
  parseRawNumbers(input) {
    if (!input || typeof input !== 'string') return [];

    // Split by newlines, commas, semicolons, tabs
    const lines = input.split(/[\r\n,;\t]+/);
    const seen = new Set();
    const result = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Match phone number sequences with possible internal spaces/dashes
      const matches = line.match(/(?:\+62|62|0)[\d\s\-\.\(\)]{6,20}\b/g);
      if (matches && matches.length > 0) {
        for (let m of matches) {
          let cleaned = m.replace(/[\s\-\.\(\)\/]/g, '');
          if (cleaned.startsWith('+62')) {
            cleaned = '0' + cleaned.slice(3);
          } else if (cleaned.startsWith('62')) {
            cleaned = '0' + cleaned.slice(2);
          }
          if (/^\d{8,16}$/.test(cleaned)) {
            if (!seen.has(cleaned)) {
              seen.add(cleaned);
              result.push(cleaned);
            }
          }
        }
      } else {
        // Fallback: strip symbols and check if valid digits
        let cleaned = line.replace(/[\s\-\.\(\)\/]/g, '');
        if (cleaned.startsWith('+62')) {
          cleaned = '0' + cleaned.slice(3);
        } else if (cleaned.startsWith('62')) {
          cleaned = '0' + cleaned.slice(2);
        }
        if (/^\d{8,16}$/.test(cleaned)) {
          if (!seen.has(cleaned)) {
            seen.add(cleaned);
            result.push(cleaned);
          }
        }
      }
    }

    return result;
  }

  /**
   * Add one or multiple phone numbers from raw text.
   * Can insert after a specific item ID (afterId), or append to end if afterId is null.
   * Returns statistics about added vs duplicate numbers.
   */
  addNumbers(rawText, afterId = null) {
    const parsedNumbers = this.parseRawNumbers(rawText);
    const existingSet = new Set(
      this.items.filter(item => !item.type || item.type === 'phone').map(item => item.phone)
    );

    let added = 0;
    let duplicates = 0;
    const now = Date.now();
    const newItems = [];

    for (const phone of parsedNumbers) {
      if (existingSet.has(phone)) {
        duplicates++;
      } else {
        const newItem = {
          id: 'pn_' + now + '_' + Math.random().toString(36).substring(2, 8),
          type: 'phone',
          phone,
          v1: false,
          v2: false,
          createdAt: now,
          updatedAt: now
        };
        newItems.push(newItem);
        existingSet.add(phone);
        added++;
      }
    }

    if (newItems.length > 0) {
      if (afterId) {
        const targetIndex = this.items.findIndex(item => item.id === afterId);
        if (targetIndex !== -1) {
          this.items.splice(targetIndex + 1, 0, ...newItems);
        } else {
          this.items.push(...newItems);
        }
      } else {
        this.items.push(...newItems);
      }
      this.save();
    }

    const totalPhoneNumbers = this.items.filter(item => !item.type || item.type === 'phone').length;
    return { added, duplicates, total: totalPhoneNumbers };
  }

  /**
   * Add a section divider (Header / Judul or Subheader / Sub Judul).
   * @param {'header' | 'subheader'} type
   * @param {string} title
   * @param {string|null} afterId - Insert right after this item ID. If null, insert at beginning.
   */
  addDivider(type, title, afterId = null) {
    this.pushUndoSnapshot();
    const now = Date.now();
    const prefix = type === 'header' ? 'hdr_' : 'sub_';
    const defaultTitle = type === 'header' ? 'JUDUL BARU' : 'Sub Judul';
    const cleanTitle = (title && typeof title === 'string' && title.trim()) ? title.trim() : defaultTitle;

    const newDivider = {
      id: prefix + now + '_' + Math.random().toString(36).substring(2, 8),
      type,
      title: cleanTitle,
      createdAt: now,
      updatedAt: now
    };

    if (afterId === null) {
      // Insert at the very top (beginning of list)
      this.items.unshift(newDivider);
    } else if (afterId === 'bottom') {
      // Append to the bottom of list
      this.items.push(newDivider);
    } else {
      const targetIndex = this.items.findIndex(item => item.id === afterId);
      if (targetIndex !== -1) {
        this.items.splice(targetIndex + 1, 0, newDivider);
      } else {
        this.items.push(newDivider);
      }
    }

    this.save();
    return newDivider;
  }

  /**
   * Helper to add Header (Judul).
   */
  addHeader(title, afterId = null) {
    return this.addDivider('header', title, afterId);
  }

  /**
   * Helper to add Subheader (Sub Judul).
   */
  addSubheader(title, afterId = null) {
    return this.addDivider('subheader', title, afterId);
  }

  /**
   * Update title of a divider.
   */
  updateDividerTitle(id, newTitle) {
    const item = this.getItem(id);
    if (!item || (item.type !== 'header' && item.type !== 'subheader')) {
      return false;
    }
    this.pushUndoSnapshot();
    const fallback = item.type === 'header' ? 'JUDUL' : 'Sub Judul';
    item.title = (newTitle && typeof newTitle === 'string' && newTitle.trim()) ? newTitle.trim() : fallback;
    item.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Delete a divider.
   */
  deleteDivider(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.pushUndoSnapshot();
    this.items.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * Move an item up or down in the sequence.
   * @param {string} id
   * @param {'up' | 'down'} direction
   */
  moveItem(id, direction) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    if (direction === 'up') {
      if (index === 0) return false;
      this.pushUndoSnapshot();
      const temp = this.items[index];
      this.items[index] = this.items[index - 1];
      this.items[index - 1] = temp;
      this.save();
      return true;
    }

    if (direction === 'down') {
      if (index >= this.items.length - 1) return false;
      this.pushUndoSnapshot();
      const temp = this.items[index];
      this.items[index] = this.items[index + 1];
      this.items[index + 1] = temp;
      this.save();
      return true;
    }

    return false;
  }

  /**
   * Get all phone items.
   */
  getAll() {
    return [...this.items];
  }

  /**
   * Get single item by ID.
   */
  getItem(id) {
    return this.items.find(item => item.id === id) || null;
  }

  /**
   * Toggle voucher 1 or 2 for a specific item.
   */
  toggleVoucher(id, voucherIndex) {
    const item = this.getItem(id);
    if (!item) return false;

    if (voucherIndex === 1) {
      item.v1 = !item.v1;
    } else if (voucherIndex === 2) {
      item.v2 = !item.v2;
    } else {
      return false;
    }

    item.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Set specific voucher value (true/false) for an array of IDs.
   */
  setVouchersForIds(ids, voucherIndex, value) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const idSet = new Set(ids);
    let updatedCount = 0;
    const now = Date.now();

    for (const item of this.items) {
      if (idSet.has(item.id)) {
        if (voucherIndex === 1 && item.v1 !== value) {
          item.v1 = value;
          item.updatedAt = now;
          updatedCount++;
        } else if (voucherIndex === 2 && item.v2 !== value) {
          item.v2 = value;
          item.updatedAt = now;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      this.save();
    }
    return updatedCount;
  }

  /**
   * Delete numbers by array of IDs.
   */
  deleteNumbers(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    this.pushUndoSnapshot();
    const idSet = new Set(ids);
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !idSet.has(item.id));
    const deletedCount = initialLen - this.items.length;

    if (deletedCount > 0) {
      this.save();
    }
    return deletedCount;
  }

  /**
   * Clear all numbers.
   */
  clearAll() {
    this.pushUndoSnapshot();
    const count = this.items.length;
    this.items = [];
    this.save();
    return count;
  }

  /**
   * Reset vouchers (remove X / set to false).
   * If ids is provided, only reset those items.
   * If ids is not provided or null, reset ALL items.
   */
  resetVouchers(ids = null) {
    this.pushUndoSnapshot();
    let affectedCount = 0;
    const now = Date.now();

    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      for (const item of this.items) {
        if (idSet.has(item.id)) {
          if (item.v1 || item.v2) {
            item.v1 = false;
            item.v2 = false;
            item.updatedAt = now;
            affectedCount++;
          }
        }
      }
    } else {
      for (const item of this.items) {
        if (item.v1 || item.v2) {
          item.v1 = false;
          item.v2 = false;
          item.updatedAt = now;
          affectedCount++;
        }
      }
    }

    if (affectedCount > 0) {
      this.save();
    }
    return affectedCount;
  }

  /**
   * Filter, search, and sort numbers and dividers.
   * @param {string} searchQuery - Search substring
   * @param {'all' | 'none' | 'one' | 'both'} filterStatus - Voucher status filter
   * @param {'manual' | 'newest' | 'oldest' | 'phone' | 'available-desc' | 'used-desc'} sortBy - Sort order
   */
  getFiltered(searchQuery = '', filterStatus = 'all', sortBy = 'manual') {
    const query = searchQuery ? searchQuery.trim().toLowerCase() : '';

    const filtered = this.items.filter((item, idx) => {
      // 1. Search query match
      if (query) {
        let matchesQuery = false;
        if (item.type === 'header' || item.type === 'subheader') {
          matchesQuery = Boolean(item.title && item.title.toLowerCase().includes(query));
        } else {
          matchesQuery = Boolean(item.phone && item.phone.toLowerCase().includes(query));
        }
        if (!matchesQuery) return false;
      }

      // 2. Status match
      if (filterStatus !== 'all') {
        if (item.type === 'header' || item.type === 'subheader') {
          // Check if any subsequent phone item under this divider satisfies the filter
          for (let i = idx + 1; i < this.items.length; i++) {
            const next = this.items[i];
            if (item.type === 'header' && next.type === 'header') break;
            if (item.type === 'subheader' && (next.type === 'header' || next.type === 'subheader')) break;
            if (!next.type || next.type === 'phone') {
              if (filterStatus === 'none' && !next.v1 && !next.v2) return true;
              if (filterStatus === 'one' && ((next.v1 && !next.v2) || (!next.v1 && next.v2))) return true;
              if (filterStatus === 'both' && next.v1 && next.v2) return true;
            }
          }
          return false;
        }

        if (filterStatus === 'none') {
          // Belum ditandai sama sekali (0 X)
          return !item.v1 && !item.v2;
        }
        if (filterStatus === 'one') {
          // Tepat 1 tanda X
          return (item.v1 && !item.v2) || (!item.v1 && item.v2);
        }
        if (filterStatus === 'both') {
          // 2 tanda X (sudah terpakai semua)
          return item.v1 && item.v2;
        }
      }

      return true;
    });

    // 3. Sorting: If 'manual', preserve natural sequence
    if (sortBy === 'manual') {
      return filtered;
    }

    filtered.sort((a, b) => {
      // If either item is a divider, maintain relative position if possible or prioritize dividers
      if (sortBy === 'oldest') {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortBy === 'phone') {
        const phoneA = a.phone || a.title || '';
        const phoneB = b.phone || b.title || '';
        return phoneA.localeCompare(phoneB);
      }
      if (sortBy === 'available-desc') {
        const availA = (!a.type || a.type === 'phone') ? (a.v1 ? 0 : 1) + (a.v2 ? 0 : 1) : 3;
        const availB = (!b.type || b.type === 'phone') ? (b.v1 ? 0 : 1) + (b.v2 ? 0 : 1) : 3;
        if (availB !== availA) return availB - availA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortBy === 'used-desc') {
        const usedA = (!a.type || a.type === 'phone') ? (a.v1 ? 1 : 0) + (a.v2 ? 1 : 0) : -1;
        const usedB = (!b.type || b.type === 'phone') ? (b.v1 ? 1 : 0) + (b.v2 ? 1 : 0) : -1;
        if (usedB !== usedA) return usedB - usedA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      // 'newest' default
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return filtered;
  }

  /**
   * Calculate summary statistics (only counting real phone items, ignoring dividers).
   */
  getStats() {
    const phoneItems = this.items.filter(item => !item.type || item.type === 'phone');
    const totalNumbers = phoneItems.length;
    let v1Used = 0;
    let v2Used = 0;
    let countNone = 0;
    let countOne = 0;
    let countBoth = 0;

    for (const item of phoneItems) {
      if (item.v1) v1Used++;
      if (item.v2) v2Used++;

      const usedCount = (item.v1 ? 1 : 0) + (item.v2 ? 1 : 0);
      if (usedCount === 0) countNone++;
      else if (usedCount === 1) countOne++;
      else if (usedCount === 2) countBoth++;
    }

    const totalVouchersCapacity = totalNumbers * 2;
    const totalVouchersUsed = v1Used + v2Used;
    const totalVouchersRemaining = totalVouchersCapacity - totalVouchersUsed;

    return {
      totalNumbers,
      totalVouchersCapacity,
      v1Used,
      v2Used,
      totalVouchersUsed,
      totalVouchersRemaining,
      countNone,
      countOne,
      countBoth
    };
  }

  /**
   * Export entire dataset as JSON string including dividers.
   */
  exportJSON() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      stats: this.getStats(),
      items: this.items
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import data from JSON string.
   * @param {string} jsonString
   * @param {'merge' | 'replace'} mode
   */
  importJSON(jsonString, mode = 'replace') {
    let raw;
    try {
      raw = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Format JSON tidak valid.');
    }

    let itemsToImport = [];
    if (Array.isArray(raw)) {
      itemsToImport = raw;
    } else if (raw && Array.isArray(raw.items)) {
      itemsToImport = raw.items;
    } else {
      throw new Error('Struktur data JSON tidak memiliki daftar nomor.');
    }

    const now = Date.now();
    const validItems = [];
    for (const entry of itemsToImport) {
      if (entry && (entry.type === 'header' || entry.type === 'subheader')) {
        validItems.push({
          id: entry.id || ((entry.type === 'header' ? 'hdr_' : 'sub_') + now + '_' + Math.random().toString(36).substring(2, 8)),
          type: entry.type,
          title: String(entry.title || (entry.type === 'header' ? 'JUDUL' : 'Sub Judul')),
          createdAt: entry.createdAt || now,
          updatedAt: entry.updatedAt || now
        });
      } else if (entry && entry.phone && typeof entry.phone === 'string') {
        const cleaned = entry.phone.replace(/[\s\-\.\(\)]/g, '');
        if (/^\d{8,16}$/.test(cleaned)) {
          validItems.push({
            id: entry.id || 'pn_' + now + '_' + Math.random().toString(36).substring(2, 8),
            type: 'phone',
            phone: cleaned,
            v1: Boolean(entry.v1),
            v2: Boolean(entry.v2),
            createdAt: entry.createdAt || now,
            updatedAt: entry.updatedAt || now
          });
        }
      }
    }

    let imported = 0;
    let duplicates = 0;

    if (mode === 'replace') {
      this.items = validItems;
      imported = validItems.filter(item => !item.type || item.type === 'phone').length;
    } else {
      // Merge mode: only add numbers not currently present
      const existingPhoneSet = new Set(
        this.items.filter(item => !item.type || item.type === 'phone').map(item => item.phone)
      );
      for (const item of validItems) {
        if (!item.type || item.type === 'phone') {
          if (existingPhoneSet.has(item.phone)) {
            duplicates++;
          } else {
            this.items.push(item);
            existingPhoneSet.add(item.phone);
            imported++;
          }
        } else {
          // Divider item: add if not existing by ID
          if (!this.items.some(existing => existing.id === item.id)) {
            this.items.push(item);
          }
        }
      }
    }

    this.save();
    const totalPhoneNumbers = this.items.filter(item => !item.type || item.type === 'phone').length;
    return { imported, duplicates, total: totalPhoneNumbers };
  }

  /**
   * Export dataset as CSV string, including dividers as section rows.
   */
  exportCSV() {
    const header = ['Nomor', 'Voucher 1', 'Voucher 2', 'Status'];
    const rows = this.items.map(item => {
      if (item.type === 'header') {
        return `"[JUDUL] ${item.title}","","",""`;
      }
      if (item.type === 'subheader') {
        return `"[SUB JUDUL] ${item.title}","","",""`;
      }
      const v1Text = item.v1 ? 'X' : 'Belum';
      const v2Text = item.v2 ? 'X' : 'Belum';
      const statusText = (item.v1 && item.v2) ? 'Habis' : (!item.v1 && !item.v2 ? 'Tersedia' : 'Sisa 1');
      return `"${item.phone}","${v1Text}","${v2Text}","${statusText}"`;
    });
    return [header.join(','), ...rows].join('\r\n');
  }
}
