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
    this.load();
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
   * Returns statistics about added vs duplicate numbers.
   */
  addNumbers(rawText) {
    const parsedNumbers = this.parseRawNumbers(rawText);
    const existingSet = new Set(this.items.map(item => item.phone));

    let added = 0;
    let duplicates = 0;
    const now = Date.now();

    for (const phone of parsedNumbers) {
      if (existingSet.has(phone)) {
        duplicates++;
      } else {
        const newItem = {
          id: 'pn_' + now + '_' + Math.random().toString(36).substring(2, 8),
          phone,
          v1: false,
          v2: false,
          createdAt: now,
          updatedAt: now
        };
        this.items.push(newItem);
        existingSet.add(phone);
        added++;
      }
    }

    if (added > 0) {
      this.save();
    }

    return { added, duplicates, total: this.items.length };
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
   * Filter and search numbers.
   * @param {string} searchQuery - Search substring
   * @param {'all' | 'none' | 'one' | 'both'} filterStatus - Voucher status filter
   */
  getFiltered(searchQuery = '', filterStatus = 'all') {
    const query = searchQuery ? searchQuery.trim().toLowerCase() : '';

    return this.items.filter(item => {
      // 1. Search query match
      if (query && !item.phone.toLowerCase().includes(query)) {
        return false;
      }

      // 2. Status match
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

      // 'all'
      return true;
    });
  }

  /**
   * Calculate summary statistics.
   */
  getStats() {
    const totalNumbers = this.items.length;
    let v1Used = 0;
    let v2Used = 0;
    let countNone = 0;
    let countOne = 0;
    let countBoth = 0;

    for (const item of this.items) {
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
   * Export entire dataset as JSON string.
   */
  exportJSON() {
    const payload = {
      version: 1,
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
      if (entry && entry.phone && typeof entry.phone === 'string') {
        const cleaned = entry.phone.replace(/[\s\-\.\(\)]/g, '');
        if (/^\d{8,16}$/.test(cleaned)) {
          validItems.push({
            id: entry.id || 'pn_' + now + '_' + Math.random().toString(36).substring(2, 8),
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
      imported = validItems.length;
    } else {
      // Merge mode: only add numbers not currently present
      const existingSet = new Set(this.items.map(item => item.phone));
      for (const item of validItems) {
        if (existingSet.has(item.phone)) {
          duplicates++;
        } else {
          this.items.push(item);
          existingSet.add(item.phone);
          imported++;
        }
      }
    }

    this.save();
    return { imported, duplicates, total: this.items.length };
  }

  /**
   * Export dataset as CSV string.
   */
  exportCSV() {
    const header = ['Nomor', 'Voucher 1', 'Voucher 2', 'Status'];
    const rows = this.items.map(item => {
      const v1Text = item.v1 ? 'X' : 'Belum';
      const v2Text = item.v2 ? 'X' : 'Belum';
      const statusText = (item.v1 && item.v2) ? 'Habis' : (!item.v1 && !item.v2 ? 'Tersedia' : 'Sisa 1');
      return `"${item.phone}","${v1Text}","${v2Text}","${statusText}"`;
    });
    return [header.join(','), ...rows].join('\r\n');
  }
}
