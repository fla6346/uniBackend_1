// D:\Nueva carpeta\backend\controllers\locationController.js
import {getModels} from '../models/index.js ';

export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.findAll();
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ubicaciones', error: error.message });
  }
};

export const createLocation = async (req, res) => {
  const { name, address, capacity } = req.body;
  try {
    if (!name) {
        return res.status(400).json({ message: 'El nombre de la ubicación es obligatorio.' });
    }
    const newLocation = await Location.create({ name, address, capacity });
    res.status(201).json(newLocation);
  } catch (error) {
    // ... manejo de errores de Sequelize (validación, unicidad) ...
    res.status(500).json({ message: 'Error al crear ubicación', error: error.message });
  }
};

export const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, address, capacity } = req.body;
  try {
    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }
    // Actualizar solo los campos proporcionados
    if (name !== undefined) location.name = name;
    if (address !== undefined) location.address = address;
    if (capacity !== undefined) location.capacity = capacity;

    await location.save();
    res.status(200).json(location);
  } catch (error) {
    // ... manejo de errores ...
    res.status(500).json({ message: 'Error al actualizar ubicación', error: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  const { id } = req.params;
  try {
    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }
    // Considerar qué sucede con los eventos que usan esta ubicación.
    await location.destroy();
    res.status(200).json({ message: 'Ubicación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar ubicación', error: error.message });
  }
};