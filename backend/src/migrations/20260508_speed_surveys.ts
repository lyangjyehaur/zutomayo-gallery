import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('speed_surveys').catch(() => null as any);
  if (existing) {
    // 若表已存在，添加新欄位（相容舊 migration）
    const columns = Object.keys(existing);
    const addIfMissing = async (name: string, def: any) => {
      if (!columns.includes(name)) {
        await queryInterface.addColumn('speed_surveys', name, def);
      }
    };

    await addIfMissing('rating_speed', { type: DataTypes.DECIMAL(2, 1), allowNull: true });
    await addIfMissing('rating_experience', { type: DataTypes.DECIMAL(2, 1), allowNull: true });
    await addIfMissing('rating_image_quality', { type: DataTypes.DECIMAL(2, 1), allowNull: true });
    await addIfMissing('rating_ui', { type: DataTypes.DECIMAL(2, 1), allowNull: true });
    await addIfMissing('rating_search', { type: DataTypes.DECIMAL(2, 1), allowNull: true });
    await addIfMissing('connection_type', { type: DataTypes.STRING(20), allowNull: true });
    await addIfMissing('downlink', { type: DataTypes.DECIMAL(6, 2), allowNull: true });
    await addIfMissing('rtt', { type: DataTypes.INTEGER, allowNull: true });
    await addIfMissing('save_data', { type: DataTypes.BOOLEAN, allowNull: true });
    await addIfMissing('lcp', { type: DataTypes.DECIMAL(8, 3), allowNull: true });
    await addIfMissing('fid', { type: DataTypes.DECIMAL(8, 3), allowNull: true });
    await addIfMissing('cls', { type: DataTypes.DECIMAL(8, 6), allowNull: true });
    await addIfMissing('fcp', { type: DataTypes.DECIMAL(8, 3), allowNull: true });
    await addIfMissing('ttfb', { type: DataTypes.DECIMAL(8, 3), allowNull: true });
    await addIfMissing('image_load_avg', { type: DataTypes.DECIMAL(8, 3), allowNull: true });
    await addIfMissing('image_load_count', { type: DataTypes.INTEGER, allowNull: true });

    // 舊欄位 rating 改名為 rating_speed（若存在）
    if (columns.includes('rating') && !columns.includes('rating_speed')) {
      await queryInterface.renameColumn('speed_surveys', 'rating', 'rating_speed');
    }
    return;
  }

  await queryInterface.createTable('speed_surveys', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    rating_speed: { type: DataTypes.DECIMAL(2, 1), allowNull: true },
    rating_experience: { type: DataTypes.DECIMAL(2, 1), allowNull: true },
    rating_image_quality: { type: DataTypes.DECIMAL(2, 1), allowNull: true },
    rating_ui: { type: DataTypes.DECIMAL(2, 1), allowNull: true },
    rating_search: { type: DataTypes.DECIMAL(2, 1), allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
    url: { type: DataTypes.TEXT, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    connection_type: { type: DataTypes.STRING(20), allowNull: true },
    downlink: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    rtt: { type: DataTypes.INTEGER, allowNull: true },
    save_data: { type: DataTypes.BOOLEAN, allowNull: true },
    lcp: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    fid: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    cls: { type: DataTypes.DECIMAL(8, 6), allowNull: true },
    fcp: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    ttfb: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    image_load_avg: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    image_load_count: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });

  await queryInterface.addIndex('speed_surveys', ['rating_speed']);
  await queryInterface.addIndex('speed_surveys', ['rating_experience']);
  await queryInterface.addIndex('speed_surveys', ['created_at']);
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('speed_surveys').catch(() => null as any);
  if (!existing) return;
  await queryInterface.dropTable('speed_surveys');
};
