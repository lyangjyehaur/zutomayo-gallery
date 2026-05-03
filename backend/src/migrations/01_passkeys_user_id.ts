import { QueryInterface, DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const table = 'auth_passkeys';
  const desc = await queryInterface.describeTable(table);
  if (!desc.user_id) {
    await queryInterface.addColumn(table, 'user_id', { type: DataTypes.STRING, allowNull: true });
  }

  try {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM admin_users WHERE is_active = true ORDER BY created_at ASC LIMIT 1`,
    );
    const first = Array.isArray(rows) ? (rows[0] as any) : null;
    const userId = first?.id ? String(first.id) : null;
    if (userId) {
      await queryInterface.sequelize.query(
        `UPDATE auth_passkeys SET user_id = :userId WHERE user_id IS NULL`,
        { replacements: { userId } },
      );
    }
  } catch {
  }
};

export const down = async ({ context: queryInterface }: { context: QueryInterface }) => {
  const table = 'auth_passkeys';
  const desc = await queryInterface.describeTable(table);
  if (desc.user_id) {
    await queryInterface.removeColumn(table, 'user_id');
  }
};

