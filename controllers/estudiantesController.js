import { getModels } from "../models/index.js";
export const getEstudiantes = async( req, res) => {
    try{
    const { idusuario } = req.params;
    
    const estudiante = await pool.query(
      'SELECT * FROM estudiante WHERE idusuario = $1',
      [idusuario]
    );
    
    if (estudiante.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontró información de estudiante para este usuario' 
      });
    }
    
    res.json(estudiante.rows[0]);
  } catch (error) {
    console.error('Error al obtener estudiante:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};