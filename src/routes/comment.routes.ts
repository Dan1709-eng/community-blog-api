import { Router } from 'express';
import { authenticate } from '../controllers/user.controller';
import {
  createCommentHandler,
  deleteCommentHandler,
  getCommentHandler,
  getCommentsByPostHandler,
  updateCommentHandler,
} from '../controllers/comment.controller';

// This router is mounted at "/api" in src/index.ts, so the full paths are
// /api/posts/:postId/comments and /api/comments/:id
const router = Router();

// Comments that belong to a post
router.get('/posts/:postId/comments', getCommentsByPostHandler);
router.post('/posts/:postId/comments', authenticate, createCommentHandler);

// Single comment
router.get('/comments/:id', getCommentHandler);
router.put('/comments/:id', authenticate, updateCommentHandler);
router.delete('/comments/:id', authenticate, deleteCommentHandler);

export default router;