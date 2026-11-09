import type { Request, Response } from 'express';
import { createPost, deletePost, getAllPosts, getPostById, updatePost } from '../service/post';
import { getAuthUserId } from './user.controller';

export async function createPostHandler(req: Request, res: Response): Promise<void> {
  const post = await createPost(getAuthUserId(req), req.body);
  res.status(201).json({ success: true, data: post });
}

export async function getPostsHandler(_req: Request, res: Response): Promise<void> {
  const posts = await getAllPosts();
  res.status(200).json({ success: true, data: posts });
}

export async function getPostHandler(req: Request, res: Response): Promise<void> {
  const post = await getPostById(String(req.params.id));
  res.status(200).json({ success: true, data: post });
}

export async function updatePostHandler(req: Request, res: Response): Promise<void> {
  const post = await updatePost(String(req.params.id), getAuthUserId(req), req.body);
  res.status(200).json({ success: true, data: post });
}

export async function deletePostHandler(req: Request, res: Response): Promise<void> {
  await deletePost(String(req.params.id), getAuthUserId(req));
  res.status(200).json({ success: true, message: 'Post deleted successfully' });
}