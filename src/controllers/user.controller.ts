import type { NextFunction, Request, Response } from 'express';
import {
  authenticateToken,
  deleteUser,
  getAllUsers,
  getUserById,
  loginUser,
  registerUser,
  updateUser,
} from '../service/user';
import { unauthorized } from '../utils/error';

// Lets us write req.userId in TypeScript after the authenticate middleware has run.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Authentication middleware (used by user, post and comment routes)   */
/* ------------------------------------------------------------------ */

// Expects the header:  Authorization: Bearer <token>
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized('Authentication required. Send the header "Authorization: Bearer <token>"');
  }

  const token = header.slice('Bearer '.length).trim();
  req.userId = await authenticateToken(token);
  next();
}

// Returns the logged-in user's ID. Only call this in routes that use `authenticate`.
export function getAuthUserId(req: Request): string {
  if (!req.userId) {
    throw unauthorized('Authentication required');
  }
  return req.userId;
}

/* ------------------------------------------------------------------ */
/* Controllers                                                          */
/* ------------------------------------------------------------------ */

export async function register(req: Request, res: Response): Promise<void> {
  const { user, token } = await registerUser(req.body);
  res.status(201).json({ success: true, data: { user, token } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, token } = await loginUser(req.body);
  res.status(200).json({ success: true, data: { user, token } });
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await getAllUsers();
  res.status(200).json({ success: true, data: users });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await getUserById(String(req.params.id));
  res.status(200).json({ success: true, data: user });
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const user = await getUserById(getAuthUserId(req));
  res.status(200).json({ success: true, data: user });
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const user = await updateUser(getAuthUserId(req), req.body);
  res.status(200).json({ success: true, data: user });
}

export async function deleteMyProfile(req: Request, res: Response): Promise<void> {
  await deleteUser(getAuthUserId(req));
  res.status(200).json({ success: true, message: 'Your account was deleted successfully' });
}