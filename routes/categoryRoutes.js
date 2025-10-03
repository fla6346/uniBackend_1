import eventRoutes from './eventRoutesNO.js'
import express from 'express';
const router = express.Router(); // <--- Aquí defines 'router'
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

router.get('/', getAllCategories);
router.post('/', protect, authorize(['admin']), createCategory);
router.put('/:id', protect, authorize(['admin']), updateCategory);
router.delete('/:id', protect, authorize(['admin']), deleteCategory);

export default router; 