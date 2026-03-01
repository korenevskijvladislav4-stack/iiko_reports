import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma.js';
import { getAccessToken } from '@/lib/iikoClient.js';
import { HttpBadRequestError, HttpUnauthorizedError } from '@/lib/errors.js';
import type { JwtPayload } from '@/types/common.type.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production';
const SALT_ROUNDS = 10;

export type RegisterInput = {
  companyName: string;
  email: string;
  password: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  token: string;
  user: { id: string; email: string; name: string; companyId: string; role: string; scheduleAccessRole: string; includeInSchedule: boolean };
  company: { id: string; name: string };
};

export default class AuthService {
  async register(data: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new HttpBadRequestError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const company = await prisma.company.create({
      data: { name: data.companyName.trim() },
    });
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: data.email.trim().toLowerCase(),
        passwordHash,
        name: data.name.trim(),
        role: 'owner',
        scheduleAccessRole: 'none',
        includeInSchedule: false,
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
      scheduleAccessRole: user.scheduleAccessRole,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, companyId: user.companyId, role: user.role, scheduleAccessRole: user.scheduleAccessRole, includeInSchedule: user.includeInSchedule },
      company: { id: company.id, name: company.name },
    };
  }

  async login(data: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
      include: { company: true },
    });
    if (!user) throw new HttpUnauthorizedError('Invalid email or password');
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new HttpUnauthorizedError('Invalid email or password');

    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      scheduleAccessRole: user.scheduleAccessRole,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, companyId: user.companyId, role: user.role, scheduleAccessRole: user.scheduleAccessRole, includeInSchedule: user.includeInSchedule },
      company: { id: user.company.id, name: user.company.name },
    };
  }

  async getIikoToken(serverUrl: string, login: string, password: string): Promise<string> {
    return getAccessToken(serverUrl, login, password);
  }
}
