import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('admin_users').catch(() => null as any);
  if (columns && !columns['api_token']) {
    await queryInterface.addColumn('admin_users', 'api_token', {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
      comment: 'API Token（供 Apple Shortcut 等外部工具認證）',
    });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('admin_users').catch(() => null as any);
  if (columns && columns['api_token']) {
    await queryInterface.removeColumn('admin_users', 'api_token');
  }
};
