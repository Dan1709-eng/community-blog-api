import type { Request, Response } from 'express';
import {
  createComment,
  deleteComment,
  getCommentById,
  getCommentsByPost,
  updateComment,
} from '../service/comment';
import { getAuthUserId } from './user.controller';

export async function createCommentHandler(req: Request, res: Response): Promise<void> {
  const comment = await createComment(String(req.params.postId), getAuthUserId(req), req.body);
  res.status(201).json({ success: true, data: comment });
}

export async function getCommentsByPostHandler(req: Request, res: Response): Promise<void> {
  const comments = await getCommentsByPost(String(req.params.postId));
  res.status(200).json({ success: true, data: comments });
}

export async function getCommentHandler(req: Request, res: Response): Promise<void> {
  const comment = await getCommentById(String(req.params.id));
  res.status(200).json({ success: true, data: comment });
}

export async function updateCommentHandler(req: Request, res: Response): Promise<void> {
  const comment = await updateComment(String(req.params.id), getAuthUserId(req), req.body);
  res.status(200).json({ success: true, data: comment });
}

export async function deleteCommentHandler(req: Request, res: Response): Promise<void> {
  await deleteComment(String(req.params.id), getAuthUserId(req));
  res.status(200).json({ success: true, message: 'Comment deleted successfully' });
}