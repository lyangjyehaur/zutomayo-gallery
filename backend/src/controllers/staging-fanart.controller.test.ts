import assert from 'node:assert/strict';
import test from 'node:test';

test('applyStagingReviewAction serializes the status transition with a row lock', async () => {
  process.env.MEILI_HOST = process.env.MEILI_HOST || 'http://127.0.0.1:7700';
  process.env.TELEGRAM_API_BASE_URL = process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';

  const [{ StagingFanartModel, sequelize }, { applyStagingReviewAction }] = await Promise.all([
    import('../models/index.js'),
    import('./staging-fanart.controller.js'),
  ]);

  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const mutableSequelize = sequelize as any;
  const mutableStagingModel = StagingFanartModel as any;
  const originalTransaction = mutableSequelize.transaction;
  const originalFindByPk = mutableStagingModel.findByPk;
  let status = 'pending';
  let updateOptions: any;
  let reloadOptions: any;

  const staging = {
    get: (field: string) => field === 'status' ? status : undefined,
    update: async (values: { status: string }, options: any) => {
      status = values.status;
      updateOptions = options;
    },
    reload: async (options: any) => {
      reloadOptions = options;
    },
  };

  mutableSequelize.transaction = async (callback: (tx: any) => Promise<unknown>) => callback(transaction);
  mutableStagingModel.findByPk = async (id: string, options: any) => {
    assert.equal(id, 'staging-1');
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, 'UPDATE');
    return staging;
  };

  try {
    const result = await applyStagingReviewAction('staging-1', 'approve');

    assert.deepEqual(result, {
      id: 'staging-1',
      action: 'approve',
      status: 'reviewed',
      changed: true,
      alreadyProcessed: false,
    });
    assert.equal(updateOptions.transaction, transaction);
    assert.equal(reloadOptions.transaction, transaction);
  } finally {
    mutableSequelize.transaction = originalTransaction;
    mutableStagingModel.findByPk = originalFindByPk;
  }
});
