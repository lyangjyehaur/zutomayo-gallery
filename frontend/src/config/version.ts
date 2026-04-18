/**
 * 全局版本号配置
 * 用于统一管理和引用应用版本信息
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '3.2.1';
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || '2026-04-18';

// 导出为对象方便扩展
export const VERSION_CONFIG = {
  app: APP_VERSION,
  buildDate: BUILD_DATE
} as const;

export type VersionConfig = typeof VERSION_CONFIG;
