import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('speed_surveys').catch(() => null as any);
  if (existing) return;

  await queryInterface.createTable('speed_surveys', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    url: { type: DataTypes.TEXT, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  await queryInterface.addIndex('speed_surveys', ['rating']);
  await queryInterface.addIndex('speed_surveys', ['created_at']);
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('speed_surveys').catch(() => null as any);
  if (!existing) return;
  await queryInterface.dropTable('speed_surveys');
};
