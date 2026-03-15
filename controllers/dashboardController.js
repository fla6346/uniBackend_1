const { getModels } = require('../models/index.js');
const { Op } = require('sequelize');
const asyncHandler = require('express-async-handler');

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { User, Evento, Academico, sequelize } = models;

    const activeUsers = await User.count({
      where: { habilitado: '1' }
    });

    const totalEvents = await Evento.count();

       const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const resultadoNuevos = await sequelize.query(
      `SELECT COUNT(*) as total FROM usuario WHERE created_at >= :inicioMes`,
      { replacements: { inicioMes }, type: sequelize.QueryTypes.SELECT }
    );
    const usuariosNuevosEsteMes = parseInt(
      resultadoNuevos[0]?.total || resultadoNuevos[0]?.count || 0
    );

    const todosLosEventos = await Evento.findAll({
      attributes: ['estado', 'created_at']
    });

    const estadoCounts = todosLosEventos.reduce((acc, evento) => {
      const estado = evento.estado || 'sin_estado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const primerDiaDelMes = new Date();
    primerDiaDelMes.setDate(1);
    primerDiaDelMes.setHours(0, 0, 0, 0);

    const eventosAprobadosMes = todosLosEventos.filter(evento => {
      const fechaEvento = new Date(evento.created_at);
      return evento.estado === 'aprobado' && fechaEvento >= primerDiaDelMes;
    }).length;

    const eventosAprobados = estadoCounts.aprobado || 0;
    const tasaAprobacion = totalEvents > 0 
      ? Math.round((eventosAprobados / totalEvents) * 100) 
      : 0;

    const systemStability = 99;
    const miEvento = await Evento.findAll({
      attributes: ['idevento','nombreevento', 'estado', 'idacademico']
    });
   
    let eventosPorFacultad = {};
    try {
      const [result] = await sequelize.query(`
      SELECT 
          f.nombre_facultad as facultad,
          COUNT(e.idevento) as total
      FROM facultad f
      LEFT JOIN academico a ON f.facultad_id = a.facultad_id
      LEFT JOIN evento e ON a.idacademico = e.idacademico
      GROUP BY f.facultad_id, f.nombre_facultad
      ORDER BY total DESC
      `);

      eventosPorFacultad = result.map((row) => {
        return {
          facultad: row.facultad,
          total: parseInt(row.total, 10)
        };
      });
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

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const found = results.find(row => row.fecha === dateString);
        eventosPorDia.push({
          fecha: dateString,
          total: found ? parseInt(found.total, 10) : 0
        });
      }
    } catch (diaError) {
      console.warn('⚠️ Error al cargar eventos aprobados por día:', diaError.message);
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
      usuariosNuevosEsteMes,
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

const getMensualStats = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { Evento } = models;

    const result = await Evento.sequelize.query(
      `
        SELECT 
          TO_CHAR("created_at", 'YYYY-MM') AS mes,
          COUNT(*)::INTEGER AS totalEvents,
          COUNT(*) FILTER (WHERE "estado" = 'aprobado')::INTEGER AS aprobado,
          COUNT(*) FILTER (WHERE "estado" = 'pendiente')::INTEGER AS pendiente,
          COUNT(*) FILTER (WHERE "estado" = 'rechazado')::INTEGER AS rechazado
        FROM "evento"
        WHERE "created_at" IS NOT NULL
        GROUP BY TO_CHAR("created_at", 'YYYY-MM')
        ORDER BY mes DESC;
      `,
      { type: Evento.sequelize.QueryTypes.SELECT }
    );

    const reportes = result.map(row => {
      const total = parseInt(row.totalEvents) || 0;
      const aprobado = parseInt(row.aprobado) || 0;
      const tasa = total > 0 ? parseFloat(((aprobado / total) * 100).toFixed(1)) : 0;
      
      return {
        mes: row.mes,
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

    res.status(200).json(reportes);

  } catch (error) {
    console.error('❌ Error en getMensualStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar estadísticas mensuales',
      message: error.message 
    });
  }
});

const getHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { Evento } = models;

    console.log('📈 Calculando datos históricos...');

    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const eventos = await Evento.findAll({
        where: {
          created_at: { [Op.between]: [start, end] }
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

const getMyDashboardStats = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { idusuario } = req.user;

    if (!idusuario) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }

    const { Evento, Academico } = models;

    const academicos = await Academico.findAll({
      where: { idusuario }
    });

    if (!academicos || academicos.length === 0) {
      return res.status(403).json({ error: 'No tienes perfil de académico registrado.' });
    }

    const idsAcademico = academicos.map(a => a.idacademico);

    const totalEvents = await Evento.count({
      where: { idacademico: idsAcademico }
    });

    const eventosPorEstado = await Evento.findAll({
      attributes: ['estado'],
      where: { idacademico: idsAcademico }
    });

    const estadoCounts = {};
    eventosPorEstado.forEach(evento => {
      const estado = evento.estado || 'sin_estado';
      estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
    });

    const primerDiaDelMes = new Date();
    primerDiaDelMes.setDate(1);
    primerDiaDelMes.setHours(0, 0, 0, 0);

    const eventosAprobadosMes = eventosPorEstado.filter(evento => {
      const fechaEvento = new Date(evento.created_at);
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

    res.status(200).json(stats);
    
  } catch (error) {
    console.error('❌ Error en getMyDashboardStats:', error);
    res.status(500).json({ 
      error: 'Error al cargar tus estadísticas',
      message: error.message 
    });
  }
});

const getMyHistoricalData = asyncHandler(async (req, res) => {
  try {
    const models = getModels();
    const { Evento, Academico } = models;
    const { idusuario } = req.user;

    if (!idusuario) {
      return res.status(401).json({ error: 'Usuario no identificado' });
    }
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
          created_at: { [Op.between]: [start, end] }
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

const getMyCommitteeEvents = asyncHandler(async (req, res) => {
  try {

    if (!req.user || !req.user.idusuario) {
      console.error('❌ [getMyCommitteeEvents] Usuario no autenticado o req.user faltante');
      return res.status(401).json({ 
        error: 'No autorizado. Por favor inicia sesión nuevamente.',
        debug: { hasUser: !!req.user, user: req.user }
      });
    }

    const { idusuario } = req.user;
    const models = getModels();
    const { sequelize } = models;
    const { Op } = require('sequelize');

    // --- NUEVO: Calcular fecha límite (hace 1 mes) ---
    const DIAS_A_MOSTRAR = 30; 
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - DIAS_A_MOSTRAR);
    console.log(`🔍 [getMyCommitteeEvents] Buscando eventos del comité desde: ${fechaLimite.toISOString()}`);
    // -------------------------------------------------

    try {
      const tableCheck = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = 'comite'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log('📋 [getMyCommitteeEvents] Columnas en tabla comite:', tableCheck.map(c => c.column_name));
    } catch (checkError) {
      console.warn('⚠️ No se pudo verificar estructura de tabla:', checkError.message);
    }

    // 1. Obtener registros del comité (asignaciones)
    const committeeRecords = await sequelize.query(
      `SELECT idevento, "created_at" as "created_at" 
       FROM public.comite 
       WHERE idusuario = :idusuario`,
      {
        replacements: { idusuario: idusuario },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (committeeRecords.length === 0) {
      console.log('ℹ️ [getMyCommitteeEvents] Usuario no está en ningún comité');
      return res.status(200).json({ events: [] });
    }

    const eventoIds = committeeRecords.map(record => record.idevento);

    const { Evento } = models;
    
    // 2. Obtener eventos con FILTRO DE FECHA
    const events = await Evento.findAll({
      where: { 
        idevento: eventoIds,
        // --- NUEVO: Filtrar eventos creados en el último mes ---
        created_at: { [Op.gte]: fechaLimite }
      },
      attributes: [
        'idevento',
        'nombreevento',
        'descripcion',
        'fechaevento',
        'estado',
        'created_at'
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`🔍 [getMyCommitteeEvents] Eventos encontrados: ${events.length}`);
    if(events.length > 0) {
        console.log(`🔍 [getMyCommitteeEvents] El evento más antiguo retornado tiene fecha: ${events[events.length-1].created_at}`);
    }

    // 3. Mapear fecha de asignación al comité
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
    console.error('❌ [getMyCommitteeEvents] Error:', {
      message: error.message,
      stack: error.stack,
      type: error.name
    });
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token inválido o expirado',
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Error al cargar tus eventos como comité',
      message: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
module.exports = {
  getDashboardStats,
  getMensualStats,
  getHistoricalData,
  getMyDashboardStats,
  getMyHistoricalData,
  getMyCommitteeEvents
};