import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { JwtPayload, UserRole } from '../types/auth.js';

const REFRESH_TOKEN_BYTES = 32;

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 90 * 24 * 60 * 60; // default 90d in seconds (must match JWT_REFRESH_EXPIRES_IN)
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (multipliers[unit] ?? 86400);
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
  refreshExpiresIn: string;
  user: { id: string; email: string; name: string | null; role: UserRole };
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

async function issueTokens(user: {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}): Promise<AuthTokens> {
  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  const expiresIn = env.JWT_EXPIRES_IN ?? '15m';
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN ?? '90d';
  const refreshTokenRaw = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshTokenRaw);
  const refreshSeconds = parseExpiryToSeconds(refreshExpiresIn);
  const expiresAt = new Date(Date.now() + refreshSeconds * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    },
  });

  return {
    accessToken,
    expiresIn,
    refreshToken: refreshTokenRaw,
    refreshExpiresIn,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  if (!EMAIL_REGEX.test(input.email)) {
    throw new AppError(400, 'Invalid email format');
  }
  validatePassword(input.password);

  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const saltRounds = Math.min(Math.max(env.BCRYPT_SALT_ROUNDS ?? 12, 10), 14);
  const passwordHash = await bcrypt.hash(input.password, saltRounds);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  return issueTokens(user);
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new AppError(403, 'Account is deactivated');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return issueTokens(user);
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new AppError(400, 'Refresh token is required');
  }
  const tokenHash = hashRefreshToken(refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    throw new AppError(401, 'Invalid refresh token');
  }
  if (record.revokedAt) {
    throw new AppError(401, 'Refresh token has been revoked');
  }
  if (record.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token has expired');
  }
  if (!record.user.isActive) {
    throw new AppError(403, 'Account is deactivated');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens({
    id: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role,
  });
}

export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return;
  }
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function updateFcmToken(userId: string, fcmToken: string | null): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
  });
}

const profileSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  locale: true,
} as const;

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  locale: string | null;
};

export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
};

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError(404, 'User not found');
  if (!existing.isActive) throw new AppError(403, 'Account is deactivated');

  const data: { name?: string | null; phone?: string | null } = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new AppError(400, 'Name cannot be empty');
    data.name = trimmed;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone === null || input.phone.trim() === '' ? null : input.phone.trim();
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: profileSelect,
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw new AppError(400, 'Current password and new password are required');
  }
  validatePassword(newPassword);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  if (!user.isActive) throw new AppError(403, 'Account is deactivated');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const saltRounds = Math.min(Math.max(env.BCRYPT_SALT_ROUNDS ?? 12, 10), 14);
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  if (!password) throw new AppError(400, 'Password is required');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Password is incorrect');

  const ownedKafelas = await prisma.kafela.findMany({
    where: { createdById: userId },
    select: {
      id: true,
      name: true,
      members: {
        where: { status: 'active' },
        select: { userId: true },
      },
    },
  });

  const blocked = ownedKafelas.filter((k) =>
    k.members.some((m) => m.userId !== userId)
  );
  if (blocked.length > 0) {
    const names = blocked.map((k) => k.name).join(', ');
    throw new AppError(
      409,
      `Cannot delete account while you own kafela(s) with other active members: ${names}. Leave or hand off those kafelas first.`
    );
  }

  const soleOwnedIds = ownedKafelas.map((k) => k.id);

  await prisma.$transaction(async (tx) => {
    if (soleOwnedIds.length > 0) {
      await tx.kafela.deleteMany({ where: { id: { in: soleOwnedIds } } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
}
