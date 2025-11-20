import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { db, databaseUrl } from './db';
import { storage } from './storage';

const SALT_ROUNDS = 10;

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Extend Express session type for B2B
declare module 'express-session' {
  interface SessionData {
    b2bUserId?: string;
    b2bUserType?: 'customer' | 'sales_rep' | 'admin';
    b2bUserEmail?: string;
  }
}

// B2B session configuration
const PgSession = connectPgSimple(session);

export function createB2bSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const sessionStore = new PgSession({
    conString: databaseUrl,
    tableName: 'b2b_sessions',
    createTableIfMissing: false,
    ttl: sessionTtl,
  });

  return session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'b2b-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'b2b.sid',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

// Authentication middleware
export function requireB2bAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.b2bUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireB2bCustomer(req: Request, res: Response, next: NextFunction) {
  if (!req.session.b2bUserId || req.session.b2bUserType !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  next();
}

export function requireB2bSalesRep(req: Request, res: Response, next: NextFunction) {
  if (!req.session.b2bUserId || req.session.b2bUserType !== 'sales_rep') {
    return res.status(403).json({ error: 'Sales representative access required' });
  }
  next();
}

export function requireB2bAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.b2bUserId || req.session.b2bUserType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireB2bAdminOrSalesRep(req: Request, res: Response, next: NextFunction) {
  if (!req.session.b2bUserId || (req.session.b2bUserType !== 'admin' && req.session.b2bUserType !== 'sales_rep')) {
    return res.status(403).json({ error: 'Admin or Sales Rep access required' });
  }
  next();
}

// Admin authentication
export async function authenticateB2bAdmin(email: string, password: string) {
  const admin = await storage.getB2bAdminByEmail(email);
  
  if (!admin || !admin.passwordHash) {
    return null;
  }

  if (!admin.active) {
    throw new Error('Admin account is not active');
  }

  const isValid = await comparePassword(password, admin.passwordHash);
  if (!isValid) {
    return null;
  }

  return admin;
}

// Authentication helpers
export async function authenticateB2bCustomer(email: string, password: string) {
  const customer = await storage.getB2bCustomerByEmail(email);
  
  if (!customer || !customer.passwordHash) {
    return null;
  }

  if (customer.accountStatus !== 'active') {
    throw new Error('Account is not active');
  }

  const isValid = await comparePassword(password, customer.passwordHash);
  if (!isValid) {
    return null;
  }

  return customer;
}

export async function authenticateB2bSalesRep(email: string, password: string) {
  const salesRep = await storage.getSalesRepByEmail(email);
  
  if (!salesRep || !salesRep.passwordHash) {
    return null;
  }

  if (!salesRep.active) {
    throw new Error('Sales representative account is not active');
  }

  const isValid = await comparePassword(password, salesRep.passwordHash);
  if (!isValid) {
    return null;
  }

  return salesRep;
}

// Utility to generate password from last 6 digits of phone
export function generatePasswordFromPhone(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.slice(-6);
}
