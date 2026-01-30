import {getModels} from '../models/index.js ';

export const getFacultades = async (req, res) => {
  try {
    const models =  await getModels();
    const Facultad = models;
    const facultades = await Facultad.findAll({
      where: { habilitado: 1 },
      attributes: ['facultad_id', 'nombre_facultad']
    });
     const formatted = facultades.map(f => ({
      idfacultad: f.facultad_id,
      nombre: f.nombre_facultad
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    res.status(500).json({ message: 'Error al cargar las facultades.' });
  }
};