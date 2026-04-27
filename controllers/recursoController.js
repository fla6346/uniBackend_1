const  asyncHandler = require('express-async-handler');
const { getModels } = require ('../models/index.js');
const { where } = require('sequelize');

const createRecurso = asyncHandler(async (req, res) => {
  console.log('📦 Body recibido:', req.body);
  const models = getModels();
  const { Recurso } = models;
   console.log('📦 Modelo Recurso:', Recurso ? 'OK' : 'NULL');

  const { nombre_recurso, recurso_tipo, descripcion, habilitado = true } = req.body;

  
  if (!nombre_recurso || !recurso_tipo) {
    res.status(400);
    throw new Error('Los campos "nombre_recurso" y "recurso_tipo" son obligatorios.');
  }

  // Crear el recurso
  const nuevoRecurso = await Recurso.create({
    nombre_recurso,
    recurso_tipo,
    descripcion: descripcion || null,
    habilitado: habilitado !== undefined ? habilitado : true
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
const getRecursos = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Recurso } = models;

  const recursos = await Recurso.findAll({
    where: { habilitado: true },
    attributes: ['idrecurso', 'nombre_recurso', 'recurso_tipo', 'descripcion']
  });
  res.json({ recursos });
})
const updateRecurso = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Recurso } = models;
  const {id} = req.params;

  const recurso = await Recurso.findByPk(id);
  if (!recurso) {
    res.status(404);
    throw new Error('Recurso no encontrado.');
  }
  const { nombre_recurso, recurso_tipo, descripcion, habilitado } = req.body;

  await recurso.update({
    nombre_recurso: nombre_recurso ?? recurso.nombre_recurso,
    recurso_tipo: recurso_tipo ?? recurso.recurso_tipo,
    descripcion: descripcion !== undefined ? descripcion : recurso.descripcion,
    habilitado: habilitado !== undefined ? habilitado : recurso.habilitado
  });

  res.json({
    message: 'Recurso actualizado exitosamente',
    recurso: {
      idrecurso: recurso.idrecurso,
      nombre_recurso: recurso.nombre_recurso,
      recurso_tipo: recurso.recurso_tipo,
      descripcion: recurso.descripcion,
      habilitado: recurso.habilitado
    }
  });
});
const deleteRecurso = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Recurso } = models;
  const { id } = req.params;

  const recurso = await Recurso.findByPk(id);
  if (!recurso) {
    res.status(404);
    throw new Error('Recurso no encontrado.');
  }

  await recurso.update({ habilitado: 0 });
  res.json({ message: 'Recurso deshabilitado exitosamente' });
});
module.exports = {
  createRecurso,
  getRecursos,
  updateRecurso,
  deleteRecurso
};