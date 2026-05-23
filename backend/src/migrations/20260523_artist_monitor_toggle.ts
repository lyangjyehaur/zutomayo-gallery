import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('artists').catch(() => null as any);
  if (columns && !columns['twitter_monitor_enabled']) {
    await queryInterface.addColumn('artists', 'twitter_monitor_enabled', {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
      comment: '是否監聽該畫師的 Twitter 推文',
    });
    await queryInterface.sequelize.query(`
      UPDATE artists SET twitter_monitor_enabled = true WHERE twitter_monitor_enabled IS NULL AND twitter IS NOT NULL;
    `);
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('artists').catch(() => null as any);
  if (columns && columns['twitter_monitor_enabled']) {
    await queryInterface.removeColumn('artists', 'twitter_monitor_enabled');
  }
};
