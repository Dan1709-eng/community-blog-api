import { Router } from 'express';
import {
  authenticate,
  deleteMyProfile,
  getMyProfile,
  getUser,
  getUsers,
  login,
  register,
  updateMyProfile,
} from '../controllers/user.controller';

const router = Router();

// Public
router.post('/register', register);
router.post('/login', login);

// Protected (JWT required)
router.get('/', authenticate, getUsers);

// "/me" routes must be declared BEFORE "/:id", otherwise "me" would be read as an ID.
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);
router.delete('/me', authenticate, deleteMyProfile);

router.get('/:id', authenticate, getUser);

export default router;