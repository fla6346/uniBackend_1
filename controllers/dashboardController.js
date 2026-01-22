// controllers/dashboardController.js
import { getModels } from '../models/index.js';
import { Op } from 'sequelize';
import asyncHandler from 'express-async-handler';

/**
 * Obtener estadísticas del dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { User, Evento, Academico, sequelize } = models;


    // 1. Usuarios Activos
    const activeUsers = await User.count({
      where: { habilitado: '1' }
    });

    // 2. Total de Eventos
    const totalEvents = await Evento.count();

    // 3. Obtener todos los eventos con su estado
    const todosLosEventos = await Evento.findAll({
      attributes: ['estado', 'createdAt']
      
    });

    // 4. Contar eventos por estado
    const estadoCounts = todosLosEventos.reduce((acc, evento) => {
      const estado = evento.estado || 'sin_estado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    // 5. Eventos aprobados este mes
    const primerDiaDelMes = new Date();
    primerDiaDelMes.setDate(1);
    primerDiaDelMes.setHours(0, 0, 0, 0);

    const eventosAprobadosMes = todosLosEventos.filter(evento => {
      const fechaEvento = new Date(evento.createdAt);
      return evento.estado === 'aprobado' && fechaEvento >= primerDiaDelMes;
    }).length;

    // 6. Calcular tasa de aprobación
    const eventosAprobados = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((eventosAprobados / totalEvents) * 100) 
      : 0;

    // 7. Estabilidad del sistema (puedes mejorar esto)
    const systemStability = 99;
    const miEvento = await Evento.findAll({
      attributes: ['idevento','nombreevento', 'estado', 'idacademico']
    });
   
    let eventosPorFacultad = {};
    try {
      const [result] = await sequelize.query(`
        SELECT
          f.nombre_facultad AS facultad,
          COUNT(e.idevento) AS total
        FROM
          evento e
        INNER JOIN
          academico a ON e.idacademico = a.idacademico
        INNER JOIN
          facultad f ON a.facultad_id = f.facultad_id
        GROUP BY
          f.nombre_facultad
        ORDER BY
          total DESC;
      `);

      // Convertir el array de resultados en un objeto plano
      eventosPorFacultad = result.reduce((acc, row) => {
        acc[row.facultad] = parseInt(row.total, 10);
        return acc;
      }, {});
    } catch (queryError) {
      console.warn('Error al cargar eventos por facultad:', queryError.message);
      eventosPorFacultad = {};
    }
    let eventosPorDia = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

try {
  const [results] = await sequelize.query(`
    SELECT
      DATE("fecha_aprobacion") as fecha,
      COUNT(*) as total
    FROM "evento"
    WHERE "fecha_aprobacion" IS NOT NULL
      AND "fecha_aprobacion" >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY DATE("fecha_aprobacion")
    ORDER BY fecha ASC;
  `);

  // Generar un array con los últimos 7 días (incluso si no hay aprobaciones)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const found = results.find(row => row.fecha === dateString);
    eventosPorDia.push({
      fecha: dateString,
      total: found ? parseInt(found.total, 10) : 0
    });
  }
} catch (diaError) {
  console.warn('⚠️ Error al cargar eventos aprobados por día:', diaError.message);
  // Inicializar con ceros si falla
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    eventosPorDia.push({
      fecha: date.toISOString().split('T')[0],
      total: 0
    });
  }
}
    
    const stats = {
      activeUsers,
      totalEvents,
      estadoCounts,
      eventosAprobadosMes,
      tasaAprobacion,
      systemStability,
      eventosPorFacultad,
      eventosPorDia
    };

    console.log('✅ Estadísticas calculadas:', JSON.stringify(stats, null, 2));
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas',
      message: error.message 
    });
  }
});

export const getMensualStats = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { Evento } = models;

    // Verifica que la tabla tenga eventos con fechaCreacion
    const result = await Evento.sequelize.query(
      `
        SELECT 
          TO_CHAR("createdAt", 'YYYY-MM') AS mes,
          COUNT(*)::INTEGER AS totalEvents,
          COUNT(*) FILTER (WHERE "estado" = 'aprobado')::INTEGER AS aprobado,
          COUNT(*) FILTER (WHERE "estado" = 'pendiente')::INTEGER AS pendiente,
          COUNT(*) FILTER (WHERE "estado" = 'rechazado')::INTEGER AS rechazado
        FROM "evento"
        WHERE "createdAt" IS NOT NULL
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY mes DESC;
      `,
      { type: Evento.sequelize.QueryTypes.SELECT }
    );

    // Formatear resultados
    const reportes = result.map(row => {
      const total = parseInt(row.totalEvents) || 0;
      const aprobado = parseInt(row.aprobado) || 0;
      const tasa = total > 0 ? parseFloat(((aprobado / total) * 100).toFixed(1)) : 0;
      
      return {
        mes: row.mes, // Formato: "2025-01"
        totalEvents: total,
        aprobado: aprobado,
        pendiente: parseInt(row.pendiente) || 0,
        rechazado: parseInt(row.rechazado) || 0,
        tasaAprobacion: tasa,
        activeUsers: 0,
        usuariosNuevosEsteMes: 0,
        tiempoPromedioAprobacion: 0
      };
    });

    res.status(200).json(reportes); // Siempre devuelve un ARRAY

  } catch (error) {
    console.error('❌ Error en getMensualStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas mensuales',
      message: error.message 
    });
  }
});

export const getHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { Evento } = models;

    console.log('📈 Calculando datos históricos...');

    const now = new Date();
    const data = [];

    // Generar datos de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      // Contar eventos en este mes
      const eventos = await Evento.findAll({
        where: {
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: ['estado']
      });

      const total = eventos.length;
      const aprobados = eventos.filter(e => e.estado === 'aprobado').length;
      const pendientes = eventos.filter(e => e.estado === 'pendiente').length;
      const rechazados = eventos.filter(e => e.estado === 'rechazado').length;

      data.push({
        mes: start.toLocaleString('es-ES', { month: 'short', year: '2-digit' }),
        total,
        aprobados,
        pendientes,
        rechazados
      });
    }

    console.log('✅ Datos históricos calculados:', data.length, 'meses');
    
    res.status(200).json({ historical: data });
  } catch (error) {
    console.error('❌ Error al obtener datos históricos:', error);
    res.status(500).json({ 
      error: 'Error al cargar datos históricos',
      message: error.message 
    });
  }
});

export const getMyDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { idusuario } = req.user;

    if (!idusuario) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    const { Evento, Academico } = models;

    // Buscar perfil académico
    const academicos = await Academico.findAll({
      where: { idusuario }
    });

    if (!academicos || academicos.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de académico registrado.' });
    }

    const idsAcademico = academicos.map(a => a.idacademico);

    // Contar eventos totales
    const totalEvents = await Evento.count({
      where: { idacademico: idsAcademico }
    });

    // Contar eventos por estado
    const eventosPorEstado = await Evento.findAll({
      attributes: ['estado'],
      where: { idacademico: idsAcademico }
    });

    const estadoCounts = {};
    eventosPorEstado.forEach(evento => {
      const estado = evento.estado || 'sin_estado';
      estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
    });

    // Eventos aprobados este mes
    const primerDiaDelMes = new Date();
    primerDiaDelMes.setDate(1);
    primerDiaDelMes.setHours(0, 0, 0, 0);

    const eventosAprobadosMes = eventosPorEstado.filter(evento => {
      const fechaEvento = new Date(evento.createdAt);
      return evento.estado === 'aprobado' && fechaEvento >= primerDiaDelMes;
    }).length;

    const eventosAprobados = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((eventosAprobados / totalEvents) * 100) 
      : 0;

    const stats = {
      totalEvents,
      estadoCounts,
      eventosAprobadosMes,
      tasaAprobacion,
    };

    console.log(`✅ Estadísticas cargadas para usuario ${idusuario}`);
    res.status(200).json(stats);
    
  } catch (error) {
    console.error('❌ Error en getMyDashboardStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar tus estadísticas',
      message: error.message 
    });
  }
});
export const getMyHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { Evento, Academico } = models;

    const academicos = await Academico.findAll({
      where: { idusuario: req.user.idusuario }
    });

    if (!academicos || academicos.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de académico.' });
    }

    const idsAcademico = academicos.map(a => a.idacademico);

    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const eventos = await Evento.findAll({
        where: {
          idacademico: idsAcademico,
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: ['estado']
      });

      const total = eventos.length;

      data.push({
        name: start.toLocaleString('es-ES', { month: 'short', year: '2-digit' }),
        eventos: total
      });
    }

    res.status(200).json({ historical: data });
  } catch (error) {
    console.error('❌ Error en getMyHistoricalData:', error);
    res.status(500).json({ 
      error: 'Error al cargar tu historial',
      message: error.message 
    });
  }
});

export const getMyCommitteeEvents = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const { Evento, sequelize } = models;
    const { idusuario } = req.user;

    if (!idusuario) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    console.log('🔍 Buscando comités para idusuario:', idusuario);

 const committeeRecords = await sequelize.query(
  `SELECT idevento, created_at FROM public.comite WHERE idusuario = :idusuario`,
  {
    replacements: { idusuario: idusuario },
    type: sequelize.QueryTypes.SELECT
  }
);
    console.log('✅ Registros encontrados:', committeeRecords);

    if (committeeRecords.length === 0) {
      return res.status(200).json({ events: [] });
    }

    const eventoIds = committeeRecords.map(record => record.idevento);

    // Obtener detalles de los eventos
    const events = await Evento.findAll({
      where: { idevento: eventoIds },
      attributes: [
        'idevento',
        'nombreevento',
        'descripcion',
        'fechaevento',
        'estado',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Mapear con la fecha de asignación
    const eventsWithAssignment = events.map(event => {
      const assignment = committeeRecords.find(r => r.idevento === event.idevento);
      return {
        ...event.get({ plain: true }),
        assignedAt: assignment?.created_at,
        role: 'comité'
      };
    });

    res.status(200).json({ events: eventsWithAssignment });
    
  } catch (error) {
    console.error('❌ Error en getMyCommitteeEvents:', error);
    res.status(500).json({ 
      error: 'Error al cargar tus eventos como comité',
      message: error.message 
    });
  }
});