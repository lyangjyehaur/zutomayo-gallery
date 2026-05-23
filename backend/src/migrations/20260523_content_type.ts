import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  // monitor_targets 加 content_type 欄位
  const mtColumns = await queryInterface.describeTable('monitor_targets').catch(() => null as any);
  if (mtColumns && !mtColumns['content_type']) {
    await queryInterface.addColumn('monitor_targets', 'content_type', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'fanart',
      comment: '內容分類: fanart | official',
    });
    // 現有的 manual targets 預設為 fanart（維持旧行為）
    await queryInterface.sequelize.query(`
      UPDATE monitor_targets SET content_type = 'fanart' WHERE content_type IS NULL;
    `);
  }

  // staging_fanarts 加 content_type 欄位
  const sfColumns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (sfColumns && !sfColumns['content_type']) {
    await queryInterface.addColumn('staging_fanarts', 'content_type', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'fanart',
      comment: '內容分類: fanart | official',
    });
    // 現有的 staging 資料預設為 fanart（維持旧行為）
    await queryInterface.sequelize.query(`
      UPDATE staging_fanarts SET content_type = 'fanart' WHERE content_type IS NULL;
    `);
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const sfColumns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (sfColumns && sfColumns['content_type']) {
    await queryInterface.removeColumn('staging_fanarts', 'content_type');
  }

  const mtColumns = await queryInterface.describeTable('monitor_targets').catch(() => null as any);
  if (mtColumns && mtColumns['content_type']) {
    await queryInterface.removeColumn('monitor_targets', 'content_type');
  }
};
