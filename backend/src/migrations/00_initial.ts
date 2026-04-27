import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  // Example: Create a new table or add columns for cross-version migration
  // await queryInterface.createTable('system_settings', {
  //   key: { type: DataTypes.STRING, primaryKey: true },
  //   value: { type: DataTypes.JSONB },
  //   createdAt: { type: DataTypes.DATE },
  //   updatedAt: { type: DataTypes.DATE },
  // });
  console.log('Migration 00_initial executed successfully');
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  // await queryInterface.dropTable('system_settings');
  console.log('Migration 00_initial reverted successfully');
};
