import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (columns && !columns['retweeted_by_handle']) {
    await queryInterface.addColumn('staging_fanarts', 'retweeted_by_handle', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '轉發此推文的官方帳號 handle（用於標記官方帳號轉發）',
    });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const columns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (columns && columns['retweeted_by_handle']) {
    await queryInterface.removeColumn('staging_fanarts', 'retweeted_by_handle');
  }
};
