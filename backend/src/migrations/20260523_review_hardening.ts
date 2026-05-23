import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const mediaColumns = await queryInterface.describeTable('media').catch(() => null as any);
  if (mediaColumns && !mediaColumns['original_thumbnail_url']) {
    await queryInterface.addColumn('media', 'original_thumbnail_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE media
         SET original_thumbnail_url = thumbnail_url
       WHERE thumbnail_url IS NOT NULL
         AND original_thumbnail_url IS NULL;
    `);
  }

  const stagingColumns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (stagingColumns && !stagingColumns['original_thumbnail_url']) {
    await queryInterface.addColumn('staging_fanarts', 'original_thumbnail_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }

  const indexes = await queryInterface.showIndex('staging_fanarts').catch(() => [] as any[]);
  const hasUniqueMediaIndex = Array.isArray(indexes) && indexes.some((idx: any) => idx.name === 'staging_fanarts_tweet_id_media_url_unique');

  if (!hasUniqueMediaIndex) {
    await queryInterface.sequelize.query(`
      UPDATE staging_fanarts AS dup
         SET media_url = NULL
        FROM (
          SELECT id
            FROM (
              SELECT id,
                     ROW_NUMBER() OVER (
                       PARTITION BY tweet_id, media_url
                       ORDER BY created_at ASC NULLS LAST, id ASC
                     ) AS rn
                FROM staging_fanarts
               WHERE media_url IS NOT NULL
            ) ranked
           WHERE ranked.rn > 1
        ) targets
       WHERE dup.id = targets.id;
    `);

    await queryInterface.addIndex('staging_fanarts', ['tweet_id', 'media_url'], {
      unique: true,
      name: 'staging_fanarts_tweet_id_media_url_unique',
    });
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const stagingIndexes = await queryInterface.showIndex('staging_fanarts').catch(() => [] as any[]);
  if (Array.isArray(stagingIndexes) && stagingIndexes.some((idx: any) => idx.name === 'staging_fanarts_tweet_id_media_url_unique')) {
    await queryInterface.removeIndex('staging_fanarts', 'staging_fanarts_tweet_id_media_url_unique');
  }

  const stagingColumns = await queryInterface.describeTable('staging_fanarts').catch(() => null as any);
  if (stagingColumns && stagingColumns['original_thumbnail_url']) {
    await queryInterface.removeColumn('staging_fanarts', 'original_thumbnail_url');
  }

  const mediaColumns = await queryInterface.describeTable('media').catch(() => null as any);
  if (mediaColumns && mediaColumns['original_thumbnail_url']) {
    await queryInterface.removeColumn('media', 'original_thumbnail_url');
  }
};
