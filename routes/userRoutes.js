import {Router} from 'express'
import { protect, authorize, authMiddleware } from '../middleware/authMiddleware.js';
import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  deleteUserByAdmin,
  linkTelegramAccount,
  getCarrera,
  getComite,
  getComiteUser,
  getUserById1,
  getId,
  
} from '../controllers/userController.js';
const router = express.Router();

router.post('/users', createUser); 
router.post('/link-telegram', linkTelegramAccount); // No protection needed if linking is public
router.get('/carreras', getCarrera); 

router.get('/comite',protect,authorize(['admin', 'academico']), getComite);
router.get('users/comite/', getComiteUser)
//router.get('/notificaciones',protect,authorize(['admin', 'academico']), getAllUsers);
router.get('/users', protect, authorize(['admin']), getAllUsers);
router.get('/',getAllUsers);

router.get('/:id', protect,authorize(['admin']), getUserById);
router.put('/users/', protect, authorize(['admin']), updateUserRole);

router.put(':id',protect, authorize(['admin']), updateUserRole); // Only 'admin' can update user roles
router.delete('/users/:id', protect, authorize(['admin']), deleteUserByAdmin);
//router.get('/users/:id',protect,getUserById);

router.use(protect);

/*router.route('/')
  .get(authorize(['admin', 'academico']), getAllUsers) // Allow 'admin' AND 'academico' to get all users
  .post(authorize(['admin']), createUser); // Only 'admin' can create users

router.route('/:id')
  .get(authorize(['admin', 'academico']), getUserById) // Allow 'admin' AND 'academico' to get a user by ID
  .delete(authorize(['admin']), deleteUserByAdmin); // Only 'admin' can delete users
*/
//router. get('/evento', protectU, authorizeU(['academico','admin']),createEvent)
export default router;