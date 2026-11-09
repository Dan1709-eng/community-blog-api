import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

/* ------------------------------------------------------------------ */
/* Custom error class + small helpers for the common HTTP errors       */
/* ------------------------------------------------------------------ */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const badRequest = (message: string): AppError => new AppError(message, 400);
export const unauthorized = (message: string): AppError => new AppError(message, 401);
export const forbidden = (message: string): AppError => new AppError(message, 403);
export const notFound = (message: string): AppError => new AppError(message, 404);
export const conflict = (message: string): AppError => new AppError(message, 409);

/* ------------------------------------------------------------------ */
/* Tiny validation helpers (they throw a 400 AppError when input is bad) */
/* ------------------------------------------------------------------ */

// A MongoDB ObjectId is exactly 24 hexadecimal characters.
// (mongoose.isValidObjectId is more lenient, e.g. it accepts any 12-character string.)
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(id: string): boolean {
  return OBJECT_ID_PATTERN.test(id);
}

export function assertValidObjectId(id: string, label: string): void {
  if (!isValidObjectId(id)) {
    throw badRequest(`Invalid ${label}`);
  }
}

// Makes sure the request body is a plain JSON object (not missing, an array, or a string).
export function requireBodyObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

// Makes sure a value is a string, trims it, and checks its length.
export function parseString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw badRequest(`${field} is required and must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw badRequest(`${field} must be at least ${min} character${min === 1 ? '' : 's'} long`);
  }
  if (trimmed.length > max) {
    throw badRequest(`${field} must be at most ${max} characters long`);
  }
  return trimmed;
}

/* ------------------------------------------------------------------ */
/* Error-handling middleware                                           */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// MongoDB reports a unique-index violation with error code 11000.
export function isDuplicateKeyError(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

// Handles requests that did not match any route.
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Central error handler. It must be registered LAST and must have 4 parameters.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Errors we threw on purpose
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Mongoose: bad value type (for example an invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: `Invalid value for "${error.path}"` });
    return;
  }

  // Mongoose: schema validation failed
  if (error instanceof mongoose.Error.ValidationError) {
    const message = Object.values(error.errors)
      .map((fieldError) => fieldError.message)
      .join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  // MongoDB: unique index violation (safety net for race conditions)
  if (isDuplicateKeyError(error)) {
    res.status(409).json({ success: false, message: 'A record with this value already exists' });
    return;
  }

  // Express body parser errors (malformed JSON, body too large, ...)
  if (isRecord(error) && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
    const message =
      error.type === 'entity.parse.failed'
        ? 'Request body contains invalid JSON'
        : error.type === 'entity.too.large'
          ? 'Request body is too large'
          : 'Bad request';
    res.status(error.status).json({ success: false, message });
    return;
  }

  // Anything else is unexpected: log it, but do not leak details to the client.
  console.error('Unexpected error:', error);
  res.status(500).json({ success: false, message: 'Internal server error' });
}