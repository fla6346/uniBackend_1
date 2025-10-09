import { Facultad } from '../config/db.js';

export const getFacultades = async (req, res) => {
  try {
    const facultades = await Facultad.findAll({
      where: { habilitado: true },
      attributes: ['idfacultad', 'nombre_facultad']
    });
    res.status(200).json(facultades);
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    res.status(500).json({ message: 'Error al obtener facultades', error });
  }
};