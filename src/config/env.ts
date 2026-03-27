import dotenv from 'dotenv';

dotenv.config();

// Prisma production optimization: add connection pool limit if not set
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  if (!url.includes('connection_limit') && !url.includes('pool_timeout')) {
    const sep = url.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${url}${sep}connection_limit=10`;
  }
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvOptional = (key: string, defaultValue?: string): string | undefined =>
  process.env[key] ?? defaultValue;

export const env = {
  NODE_ENV: getEnvOptional('NODE_ENV', 'development'),
  PORT: parseInt(getEnvOptional('PORT', '3000') ?? '3000', 10),
  API_PREFIX: getEnvOptional('API_PREFIX', '/api/v1') ?? '/api/v1',
  DATABASE_URL: getEnvOptional('DATABASE_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvOptional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET: getEnvOptional('JWT_REFRESH_SECRET') ?? getEnv('JWT_SECRET'),
  JWT_REFRESH_EXPIRES_IN: getEnvOptional('JWT_REFRESH_EXPIRES_IN', '7d'),
  BCRYPT_SALT_ROUNDS: parseInt(getEnvOptional('BCRYPT_SALT_ROUNDS', '12') ?? '12', 10),
  CORS_ORIGINS: getEnvOptional('CORS_ORIGINS', '*'),
  LOG_LEVEL: getEnvOptional('LOG_LEVEL', 'info'),
  PRAYER_TIMES_API_BASE: getEnvOptional('PRAYER_TIMES_API_BASE', 'https://api.aladhan.com/v1'),
  SAUDI_TIMEZONE: getEnvOptional('SAUDI_TIMEZONE', 'Asia/Riyadh'),
  RATE_LIMIT_MAX: parseInt(getEnvOptional('RATE_LIMIT_MAX', '100') ?? '100', 10),
  RATE_LIMIT_AUTH_MAX: parseInt(getEnvOptional('RATE_LIMIT_AUTH_MAX', '10') ?? '10', 10),
  // Railway sets PORT and DATABASE_URL automatically
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;
