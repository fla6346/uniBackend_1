import {Router} from 'express'
import { protect, authorize } from '../middleware/authMiddleware.js';
import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUserByAdmin,
  linkTelegramAccount,
  getCarrera,
  getComite
} from '../controllers/userController.js';

const router = express.Router();

// Public or less restricted routes first
router.post('/users', createUser); 
router.post('/link-telegram', linkTelegramAccount); // No protection needed if linking is public
router.get('/carreras', getCarrera); 

//router.get('/users/comite', protectU, authorizeU(['admin', 'academico']), getComite);
router.get('/comite',protect,authorize(['admin', 'academico']), getComite);
router.get('/notificaciones',protect,authorize(['admin', 'academico']), getAllUsers);
//router.get('/users/directores', protect, getDirectoresCarrera);
router.get('/users', protect, authorize(['admin']), getAllUsers);

// Rutas protegidas - DINÁMICAS AL FINAL
router.get('/users/:idusuario', protect, getUserById);
router.put('/users/:id', protect, authorize(['admin']), updateUserRole);
router.delete('/users/:id', protect, authorize(['admin']), deleteUserByAdmin);



router.get('/',getAllUsers);
router.use(protect);

/*router.route('/')
  .get(authorize(['admin', 'academico']), getAllUsers) // Allow 'admin' AND 'academico' to get all users
  .post(authorize(['admin']), createUser); // Only 'admin' can create users

router.route('/:id')
  .get(authorize(['admin', 'academico']), getUserById) // Allow 'admin' AND 'academico' to get a user by ID
  .delete(authorize(['admin']), deleteUserByAdmin); // Only 'admin' can delete users
*/
router.put('/:id/role', authorize(['admin']), updateUserRole); // Only 'admin' can update user roles
//router. get('/evento', protectU, authorizeU(['academico','admin']),createEvent)
export default router;