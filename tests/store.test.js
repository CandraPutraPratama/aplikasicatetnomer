import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PhoneStore } from '../js/store.js';

// Mock storage for Node test environment
class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('PhoneStore - Core Data Layer', () => {
  let store;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MemoryStorage();
    store = new PhoneStore(mockStorage);
  });

  describe('parseRawNumbers', () => {
    it('cleans and extracts phone numbers from various formats', () => {
      const raw = `
        0812-3456-7890
        +62 813 9988 7766, 0857.1122.3344
        081234567890   (duplicate)
        invalid-text-here
        08991234567
      `;
      const parsed = store.parseRawNumbers(raw);
      // Normalized to 08... standard format
      assert.deepEqual(parsed, [
        '081234567890',
        '081399887766',
        '085711223344',
        '08991234567'
      ]);
    });

    it('handles +62 and converts to 08 properly', () => {
      const parsed = store.parseRawNumbers('+628123456789\n6285211223344');
      assert.deepEqual(parsed, ['08123456789', '085211223344']);
    });
  });

  describe('addNumbers & persistence', () => {
    it('adds new numbers with initial status false for v1 and v2', () => {
      const result = store.addNumbers('081234567890\n081234567891');
      assert.equal(result.added, 2);
      assert.equal(result.duplicates, 0);

      const items = store.getAll();
      assert.equal(items.length, 2);
      assert.equal(items[0].phone, '081234567890');
      assert.equal(items[0].v1, false);
      assert.equal(items[0].v2, false);
      assert.ok(items[0].id);

      // Verify persistent in storage
      const restoredStore = new PhoneStore(mockStorage);
      assert.equal(restoredStore.getAll().length, 2);
    });

    it('identifies and skips duplicate numbers already in store', () => {
      store.addNumbers('081234567890');
      const result = store.addNumbers('081234567890\n089999999999');
      assert.equal(result.added, 1);
      assert.equal(result.duplicates, 1);
      assert.equal(store.getAll().length, 2);
    });
  });

  describe('toggleVoucher', () => {
    it('toggles v1 and v2 independently', () => {
      store.addNumbers('081234567890');
      const item = store.getAll()[0];

      // Toggle V1
      store.toggleVoucher(item.id, 1);
      assert.equal(store.getItem(item.id).v1, true);
      assert.equal(store.getItem(item.id).v2, false);

      // Toggle V2
      store.toggleVoucher(item.id, 2);
      assert.equal(store.getItem(item.id).v1, true);
      assert.equal(store.getItem(item.id).v2, true);

      // Untoggle V1 back to false
      store.toggleVoucher(item.id, 1);
      assert.equal(store.getItem(item.id).v1, false);
      assert.equal(store.getItem(item.id).v2, true);
    });
  });

  describe('deleteNumbers', () => {
    it('deletes selected numbers', () => {
      store.addNumbers('081111111111\n082222222222\n083333333333');
      const items = store.getAll();
      const idsToDelete = [items[0].id, items[2].id];

      const deletedCount = store.deleteNumbers(idsToDelete);
      assert.equal(deletedCount, 2);
      assert.equal(store.getAll().length, 1);
      assert.equal(store.getAll()[0].phone, '082222222222');
    });

    it('can clear all numbers', () => {
      store.addNumbers('081111111111\n082222222222');
      store.clearAll();
      assert.equal(store.getAll().length, 0);
    });
  });

  describe('resetVouchers massal', () => {
    it('resets vouchers for selected numbers only', () => {
      store.addNumbers('081111111111\n082222222222');
      const items = store.getAll();
      store.toggleVoucher(items[0].id, 1);
      store.toggleVoucher(items[0].id, 2);
      store.toggleVoucher(items[1].id, 1);

      // Reset only first item
      store.resetVouchers([items[0].id]);
      assert.equal(store.getItem(items[0].id).v1, false);
      assert.equal(store.getItem(items[0].id).v2, false);
      // Second item unchanged
      assert.equal(store.getItem(items[1].id).v1, true);
    });

    it('resets vouchers for ALL numbers when no ids are specified', () => {
      store.addNumbers('081111111111\n082222222222');
      const items = store.getAll();
      store.toggleVoucher(items[0].id, 1);
      store.toggleVoucher(items[1].id, 2);

      store.resetVouchers();
      assert.equal(store.getItem(items[0].id).v1, false);
      assert.equal(store.getItem(items[1].id).v2, false);
    });
  });

  describe('filtering & search', () => {
    beforeEach(() => {
      store.addNumbers('081200000001\n081200000002\n081300000003\n081400000004');
      const items = store.getAll();
      // Item 0: 0 X (none)
      // Item 1: 1 X (v1)
      store.toggleVoucher(items[1].id, 1);
      // Item 2: 1 X (v2)
      store.toggleVoucher(items[2].id, 2);
      // Item 3: 2 X (v1 and v2)
      store.toggleVoucher(items[3].id, 1);
      store.toggleVoucher(items[3].id, 2);
    });

    it('filters by status: none, one, both, all', () => {
      assert.equal(store.getFiltered('', 'all').length, 4);
      assert.equal(store.getFiltered('', 'none').length, 1); // item 0
      assert.equal(store.getFiltered('', 'one').length, 2);  // item 1 & 2
      assert.equal(store.getFiltered('', 'both').length, 1); // item 3
    });

    it('filters by search keyword', () => {
      assert.equal(store.getFiltered('0813', 'all').length, 1);
      assert.equal(store.getFiltered('0000', 'all').length, 4);
      assert.equal(store.getFiltered('9999', 'all').length, 0);
    });

    it('combines search keyword and status filter', () => {
      // 0812 contains item 0 (none) and item 1 (one)
      const res = store.getFiltered('0812', 'one');
      assert.equal(res.length, 1);
      assert.equal(res[0].phone, '081200000002');
    });

    it('sorts by phone ascending and status available-desc', () => {
      const sortedByPhone = store.getFiltered('', 'all', 'phone');
      assert.equal(sortedByPhone[0].phone, '081200000001');
      assert.equal(sortedByPhone[3].phone, '081400000004');

      const sortedByAvailable = store.getFiltered('', 'all', 'available-desc');
      // item 0 has 2 available (none used) -> should be first
      assert.equal(sortedByAvailable[0].phone, '081200000001');
      // item 3 has 0 available (both used) -> should be last
      assert.equal(sortedByAvailable[3].phone, '081400000004');
    });
  });

  describe('undo functionality', () => {
    it('restores deleted items on undo', () => {
      store.addNumbers('081111111111\n082222222222');
      const items = store.getAll();
      store.deleteNumbers([items[0].id]);
      assert.equal(store.getAll().length, 1);

      const undoSuccess = store.undo();
      assert.equal(undoSuccess, true);
      assert.equal(store.getAll().length, 2);
    });

    it('restores voucher status after reset vouchers on undo', () => {
      store.addNumbers('081111111111');
      const item = store.getAll()[0];
      store.toggleVoucher(item.id, 1);
      store.toggleVoucher(item.id, 2);

      store.resetVouchers();
      assert.equal(store.getItem(item.id).v1, false);

      store.undo();
      assert.equal(store.getItem(item.id).v1, true);
      assert.equal(store.getItem(item.id).v2, true);
    });
  });

  describe('statistics calculation', () => {
    it('calculates totals accurately', () => {
      store.addNumbers('081111111111\n082222222222\n083333333333');
      const items = store.getAll();
      store.toggleVoucher(items[0].id, 1); // 1 X
      store.toggleVoucher(items[1].id, 1);
      store.toggleVoucher(items[1].id, 2); // 2 X

      const stats = store.getStats();
      assert.equal(stats.totalNumbers, 3);
      assert.equal(stats.totalVouchersCapacity, 6);
      assert.equal(stats.v1Used, 2);
      assert.equal(stats.v2Used, 1);
      assert.equal(stats.totalVouchersUsed, 3);
      assert.equal(stats.totalVouchersRemaining, 3);
      assert.equal(stats.countNone, 1);
      assert.equal(stats.countOne, 1);
      assert.equal(stats.countBoth, 1);
    });
  });

  describe('export & import', () => {
    it('exports and imports JSON with replace mode', () => {
      store.addNumbers('081111111111\n082222222222');
      const json = store.exportJSON();
      assert.ok(json.includes('081111111111'));

      const newStore = new PhoneStore(new MemoryStorage());
      const result = newStore.importJSON(json, 'replace');
      assert.equal(result.imported, 2);
      assert.equal(newStore.getAll().length, 2);
    });

    it('imports JSON with merge mode', () => {
      store.addNumbers('081111111111');
      const backupData = JSON.stringify([
        { id: 'custom-1', phone: '081111111111', v1: true, v2: false },
        { id: 'custom-2', phone: '082222222222', v1: false, v2: true }
      ]);

      const result = store.importJSON(backupData, 'merge');
      // duplicate phone 081111111111 skipped or merged
      assert.equal(store.getAll().length, 2);
      assert.equal(result.imported, 1);
      assert.equal(result.duplicates, 1);
    });

    it('exports CSV formatted string', () => {
      store.addNumbers('081111111111');
      const items = store.getAll();
      store.toggleVoucher(items[0].id, 1);
      const csv = store.exportCSV();
      assert.ok(csv.includes('Nomor,Voucher 1,Voucher 2'));
      assert.ok(csv.includes('"081111111111","X","Belum"'));
    });
  });
});
