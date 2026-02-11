import express from 'express';
import { 
  getEstudiantes,
  getAllEstudiantes,
  getEstudianteById,
  updateEstudiante,
  deleteEstudiante,
  getEventosPorFacultadEstudiante
} from '../controllers/estudiantesController.js';
import { protect,protect1 } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/facultad/:idfacultad', protect1, getEventosPorFacultadEstudiante);
router.get('/', protect, getAllEstudiantes);
router.get('/:idusuario', protect1, getEstudiantes);
router.get('/:id', protect, getEstudianteById);
router.put('/:id', protect, updateEstudiante);
router.delete('/:id', protect, deleteEstudiante);

export default router;