import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { Comment } from '../models/comment';
import { Post } from '../models/post';
import { User } from '../models/user';
import {
  assertValidObjectId,
  badRequest,
  conflict,
  isDuplicateKeyError,
  isValidObjectId,
  notFound,
  parseString,
  requireBodyObject,
  unauthorized,
} from '../utils/error';

const SALT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* JWT helpers                                                          */
/* ------------------------------------------------------------------ */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set in your .env file and be at least 32 characters long.');
  }
  return secret;
}

function generateToken(userId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'];
  return jwt.sign({}, getJwtSecret(), { subject: userId, expiresIn, algorithm: 'HS256' });
}

// Checks the token and returns the user ID stored inside it.
// Also confirms that the user still exists (e.g. the account was not deleted).
export async function authenticateToken(token: string): Promise<string> {
  let payload: string | jwt.JwtPayload;

  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  if (typeof payload === 'string' || typeof payload.sub !== 'string' || !isValidObjectId(payload.sub)) {
    throw unauthorized('Invalid token');
  }

  const userExists = await User.exists({ _id: payload.sub });
  if (!userExists) {
    throw unauthorized('The user belonging to this token no longer exists');
  }

  return payload.sub;
}

/* ------------------------------------------------------------------ */
/* Input validation                                                     */
/* ------------------------------------------------------------------ */

function parseEmail(value: unknown): string {
  const email = parseString(value, 'email', 3, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw badRequest('email must be a valid email address');
  }
  return email;
}

// Passwords are NOT trimmed. bcrypt only uses the first 72 bytes, so longer ones are rejected.
function parsePassword(value: unknown): string {
  if (typeof value !== 'string') {
    throw badRequest('password is required and must be a string');
  }
  if (value.length < 8) {
    throw badRequest('password must be at least 8 characters long');
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    throw badRequest('password must be at most 72 bytes long');
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Service functions                                                    */
/* ------------------------------------------------------------------ */

export async function registerUser(body: unknown) {
  const input = requireBodyObject(body);
  const name = parseString(input.name, 'name', 2, 50);
  const email = parseEmail(input.email);
  const password = parsePassword(input.password);

  if (await User.exists({ email })) {
    throw conflict('Email is already registered');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await User.create({ name, email, password: hashedPassword });
    return { user, token: generateToken(user.id) };
  } catch (error) {
    // Two people registering the same email at the same moment
    if (isDuplicateKeyError(error)) {
      throw conflict('Email is already registered');
    }
    throw error;
  }
}

export async function loginUser(body: unknown) {
  const input = requireBodyObject(body);
  const email = parseEmail(input.email);

  if (typeof input.password !== 'string' || input.password.length === 0) {
    throw badRequest('password is required and must be a string');
  }

  // The password hash is hidden by default, so we ask for it explicitly here.
  const user = await User.findOne({ email }).select('+password');
  const passwordMatches = user ? await bcrypt.compare(input.password, user.password) : false;

  if (!user || !passwordMatches) {
    // Same message for both cases so attackers cannot discover which emails exist.
    throw unauthorized('Invalid email or password');
  }

  return { user, token: generateToken(user.id) };
}

export async function getAllUsers() {
  return User.find().sort({ createdAt: -1 });
}

export async function getUserById(userId: string) {
  assertValidObjectId(userId, 'user ID');

  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }
  return user;
}

export async function updateUser(userId: string, body: unknown) {
  assertValidObjectId(userId, 'user ID');
  const input = requireBodyObject(body);

  if (input.name === undefined && input.email === undefined && input.password === undefined) {
    throw badRequest('Provide at least one of: name, email, password');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  if (input.name !== undefined) {
    user.name = parseString(input.name, 'name', 2, 50);
  }

  if (input.email !== undefined) {
    const email = parseEmail(input.email);
    if (email !== user.email && (await User.exists({ email }))) {
      throw conflict('Email is already registered');
    }
    user.email = email;
  }

  if (input.password !== undefined) {
    user.password = await bcrypt.hash(parsePassword(input.password), SALT_ROUNDS);
  }

  try {
    await user.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('Email is already registered');
    }
    throw error;
  }

  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  assertValidObjectId(userId, 'user ID');

  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  // Clean up everything that belongs to this user so no orphaned records remain.
  const userPosts = await Post.find({ author: user._id }).select('_id');
  const postIds = userPosts.map((post) => post._id);

  await Comment.deleteMany({ $or: [{ post: { $in: postIds } }, { author: user._id }] });
  await Post.deleteMany({ author: user._id });
  await user.deleteOne();
}