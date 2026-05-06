import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('backend_error_logs').catch(() => null as any);
  if (existing) return;

  await queryInterface.createTable('backend_error_logs', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    source: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    stack: { type: DataTypes.TEXT, allowNull: true },
    status_code: { type: DataTypes.INTEGER, allowNull: true },
    error_code: { type: DataTypes.STRING, allowNull: true },
    method: { type: DataTypes.STRING(10), allowNull: true },
    url: { type: DataTypes.TEXT, allowNull: true },
    request_id: { type: DataTypes.STRING, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSONB, allowNull: true },
    resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
    resolved_by: { type: DataTypes.STRING, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  await queryInterface.addIndex('backend_error_logs', ['source']);
  await queryInterface.addIndex('backend_error_logs', ['status_code']);
  await queryInterface.addIndex('backend_error_logs', ['error_code']);
  await queryInterface.addIndex('backend_error_logs', ['resolved']);
  await queryInterface.addIndex('backend_error_logs', ['created_at']);
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('backend_error_logs').catch(() => null as any);
  if (!existing) return;
  await queryInterface.dropTable('backend_error_logs');
};
