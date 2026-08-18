import assert from 'node:assert/strict'
import test from 'node:test'

import { safeStorageGet, safeStorageRemove, safeStorageSet } from '../src/lib/safe-storage.ts'

const throwingStorage = {
  getItem: () => { throw new Error('denied') },
  setItem: () => { throw new Error('denied') },
  removeItem: () => { throw new Error('denied') },
}

test('safe storage helpers degrade without throwing when browser storage is denied', () => {
  assert.equal(safeStorageGet('local', 'key', throwingStorage), null)
  assert.equal(safeStorageSet('local', 'key', 'value', throwingStorage), false)
  assert.equal(safeStorageRemove('session', 'key', throwingStorage), false)
})
