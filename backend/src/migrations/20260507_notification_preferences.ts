import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const tableDesc = await queryInterface.describeTable('admin_users');
  if (!('notification_preferences' in tableDesc)) {
    await queryInterface.addColumn('admin_users', 'notification_preferences', {
      type: DataTypes.JSONB,
      defaultValue: {
        staging: true,
        submission: true,
        error: true,
        crawler: true,
      },
      allowNull: false,
    });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const tableDesc = await queryInterface.describeTable('admin_users');
  if ('notification_preferences' in tableDesc) {
    await queryInterface.removeColumn('admin_users', 'notification_preferences');
  }
};
