import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUserByAdmin,
  linkTelegramAccount,
  getCarrera // Assuming this is for a specific role or public
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public or less restricted routes first
router.post('/link-telegram', linkTelegramAccount); // No protection needed if linking is public
router.get('/carreras', getCarrera); 
router.post('/users', createUser); 
router.get('/',getAllUsers);
router.use(protect);

router.route('/')
  .get(authorize(['admin', 'academico']), getAllUsers) // Allow 'admin' AND 'academico' to get all users
  .post(authorize(['admin']), createUser); // Only 'admin' can create users

router.route('/:id')
  .get(authorize(['admin', 'academico']), getUserById) // Allow 'admin' AND 'academico' to get a user by ID
  .delete(authorize(['admin']), deleteUserByAdmin); // Only 'admin' can delete users

router.put('/:id/role', authorize(['admin']), updateUserRole); // Only 'admin' can update user roles

export default router;