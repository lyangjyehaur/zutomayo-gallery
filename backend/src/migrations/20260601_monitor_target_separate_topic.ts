import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('monitor_targets').catch(() => null as any);
  if (columns && !columns['separate_topic']) {
    await queryInterface.addColumn('monitor_targets', 'separate_topic', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: '是否將此監聽目標的通知發送到獨立 Telegram topic',
    });
    await queryInterface.sequelize.query(`
      UPDATE monitor_targets SET separate_topic = false WHERE separate_topic IS NULL;
    `);
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('monitor_targets').catch(() => null as any);
  if (columns && columns['separate_topic']) {
    await queryInterface.removeColumn('monitor_targets', 'separate_topic');
  }
};
