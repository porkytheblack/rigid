import { z } from 'zod';

export const settingKeySchema = z.string().min(1, 'Key is required').max(100, 'Key must be 100 characters or less');

export const settingValueSchema = z.string().max(10000, 'Value must be 10000 characters or less');

export const setSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

export const setBoolSettingSchema = z.object({
  key: settingKeySchema,
  value: z.boolean(),
});

export const setIntSettingSchema = z.object({
  key: settingKeySchema,
  value: z.number().int(),
});

// Settings keys constants
export const SETTINGS_KEYS = {
  THEME: 'theme',
  AUTO_SAVE: 'auto_save',
  RECORDING_QUALITY: 'recording_quality',
  DEFAULT_VERSION: 'default_version',
  AI_PROVIDER: 'ai_provider',
  AI_API_KEY: 'ai_api_key',
} as const;

export type SettingKey = typeof SETTINGS_KEYS[keyof typeof SETTINGS_KEYS];

export type SetSettingInput = z.infer<typeof setSettingSchema>;
export type SetBoolSettingInput = z.infer<typeof setBoolSettingSchema>;
export type SetIntSettingInput = z.infer<typeof setIntSettingSchema>;
