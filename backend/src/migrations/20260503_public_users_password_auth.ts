import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const table = await queryInterface.describeTable('public_users').catch(() => null as any);
  if (!table) return;

  if (!table.password_hash) {
    await queryInterface.addColumn('public_users', 'password_hash', { type: DataTypes.TEXT, allowNull: true });
  }
  if (!table.email_verified_at) {
    await queryInterface.addColumn('public_users', 'email_verified_at', { type: DataTypes.DATE, allowNull: true });
  }

  const tokenTable = await queryInterface.describeTable('public_auth_tokens').catch(() => null as any);
  if (tokenTable && !tokenTable.purpose) {
    await queryInterface.addColumn('public_auth_tokens', 'purpose', { type: DataTypes.STRING, allowNull: false, defaultValue: 'login' });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const table = await queryInterface.describeTable('public_users').catch(() => null as any);
  if (table?.password_hash) await queryInterface.removeColumn('public_users', 'password_hash');
  if (table?.email_verified_at) await queryInterface.removeColumn('public_users', 'email_verified_at');
  const tokenTable = await queryInterface.describeTable('public_auth_tokens').catch(() => null as any);
  if (tokenTable?.purpose) await queryInterface.removeColumn('public_auth_tokens', 'purpose');
};
