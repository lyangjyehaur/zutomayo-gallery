import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('geo_raw_logs').catch(() => null as any);
  if (existing) return;

  await queryInterface.createTable('geo_raw_logs', {
    id: { type: DataTypes.STRING(36), primaryKey: true },
    geo_session_id: { type: DataTypes.STRING(32), allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    raw_country: { type: DataTypes.STRING, allowNull: true },
    ip2region_raw: { type: DataTypes.TEXT, allowNull: true },
    geoip_raw: { type: DataTypes.TEXT, allowNull: true },
    maxmind_city_raw: { type: DataTypes.TEXT, allowNull: true },
    maxmind_asn_raw: { type: DataTypes.TEXT, allowNull: true },
    ip2region_sha256: { type: DataTypes.STRING(64), allowNull: true },
    geoip_sha256: { type: DataTypes.STRING(64), allowNull: true },
    maxmind_city_sha256: { type: DataTypes.STRING(64), allowNull: true },
    maxmind_asn_sha256: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await queryInterface.addIndex('geo_raw_logs', ['geo_session_id'], { unique: true });
  await queryInterface.addIndex('geo_raw_logs', ['ip']);
  await queryInterface.addIndex('geo_raw_logs', ['geoip_sha256']);
  await queryInterface.addIndex('geo_raw_logs', ['maxmind_city_sha256']);
  await queryInterface.addIndex('geo_raw_logs', ['maxmind_asn_sha256']);
  await queryInterface.addIndex('geo_raw_logs', ['ip2region_sha256']);
  await queryInterface.addIndex('geo_raw_logs', ['created_at']);
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const existing = await queryInterface.describeTable('geo_raw_logs').catch(() => null as any);
  if (!existing) return;
  await queryInterface.dropTable('geo_raw_logs');
};
