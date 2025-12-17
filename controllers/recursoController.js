// controllers/recursoController.js
import asyncHandler from 'express-async-handler';
import { getModels } from '../models/index.js';

export const createRecurso = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Recurso } = models;

  const { nombre_recurso, recurso_tipo, descripcion, habilitado = 1 } = req.body;

  
  if (!nombre_recurso || !recurso_tipo) {
    res.status(400);
    throw new Error('Los campos "nombre_recurso" y "recurso_tipo" son obligatorios.');
  }

  // Crear el recurso
  const nuevoRecurso = await Recurso.create({
    nombre_recurso,
    recurso_tipo,
    descripcion: descripcion || null,
    habilitado: habilitado !== undefined ? habilitado : 1
  });

  res.status(201).json({
    message: 'Recurso creado exitosamente',
    recurso: {
      idrecurso: nuevoRecurso.idrecurso,
      nombre_recurso: nuevoRecurso.nombre_recurso,
      recurso_tipo: nuevoRecurso.recurso_tipo,
      descripcion: nuevoRecurso.descripcion,
      habilitado: nuevoRecurso.habilitado
    }
  });
});