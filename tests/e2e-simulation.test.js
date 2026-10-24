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
});
