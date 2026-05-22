import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('monitor_targets').catch(() => null as any);
  if (existing) return;

  await queryInterface.createTable('monitor_targets', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    type: { type: DataTypes.STRING(20), allowNull: false },
    handle: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: true },
  });

  await queryInterface.addIndex('monitor_targets', ['type']);
  await queryInterface.addIndex('monitor_targets', ['enabled']);
  await queryInterface.addIndex('monitor_targets', ['type', 'handle'], {
    unique: true,
    name: 'monitor_targets_type_handle_unique',
  });
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  await queryInterface.dropTable('monitor_targets');
};
