import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('media_annotations').catch(() => null as any);
  if (existing) {
    const columns = Object.keys(existing);
    const addIfMissing = async (name: string, def: any) => {
      if (!columns.includes(name)) {
        await queryInterface.addColumn('media_annotations', name, def);
      }
    };

    await addIfMissing('id', { type: DataTypes.STRING(36), primaryKey: true });
    await addIfMissing('media_id', { type: DataTypes.STRING(36), allowNull: false });
    await addIfMissing('label', { type: DataTypes.TEXT, allowNull: false });
    await addIfMissing('x', { type: DataTypes.DECIMAL(6, 3), allowNull: false });
    await addIfMissing('y', { type: DataTypes.DECIMAL(6, 3), allowNull: false });
    await addIfMissing('style', { type: DataTypes.STRING(50), defaultValue: 'default' });
    await addIfMissing('sort_order', { type: DataTypes.INTEGER, defaultValue: 0 });
    await addIfMissing('created_by', { type: DataTypes.STRING(36), allowNull: true });
    await addIfMissing('created_at', { type: DataTypes.DATE, defaultValue: DataTypes.NOW });
    await addIfMissing('updated_at', { type: DataTypes.DATE, defaultValue: DataTypes.NOW });
    return;
  }

  await queryInterface.createTable('media_annotations', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    media_id: { type: DataTypes.STRING(36), allowNull: false },
    label: { type: DataTypes.TEXT, allowNull: false },
    x: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    y: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    style: { type: DataTypes.STRING(50), defaultValue: 'default' },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_by: { type: DataTypes.STRING(36), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  await queryInterface.addIndex('media_annotations', ['media_id']);
  await queryInterface.addIndex('media_annotations', ['created_at']);
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('media_annotations').catch(() => null as any);
  if (!existing) return;
  await queryInterface.dropTable('media_annotations');
};
