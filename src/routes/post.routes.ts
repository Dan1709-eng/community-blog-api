import { Router } from 'express';
import { authenticate } from '../controllers/user.controller';
import {
  createPostHandler,
  deletePostHandler,
  getPostHandler,
  getPostsHandler,
  updatePostHandler,
} from '../controllers/post.controller';

const router = Router();

// Public (anyone can read posts)
router.get('/', getPostsHandler);
router.get('/:id', getPostHandler);

// Protected (JWT required)
router.post('/', authenticate, createPostHandler);
router.put('/:id', authenticate, updatePostHandler);
router.delete('/:id', authenticate, deletePostHandler);

export default router;