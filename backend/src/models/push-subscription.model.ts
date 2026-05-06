import { DataTypes } from 'sequelize';
import { sequelize } from '../services/pg.service.js';

export const PushSubscriptionModel = sequelize.define('PushSubscription', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id: { type: DataTypes.STRING, allowNull: false },
  endpoint: { type: DataTypes.STRING, allowNull: false },
  p256dh: { type: DataTypes.STRING, allowNull: false },
  auth: { type: DataTypes.STRING, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, allowNull: false },
}, {
  tableName: 'push_subscriptions',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },
    { unique: true, fields: ['endpoint'] },
  ],
});
