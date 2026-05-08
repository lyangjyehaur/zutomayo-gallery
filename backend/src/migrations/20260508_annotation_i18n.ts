import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('media_annotations').catch(() => null as any);
  if (!existing) return;

  const columns = Object.keys(existing);
  if (!columns.includes('label_i18n')) {
    await queryInterface.addColumn('media_annotations', 'label_i18n', {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '多語言標註文字 (JSONB: { "zh-TW": "...", "ja": "...", ... })',
    });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('media_annotations').catch(() => null as any);
  if (!existing) return;

  const columns = Object.keys(existing);
  if (columns.includes('label_i18n')) {
    await queryInterface.removeColumn('media_annotations', 'label_i18n');
  }
};
