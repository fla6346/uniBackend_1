 import {getModels} from '../models/index.js';
export const getAllCategories = async (req, res) => { // <--- EXPORT NOMBRADO
  try {
    const categories = await getModels.Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

// @desc    Crear una nueva categoría
// @route   POST /api/categories
// @access  Private (Solo Admins)
export const createCategory = async (req, res) => { // <--- EXPORT NOMBRADO
  const { name, description } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
    }
    const newCategory = await getModels.Category.create({ name, description });
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre.' });
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ message: 'Error de validación', errors: messages });
    }
    console.error(error);
    res.status(500).json({ message: 'Error al crear la categoría', error: error.message });
  }
};

// @desc    Actualizar una categoría
// @route   PUT /api/categories/:id
// @access  Private (Solo Admins)
export const updateCategory = async (req, res) => { // <--- EXPORT NOMBRADO
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const category = await getModels.Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    // Actualizar solo los campos proporcionados
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;

    await category.save(); // Guarda los cambios
    res.status(200).json(category);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ya existe otra categoría con ese nombre.' });
    }
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message);
        return res.status(400).json({ message: 'Error de validación', errors: messages });
    }
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar la categoría', error: error.message });
  }
};

// @desc    Eliminar una categoría
// @route   DELETE /api/categories/:id
// @access  Private (Solo Admins)
export const deleteCategory = async (req, res) => { // <--- EXPORT NOMBRADO
  const { id } = req.params;
  try {
    const category = await getModels.Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    // Considerar qué sucede con los eventos que usan esta categoría.
    // Podrías impedir la eliminación si hay eventos asociados,
    // o poner su categoryId a null, o eliminarlos en cascada (configurado en el modelo/DB).
    // Por simplicidad, aquí solo la eliminamos:
    await category.destroy();
    res.status(200).json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar la categoría', error: error.message });
  }
};
// NO HAGAS ESTO SI QUIERES IMPORTAR { createCategory, ... }:
// const categoryController = { getAllCategories, createCategory, ... };
// export default categoryController;