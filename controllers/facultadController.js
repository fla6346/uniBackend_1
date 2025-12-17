import {getModels} from '../models/index.js ';

export const getFacultades = async (req, res) => {
  try {
    const facultades = await models.Facultad.findAll({
      where: { habilitado: 1 },
      attributes: ['idfacultad', 'nombre_facultad']
    });
     const formatted = facultades.map(f => ({
      idfacultad: f.idfacultad,
      nombre: f.nombre_facultad
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    res.status(500).json({ message: 'Error al cargar las facultades.' });
  }
};