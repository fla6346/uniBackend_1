import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getFacultades
}from '../controllers/facultadController.js';
const router = express.Router();

router.get('/facultades', protect, getFacultades);

export default router;