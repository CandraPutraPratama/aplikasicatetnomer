import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PhoneStore } from '../js/store.js';

class MockStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) { return this.map.get(k) || null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

describe('End-to-End User Story & Workflow Simulation', () => {

  it('Verifies all essential files exist and are non-empty', () => {
    const requiredFiles = [
      'index.html',
      'css/style.css',
      'js/app.js',
      'js/store.js',
      'js/ui.js',
      'manifest.json',
      'sw.js',
      'icons/icon.svg'
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.resolve(relPath);
      assert.ok(fs.existsSync(fullPath), `File ${relPath} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 0, `File ${relPath} should not be empty`);
    }
  });

  it('Simulates complete user flow: Bulk Add -> Mark Vouchers -> Search/Filter -> Bulk Reset -> Bulk Delete -> Backup', () => {
    const storage = new MockStorage();
    const store = new PhoneStore(storage);

    // 1. User pastes 5 numbers from clipboard with messy formats
    const clipboardPaste = `
      0812-1111-2222
      +62 813 3333 4444
      085755556666, 089977778888
      6281199990000
    `;
    const addResult = store.addNumbers(clipboardPaste);
    assert.equal(addResult.added, 5, 'Should parse and add exactly 5 valid numbers');
    assert.equal(addResult.duplicates, 0);

    let allItems = store.getAll();
    assert.equal(allItems.length, 5);

    // 2. Mark Voucher 1 used (X) on item 0
    store.toggleVoucher(allItems[0].id, 1);
    assert.equal(store.getItem(allItems[0].id).v1, true);
    assert.equal(store.getItem(allItems[0].id).v2, false);

    // 3. Mark Voucher 1 & 2 used (X) on item 1
    store.toggleVoucher(allItems[1].id, 1);
    store.toggleVoucher(allItems[1].id, 2);
    assert.equal(store.getItem(allItems[1].id).v1, true);
    assert.equal(store.getItem(allItems[1].id).v2, true);

    // 4. Test Filtering
    // None: 3 items (items 2, 3, 4)
    // One: 1 item (item 0)
    // Both: 1 item (item 1)
    const filterNone = store.getFiltered('', 'none');
    assert.equal(filterNone.length, 3);
    const filterOne = store.getFiltered('', 'one');
    assert.equal(filterOne.length, 1);
    assert.equal(filterOne[0].id, allItems[0].id);
    const filterBoth = store.getFiltered('', 'both');
    assert.equal(filterBoth.length, 1);
    assert.equal(filterBoth[0].id, allItems[1].id);

    // Search by prefix
    const searchRes = store.getFiltered('0813', 'all');
    assert.equal(searchRes.length, 1);
    assert.equal(searchRes[0].phone, '081333334444');

    // 5. Test Statistics
    const stats = store.getStats();
    assert.equal(stats.totalNumbers, 5);
    assert.equal(stats.totalVouchersCapacity, 10);
    assert.equal(stats.v1Used, 2);
    assert.equal(stats.v2Used, 1);
    assert.equal(stats.totalVouchersUsed, 3);
    assert.equal(stats.totalVouchersRemaining, 7);

    // 6. Bulk Reset on selected items (item 0)
    store.resetVouchers([allItems[0].id]);
    assert.equal(store.getItem(allItems[0].id).v1, false);
    assert.equal(store.getItem(allItems[0].id).v2, false);
    // Item 1 still has vouchers used
    assert.equal(store.getItem(allItems[1].id).v1, true);

    // 7. Global Reset on all items
    store.resetVouchers();
    assert.equal(store.getItem(allItems[1].id).v1, false);
    assert.equal(store.getItem(allItems[1].id).v2, false);
    assert.equal(store.getStats().totalVouchersUsed, 0);

    // 8. Bulk Delete selected items (item 3 and item 4)
    const deletedCount = store.deleteNumbers([allItems[3].id, allItems[4].id]);
    assert.equal(deletedCount, 2);
    assert.equal(store.getAll().length, 3);

    // 9. Export & Import persistence
    const exportedJson = store.exportJSON();
    assert.ok(exportedJson.length > 50);

    // Fresh store instance with new storage, import backup
    const newStorage = new MockStorage();
    const restoredStore = new PhoneStore(newStorage);
    restoredStore.importJSON(exportedJson, 'replace');
    assert.equal(restoredStore.getAll().length, 3);

    // 10. Verify LocalStorage automatic reload
    const persistentStore = new PhoneStore(storage);
    assert.equal(persistentStore.getAll().length, 3);
  });

  it('Simulates complete user flow for Section Dividers: Insert Judul -> Insert Sub Judul -> Reorder -> Edit -> Backup', () => {
    const storage = new MockStorage();
    const store = new PhoneStore(storage);

    // 1. User starts with 4 phone numbers
    store.addNumbers('081200000001\n081200000002\n081200000003\n081200000004');
    let items = store.getAll();
    assert.equal(items.length, 4);

    // 2. User adds Judul "APLIKASI 1" at the very top
    const hdr1 = store.addHeader('APLIKASI 1', null);
    items = store.getAll();
    assert.equal(items[0].id, hdr1.id);
    assert.equal(items[0].type, 'header');
    assert.equal(items[0].title, 'APLIKASI 1');

    // 3. User inserts Sub Judul "1" right below Judul APLIKASI 1
    const sub1 = store.addSubheader('1', hdr1.id);
    items = store.getAll();
    assert.equal(items[1].id, sub1.id);
    assert.equal(items[1].type, 'subheader');
    assert.equal(items[1].title, '1');

    // 4. User inserts Sub Judul "2" after second phone number (081200000002)
    const phone2 = items.find(i => i.phone === '081200000002');
    const sub2 = store.addSubheader('2', phone2.id);
    items = store.getAll();
    const phone2Index = items.findIndex(i => i.id === phone2.id);
    assert.equal(items[phone2Index + 1].id, sub2.id);
    assert.equal(items[phone2Index + 1].title, '2');

    // 5. User adds Judul "APLIKASI 2" at the bottom of the list
    const hdr2 = store.addHeader('APLIKASI 2', 'bottom');
    items = store.getAll();
    assert.equal(items[items.length - 1].id, hdr2.id);
    assert.equal(items[items.length - 1].title, 'APLIKASI 2');

    // 6. User renames "APLIKASI 2" to "APLIKASI SHOPEE"
    store.updateDividerTitle(hdr2.id, 'APLIKASI SHOPEE');
    assert.equal(store.getItem(hdr2.id).title, 'APLIKASI SHOPEE');

    // 7. Stats check: Total numbers must strictly remain 4 (dividers not counted as phone numbers)
    const stats = store.getStats();
    assert.equal(stats.totalNumbers, 4);
    assert.equal(stats.totalVouchersCapacity, 8);
    assert.equal(stats.totalVouchersRemaining, 8);

    // 8. Move item: Move Sub 2 up
    const sub2IdxBefore = store.getAll().findIndex(i => i.id === sub2.id);
    store.moveItem(sub2.id, 'up');
    const sub2IdxAfter = store.getAll().findIndex(i => i.id === sub2.id);
    assert.equal(sub2IdxAfter, sub2IdxBefore - 1);

    // 9. Search: filter by "shopee" matches divider
    const searchRes = store.getFiltered('shopee', 'all', 'manual');
    assert.equal(searchRes.length, 1);
    assert.equal(searchRes[0].title, 'APLIKASI SHOPEE');

    // 10. Backup JSON and restore: verifies relative order is 100% preserved
    const json = store.exportJSON();
    const newStorage = new MockStorage();
    const restoredStore = new PhoneStore(newStorage);
    restoredStore.importJSON(json, 'replace');

    const restoredItems = restoredStore.getAll();
    assert.equal(restoredItems.length, store.getAll().length);
    assert.equal(restoredItems[0].title, 'APLIKASI 1');
    assert.equal(restoredItems[1].title, '1');

    // 11. CSV export includes sections
    const csv = store.exportCSV();
    assert.ok(csv.includes('[JUDUL] APLIKASI 1'));
    assert.ok(csv.includes('[SUB JUDUL] 1'));
    assert.ok(csv.includes('[JUDUL] APLIKASI SHOPEE'));
  });

  it('Simulates acceptance of all kinds of numbers without validation rejection', () => {
    const storage = new MockStorage();
    const store = new PhoneStore(storage);

    // Mixed input: short numbers, dummy non-existent numbers, long numbers, foreign numbers
    const mixedInput = `
      12345
      0800000000
      99999999999999999999
      +12025550123
      081
    `;
    const result = store.addNumbers(mixedInput);
    assert.equal(result.added, 5, 'Must accept all 5 numbers regardless of length or validity');

    const items = store.getAll();
    assert.equal(items.length, 5);
    assert.ok(items.some(i => i.phone === '12345'));
    assert.ok(items.some(i => i.phone === '0800000000'));
    assert.ok(items.some(i => i.phone === '99999999999999999999'));
    assert.ok(items.some(i => i.phone === '081'));

    // Toggle voucher on short number
    const shortItem = items.find(i => i.phone === '12345');
    store.toggleVoucher(shortItem.id, 1);
    assert.equal(store.getItem(shortItem.id).v1, true);

    // Export & re-import preserves all
    const json = store.exportJSON();
    const restored = new PhoneStore(new MockStorage());
    restored.importJSON(json, 'replace');
    assert.equal(restored.getAll().length, 5);
  });
});
