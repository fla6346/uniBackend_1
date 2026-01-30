import express from 'express';
import { 
  getEstudianteByUsuario, 
  getAllEstudiantes,
  getEstudianteById,
  createEstudiante,
  updateEstudiante,
  deleteEstudiante,
  getEstudiantes
} from '../controllers/estudiantesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/estudiantes/usuario/:idusuario', protect, getEstudiantes);
/*router.get('/estudiantes/usuario/:idusuario', protect, getEstudianteByUsuario);
router.get('/estudiantes', protect, getAllEstudiantes);

router.get('/estudiantes/:id', protect, getEstudianteById);

router.post('/estudiantes', protect, createEstudiante);

router.put('/estudiantes/:id', protect, updateEstudiante);

router.delete('/estudiantes/:id', protect, deleteEstudiante);*/
export default router;