// routes/daf.js (Node.js/Express)
const express = require('express');
const {getModels} = require('../models/index.js');
// Helper para calcular fechas según período
const getDateRange = (periodo) => {
  const now = new Date();
  let start = new Date();
  
  switch (periodo) {
    case 'semana':
      start.setDate(now.getDate() - 7);
      break;
    case 'trimestre':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'mes':
    default:
      start.setMonth(now.getMonth() - 1);
      break;
  }
  
  return { start, end: now };
};

const reports = async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;
    const { start, end } = getDateRange(periodo);

    // ✅ 1. Conteos por estado (solo eventos en fase 2)
    const [totalSolicitudes, aprobadas, rechazadas, pendientes] = await Promise.all([
      sequelize.query(`
        SELECT COUNT(*) as count FROM evento 
        WHERE fechaevento BETWEEN :start AND :end AND idfase = 2
      `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }),
      
      sequelize.query(`
        SELECT COUNT(*) as count FROM evento 
        WHERE fechaevento BETWEEN :start AND :end AND idfase = 2 AND estado = 'aprobado'
      `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }),
      
      sequelize.query(`
        SELECT COUNT(*) as count FROM evento 
        WHERE fechaevento BETWEEN :start AND :end AND idfase = 2 AND estado = 'rechazado'
      `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }),
      
      sequelize.query(`
        SELECT COUNT(*) as count FROM evento 
        WHERE fechaevento BETWEEN :start AND :end AND idfase = 2 AND estado = 'pendiente'
      `, { replacements: { start, end }, type: sequelize.QueryTypes.SELECT }),
    ]);

    // ✅ 2. Recursos más usados (tu consulta funcionando!)
    const recursosMasUsados = await sequelize.query(`
      SELECT 
        r.nombre_recurso as nombre,
        COUNT(re.idrecurso) as usos
      FROM recurso r
      INNER JOIN evento_recurso re ON re.idrecurso = r.idrecurso
      INNER JOIN evento e ON e.idevento = re.idevento
      WHERE e.fechaevento BETWEEN :start AND :end
        AND e.idfase = 2
      GROUP BY r.idrecurso, r.nombre_recurso
      ORDER BY usos DESC
      LIMIT 5
    `, { 
      replacements: { start, end }, 
      type: sequelize.QueryTypes.SELECT 
    });

    // ✅ 3. Eventos recientes
    const eventoRecientes = await sequelize.query(`
      SELECT 
        e.idevento as id,
        e.nombreevento as "nombreEvento",
        e.estado,
        e.fechaevento,
        COUNT(er.idrecurso) as "totalRecursos",
        a.nombre || ' ' || a.apellidopat as solicitante
      FROM evento e
      LEFT JOIN evento_recurso er ON er.idevento = e.idevento
      LEFT JOIN academico a ON a.idacademico = e.idacademico
      WHERE e.idfase = 2 
        AND e.fechaevento BETWEEN :start AND :end
      GROUP BY e.idevento, a.nombre, a.apellidopat
      ORDER BY e.fechaevento DESC
      LIMIT 5
    `, { 
      replacements: { start, end }, 
      type: sequelize.QueryTypes.SELECT 
    });

    // ✅ Formatear respuesta
    res.json({
      totalSolicitudes: parseInt(totalSolicitudes[0].count) || 0,
      aprobadas: parseInt(aprobadas[0].count) || 0,
      rechazadas: parseInt(rechazadas[0].count) || 0,
      pendientes: parseInt(pendientes[0].count) || 0,
      recursosMasUsados: recursosMasUsados.map(r => ({
        nombre: r.nombre,
        usos: parseInt(r.usos)
      })),
      eventoRecientes: eventoRecientes.map(ev => ({
        id: ev.id,
        nombreEvento: ev.nombreEvento,
        solicitante: ev.solicitante || 'Desconocido',
        fecha: ev.fechaevento ? new Date(ev.fechaevento).toLocaleDateString('es-ES') : 'N/A',
        estado: ev.estado?.charAt(0).toUpperCase() + ev.estado?.slice(1) || 'Pendiente',
        totalRecursos: parseInt(ev.totalRecursos) || 0
      }))
    });

  } catch (error) {
    console.error('Error en /daf/reportes:', error);
    res.status(500).json({ 
      error: 'Error al obtener reportes',
      details: error.message 
    });
  }
};

module.exports = { reports };