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

    it('accepts any number regardless of length, dummy numbers, foreign formats, or short numbers without validation rejection', () => {
      const raw = `
        12345
        081
        0000000000
        99999999999999999999
        +12025550123
        nomor-tanpa-digit
        8570001
      `;
      const parsed = store.parseRawNumbers(raw);
      assert.ok(parsed.includes('12345'));
      assert.ok(parsed.includes('081'));
      assert.ok(parsed.includes('0000000000'));
      assert.ok(parsed.includes('99999999999999999999'));
      assert.ok(parsed.includes('12025550123') || parsed.includes('+12025550123'));
      assert.ok(parsed.includes('8570001'));
      assert.equal(parsed.includes('nomor-tanpa-digit'), false);
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

    it('successfully adds and persists any number format without rejection', () => {
      const res = store.addNumbers('12345\n0800000\n+1999888777');
      assert.equal(res.added, 3);
      assert.equal(store.getAll().length, 3);
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

    it('imports numbers of any length without discarding them', () => {
      const json = JSON.stringify([
        { phone: '12345', v1: false, v2: false },
        { phone: '99999999999999999999', v1: true, v2: false }
      ]);
      const res = store.importJSON(json, 'replace');
      assert.equal(res.imported, 2);
      assert.equal(store.getAll().length, 2);
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

  describe('Dividers: Judul & Sub Judul', () => {
    it('adds header and subheader dividers at end, beginning, and between items', () => {
      store.addNumbers('081111111111\n082222222222\n083333333333');
      const itemsInitial = store.getAll();
      const firstPhoneId = itemsInitial[0].id;
      const secondPhoneId = itemsInitial[1].id;

      // Add Header at the very top (afterId = null)
      const hdrTop = store.addHeader('APLIKASI UTAMA', null);
      assert.equal(hdrTop.type, 'header');
      assert.equal(hdrTop.title, 'APLIKASI UTAMA');
      assert.ok(hdrTop.id.startsWith('hdr_'));

      let items = store.getAll();
      assert.equal(items[0].id, hdrTop.id);
      assert.equal(items[1].id, firstPhoneId);

      // Add Subheader between first and second phone (afterId = firstPhoneId)
      const sub1 = store.addSubheader('Sub 1', firstPhoneId);
      assert.equal(sub1.type, 'subheader');
      assert.equal(sub1.title, 'Sub 1');
      assert.ok(sub1.id.startsWith('sub_'));

      items = store.getAll();
      const firstIndex = items.findIndex(i => i.id === firstPhoneId);
      assert.equal(items[firstIndex + 1].id, sub1.id);
      assert.equal(items[firstIndex + 2].id, secondPhoneId);

      // Add another Subheader after second phone
      const sub2 = store.addSubheader('Sub 2', secondPhoneId);
      items = store.getAll();
      const secondIndex = items.findIndex(i => i.id === secondPhoneId);
      assert.equal(items[secondIndex + 1].id, sub2.id);
    });

    it('updates divider title', () => {
      const hdr = store.addHeader('APLIKASI 1');
      assert.equal(store.getItem(hdr.id).title, 'APLIKASI 1');

      const success = store.updateDividerTitle(hdr.id, 'APLIKASI DANA BARU');
      assert.equal(success, true);
      assert.equal(store.getItem(hdr.id).title, 'APLIKASI DANA BARU');
    });

    it('deletes divider and supports undo', () => {
      store.addNumbers('081111111111');
      const hdr = store.addHeader('APLIKASI 1');
      assert.equal(store.getAll().length, 2);

      const deleted = store.deleteDivider(hdr.id);
      assert.equal(deleted, true);
      assert.equal(store.getAll().length, 1);
      assert.equal(store.getItem(hdr.id), null);

      // Undo deletion
      store.undo();
      assert.equal(store.getAll().length, 2);
      assert.equal(store.getItem(hdr.id).title, 'APLIKASI 1');
    });

    it('moves item up and down', () => {
      store.addNumbers('081111111111\n082222222222');
      const hdr = store.addHeader('APLIKASI 1', null); // [hdr, phone1, phone2]
      assert.equal(store.getAll()[0].id, hdr.id);

      // Move hdr down -> [phone1, hdr, phone2]
      const movedDown = store.moveItem(hdr.id, 'down');
      assert.equal(movedDown, true);
      assert.equal(store.getAll()[1].id, hdr.id);

      // Move hdr up -> back to [hdr, phone1, phone2]
      const movedUp = store.moveItem(hdr.id, 'up');
      assert.equal(movedUp, true);
      assert.equal(store.getAll()[0].id, hdr.id);

      // Cannot move up beyond top
      const movedTopAgain = store.moveItem(hdr.id, 'up');
      assert.equal(movedTopAgain, false);
    });

    it('keeps getStats accurate by ignoring dividers', () => {
      store.addNumbers('081111111111\n082222222222');
      store.addHeader('APLIKASI 1');
      store.addSubheader('Batch 1');
      store.addHeader('APLIKASI 2');

      const stats = store.getStats();
      assert.equal(stats.totalNumbers, 2);
      assert.equal(stats.totalVouchersCapacity, 4);
      assert.equal(stats.totalVouchersRemaining, 4);
      assert.equal(stats.totalVouchersUsed, 0);
    });

    it('preserves array sequence in manual sort and filters search', () => {
      const hdr1 = store.addHeader('SHOPEE VIP');
      store.addNumbers('081234567890');
      const sub1 = store.addSubheader('Gelombang 1', store.getAll()[1].id);
      store.addNumbers('089876543210');

      const manualItems = store.getFiltered('', 'all', 'manual');
      assert.equal(manualItems.length, 4);
      assert.equal(manualItems[0].id, hdr1.id);
      assert.equal(manualItems[2].id, sub1.id);

      // Search matches header title
      const searchHdr = store.getFiltered('shopee', 'all', 'manual');
      assert.equal(searchHdr.length, 1);
      assert.equal(searchHdr[0].title, 'SHOPEE VIP');

      // Search matches phone number
      const searchPhone = store.getFiltered('8765', 'all', 'manual');
      assert.equal(searchPhone.length, 1);
      assert.equal(searchPhone[0].phone, '089876543210');
    });

    it('exports and imports dividers via JSON and CSV', () => {
      const hdr = store.addHeader('APLIKASI 1');
      store.addNumbers('081122334455');
      const sub = store.addSubheader('1', store.getAll()[1].id);

      // JSON export & import
      const json = store.exportJSON();
      const restoredStore = new PhoneStore(new MemoryStorage());
      restoredStore.importJSON(json, 'replace');

      const restoredItems = restoredStore.getAll();
      assert.equal(restoredItems.length, 3);
      assert.equal(restoredItems[0].type, 'header');
      assert.equal(restoredItems[0].title, 'APLIKASI 1');
      assert.equal(restoredItems[1].phone, '081122334455');
      assert.equal(restoredItems[2].type, 'subheader');
      assert.equal(restoredItems[2].title, '1');

      // CSV export
      const csv = store.exportCSV();
      assert.ok(csv.includes('[JUDUL] APLIKASI 1'));
      assert.ok(csv.includes('[SUB JUDUL] 1'));
    });
  });
});
