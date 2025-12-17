import {  getModels} from '../models/index.js';
import asyncHandler from 'express-async-handler';

// --- CONSTANTES ---
const OBJETIVO_TYPES = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};
const OTRO_TIPO_ID = 6;

const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    if (!jsonString || typeof jsonString !== 'string') return defaultValue;
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

export const createEvento = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const data = req.body;

    // 1. Crear el Evento principal
    const nuevoEvento = await models.Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento,
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: data.responsable_evento,
      descripcion: data.descripcion || null,
      participantes_esperados: data.participantes_esperados || 0,
      estado: 'Pendiente', // Estado por defecto
    }, { transaction: t });
    const nuevoEventoId = nuevoEvento.idevento;
    console.log(`✓ Evento principal creado con ID: ${nuevoEventoId}`);

    // 2. Asociar Tipos de Evento
    if (data.tipos_de_evento && Array.isArray(data.tipos_de_evento) && data.tipos_de_evento.length > 0) {
      for (const tipo of data.tipos_de_evento) {
        await sequelize.query(
          'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
          { replacements: [nuevoEventoId, tipo.id, tipo.texto_personalizado || null], transaction: t }
        );
      }
      console.log(`✓ ${data.tipos_de_evento.length} tipos de evento guardados`);
    }

    // 3. Inicializar variables
    let idsObjetivosVinculadosAlEvento = [];

    // 4. Procesar Objetivos
    if (Array.isArray(data.objetivos) && data.objetivos.length > 0) {
      const objetivosACrear = data.objetivos.map(obj => ({
        idtipoobjetivo: obj.id,
        texto_personalizado: obj.texto_personalizado || null
      }));
      const nuevosObjetivosCreados = await Objetivo.bulkCreate(objetivosACrear, { transaction: t, returning: true });

      // Asociar objetivos al evento a través de EventoObjetivo
      const relacionesEventoObjetivo = nuevosObjetivosCreados.map((objetivo, index) => ({
        idevento: nuevoEventoId,
        idobjetivo: objetivo.idobjetivo,
        texto_personalizado_relacion: data.objetivos[index]?.texto_personalizado_relacion || null
      }));
      await models.EventoObjetivo.bulkCreate(relacionesEventoObjetivo, { transaction: t });

      idsObjetivosVinculadosAlEvento = nuevosObjetivosCreados.map(obj => obj.idobjetivo);
      console.log(`✓ ${idsObjetivosVinculadosAlEvento.length} objetivos asociados a través de EventoObjetivo.`);
    }

    // 5. Procesar Objetivos PDI
    const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
    const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
    if (descripcionesPDI.length > 0) {
      const objetivoGeneralPDI = await models.Objetivo.create({
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
      }, { transaction: t });

      await models.EventoObjetivo.create({
        idevento: nuevoEventoId,
        idobjetivo: objetivoGeneralPDI.idobjetivo,
        texto_personalizado_relacion: 'Objetivo PDI General'
      }, { transaction: t });

      idsObjetivosVinculadosAlEvento.push(objetivoGeneralPDI.idobjetivo);

      const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
        idobjetivo: objetivoGeneralPDI.idobjetivo,
        descripcion: descripcion,
      }));
      await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
      console.log(`✓ ${descripcionesPDI.length} objetivos PDI detallados creados.`);
    }

    // 6. Procesar Argumentaciones
    if (data.argumentacion && typeof data.argumentacion === 'string' && data.argumentacion.trim() !== '') {
      if (idsObjetivosVinculadosAlEvento.length > 0) {
        for (const obj of idsObjetivosVinculadosAlEvento) {
          await sequelize.query(
            'INSERT INTO argumentacion (idobjetivo, texto_argumentacion) VALUES (?, ?)',
            { replacements: [obj, data.argumentacion], transaction: t }
          ).catch(err => {
            console.error('Error al insertar argumentación:', err);
          });
        }
        console.log(`✓ 1 argumentación asociada.`);
      } else {
        console.log('No se proporcionaron objetivos para asociar argumentaciones.');
      }
    } else {
      console.log('No se proporcionó una argumentación válida.');
    }

    // 7. Asociar Segmentos Objetivo
    if (idsObjetivosVinculadosAlEvento.length > 0 && Array.isArray(data.segmentos_objetivo) && data.segmentos_objetivo.length > 0) {
      const relacionesSegmento = [];
      for (const objetivoId of idsObjetivosVinculadosAlEvento) {
        for (const segmento of data.segmentos_objetivo) {
        relacionesSegmento.push({
            idobjetivo: objetivoId,
            idsegmento: segmento.id,
            texto_personalizado: segmento.texto_personalizado || null
          });
        }
      }
      await ObjetivoSegmento.bulkCreate(relacionesSegmento, { transaction: t });
    }

    // 8. Crear Resultados
    const resultados = typeof data.resultados_esperados === 'string'
      ? JSON.parse(data.resultados_esperados)
      : (data.resultados_esperados || {});
    await models.Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: resultados.participacion || null,
      satisfaccion_esperada: resultados.satisfaccion || null,
      otros_resultados: resultados.otro || null,
    }, { transaction: t });

    // 9. Asociar Recursos
    const recursosIds = data.recursos || [];
    console.log('Datos de recursos recibidos:', recursosIds); // Depuración
    if (Array.isArray(recursosIds) && recursosIds.length > 0) {
      const relacionesRecurso = recursosIds.map(recursoId => ({
        idevento: nuevoEventoId,
        idrecurso: recursoId
      }));
      await EventoRecurso.bulkCreate(relacionesRecurso, {
        transaction: t,
      });
      console.log(`✓ ${recursosIds.length} recursos asociados`);
    } else {
      console.log('⚠️ No se proporcionaron recursos o el formato es incorrecto');
    }
   const recursosNuevos = data.recursos_nuevos || [];
    if (Array.isArray(recursosNuevos) && recursosNuevos.length > 0) {
      // Crear los recursos nuevos
      const nuevosRecursosCreados = await models.Recurso.bulkCreate(recursosNuevos, { transaction: t, returning: true });
      // Asociar los recursos nuevos al evento
        console.log('Nuevos recursos creados:', nuevosRecursosCreados);
      const relacionesNuevosRecursos = nuevosRecursosCreados.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso
      }));
      await EventoRecurso.bulkCreate(relacionesNuevosRecursos, { transaction: t });
      console.log(`✓ ${recursosNuevos.length} recursos nuevos creados y asociados`);
    }
    if (Array.isArray(data.comite) && data.comite.length > 0) {
  const { Notificacion } = models;
  if (Notificacion) {
    const notificaciones = data.comite.map(idusuario => ({
      idusuario: parseInt(idusuario, 10),
      titulo: 'Nuevo evento asignado',
      mensaje: `Has sido asignado al comité del evento "${data.nombreevento}".`,
      tipo: 'nuevo_evento',
      estado: 'no_leido',
      created_at: new Date()
    }));

    await Notificacion.bulkCreate(notificaciones, { transaction: t });
    console.log(`✓ ${notificaciones.length} notificaciones enviadas al comité.`);
  } else {
    console.warn('⚠️ Modelo Notificacion no disponible. Notificaciones omitidas.');
  }
}
    await t.commit();

    const eventoCompleto = await Evento.findByPk(nuevoEventoId, {
      include: [
        { model: models.Objetivo, as: 'Objetivos', through: { attributes: [] } },
        { model: models.Resultado, as: 'Resultados' },
        { model: models.EventoTipo, as: 'TipoEvento' },
        { model: models.Recurso, as: 'Recursos' },
      ]
    });
    res.status(201).json({ message: 'Evento creado exitosamente', evento: eventoCompleto });

  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
};

export const getAllEventos = asyncHandler(async (req, res) => {
  const eventos = await models.Evento.findAll({
    order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
    attributes: { exclude: ['organizerId', 'categoryId', 'locationId'] }
  });

  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  const eventosConUrl = eventos.map(evento => {
    const eventoData = evento.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
    return eventoData;
  });
  res.status(200).json(eventosConUrl);
});

export const fetchAllEvents = async () => {
  try {
    const eventos = await models.Evento.findAll({
      attributes: [
        'idevento',
        'nombreevento',
        'fechaevento',
        'horaevento'
      ],
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
    });
    return eventos;
  } catch (error) {
    console.error('Error in fetchAllEvents:', error);
    throw error;
  }
};

export const getEventoById = asyncHandler(async (req, res) => {
  try {
    const models = await getModels();
    const evento = await models.Evento.findByPk(req.params.id, {
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      },
      include: [
        { model: models.Resultado, as: 'Resultados' },
        { 
          model: models.Objetivo, 
          as: 'Objetivos',
          through: { attributes: ['texto_personalizado_relacion'] }
        },
        { model: models.Recurso, as: 'Recursos' }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Agregar URL de imagen si existe
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventoData = evento.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;

    res.status(200).json(eventoData);
  } catch (error) {
    console.error('Error al obtener evento por ID:', error);
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});
// Endpoint para que DAF solo vea SUS eventos aprobados
export const getEventosAprobadosDaf = asyncHandler(async (req, res) => {
  const models = await getModels();
  const Evento = models.Evento;
  
  try {
    // Solo eventos aprobados CREADOS POR EL USUARIO ACTUAL
    const eventos = await Evento.findAll({
      where: {
        idacademico: req.user.idusuario,  // 👈 Filtrar por creador
        estado: 'aprobado'
      },
      order: [['fechaevento', 'DESC']],
      attributes: {
        exclude: ['creadorid'] 
      }
    });

    const eventosTransformados = eventos.map(evento => ({
      idevento: evento.idevento,
      nombreevento: evento.nombreevento || 'Sin título',
      descripcion: evento.descripcion || 'Sin descripción',
      fechaevento: evento.fechaevento,
      horaevento: evento.horaevento,
      lugarevento: evento.lugarevento || 'Sin ubicación',
      responsable_evento: evento.responsable_evento || 'Sin organizador',
      participantes_esperados: evento.participantes_esperados || 'No especificado',
      estado: evento.estado || 'aprobado',
      createdAt: evento.createdAt
    }));

    res.status(200).json(eventosTransformados);

  } catch (error) {
    console.error('Error al obtener eventos aprobados del usuario:', error);
    res.status(500).json({ 
      message: 'Error al cargar tus eventos aprobados',
      error: error.message 
    });
  }
});


// ===== NUEVAS FUNCIONES DE APROBACIÓN =====







// ===== FUNCIONES EXISTENTES ACTUALIZADAS =====

export const updateEvento = asyncHandler(async (req, res) => {
  try {
    const evento = await models.Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Authorization check (uncomment when user system is implemented)
    // if (evento.idorganizador && evento.idorganizador.toString() !== req.user.idusuario && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'No autorizado para modificar este evento' });
    // }

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
      'responsable_evento', 'descripcion', 'participantes_esperados',
      'idtipoevento', 'idservicio', 'idactividad', 'idambiente', 'idobjetivo'
    ];

    // Only update provided fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.startsWith('id') && field !== 'idobjetivo') {
          // Handle integer fields
          evento[field] = req.body[field] ? parseInt(req.body[field]) : null;
        } else {
          evento[field] = req.body[field];
        }
      }
    });

    const eventoActualizado = await evento.save();
    res.status(200).json(eventoActualizado);

  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ 
      message: 'Error al actualizar evento',
      error: error.message 
    });
  }
});

export const deleteEvento = asyncHandler(async (req, res) => {
  try {
    const evento = await models.Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Authorization check (uncomment when user system is implemented)
    // if (evento.idorganizador && evento.idorganizador.toString() !== req.user.idusuario && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'No autorizado para eliminar este evento' });
    // }

    await evento.destroy();
    res.status(200).json({ message: 'Evento eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ 
      message: 'Error al eliminar evento',
      error: error.message 
    });
  }
});

// ===== FUNCIONES AUXILIARES =====

// Función auxiliar para enviar notificaciones (implementar según tus necesidades)
const sendNotificationToOrganizer = async (evento, action, reason = null) => {
  try {
    // Aquí implementarías la lógica de notificaciones
    // Por ejemplo, envío de email, notificación push, etc.
    
    const message = action === 'approved' 
      ? `Tu evento "${evento.nombreevento}" ha sido aprobado.`
      : `Tu evento "${evento.nombreevento}" ha sido rechazado. Razón: ${reason}`;

    console.log('Notificación enviada:', message);
    
    // Ejemplo de implementación con Telegram (si tienes configurado)
    /*
    if (evento.organizador_telegram_id) {
      await axios.post(process.env.TELEGRAM_BOT_URL, {
        chat_id: evento.organizador_telegram_id,
        text: message
      });
    }
    */
    
  } catch (error) {
    console.error('Error al enviar notificación:', error);
  }
};

// ===== FUNCIONES EXISTENTES (mantenidas para compatibilidad) =====

// Raw query functions (kept for compatibility)
export const fetchEventsWithRawQuery = async () => {
  try {
    console.log('[DB-RAW] Buscando eventos con consulta directa...');
    
    const [eventos] = await sequelize.query(
      "SELECT idevento, nombreevento, lugarevento, fechaevento, horaevento, estado FROM evento ORDER BY fechaevento DESC"
    );
    
    console.log(`[DB-RAW] Se encontraron ${eventos.length} eventos.`);
    return eventos;
  } catch (error) {
    console.error('Error in fetchEventsWithRawQuery:', error);
    throw error;
  }
};

export const getEventos = asyncHandler(async (req, res) => {
  try {
    const eventos = await fetchEventsWithRawQuery();
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al obtener eventos con consulta raw:', error);
    res.status(500).json({ 
      message: 'Error al obtener eventos',
      error: error.message 
    });
  }
});

export const fetchEventById = async (id) => {
  try {
    console.log(`[DB] Buscando evento con ID: ${id}`);
    
    const evento = await models.Evento.findByPk(id, {
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      }
    });

    if (evento) {
      console.log(`[DB] Evento encontrado: ${evento.nombreevento}`);
    } else {
      console.log(`[DB] No se encontró ningún evento con ID: ${id}`);
    }
    
    return evento;
  } catch (error) {
    console.error('Error in fetchEventById:', error);
    throw error;
  }
};

export const getEventoByIdA = asyncHandler(async (req, res) => {
  try {
    const evento = await fetchEventById(req.params.id);
    if (evento) {
      res.status(200).json(evento);
    } else {
      res.status(404).json({ message: 'Evento no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener evento por ID (alternativo):', error);
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});

// Future implementation for event registration with Telegram notifications
/*
export const inscribirEvento = asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userId, eventoId } = req.body;

    // 1. Register user for event (implement your logic here)
    // const registration = await EventRegistration.create({
    //   userId,
    //   eventoId,
    //   fechaInscripcion: new Date()
    // }, { transaction });

    // 2. Send Telegram notification
    try {
      const user = await User.findByPk(userId, {
        attributes: ['telegram_chat_id']
      });
      
      if (user?.telegram_chat_id) {
        const evento = await Evento.findByPk(eventoId, {
          attributes: ['nombreevento']
        });

        if (evento) {
          const rasaWebhookUrl = process.env.RASA_WEBHOOK_URL;
          await axios.post(rasaWebhookUrl, {
            recipient_id: user.telegram_chat_id,
            text: `¡Confirmado! Te has inscrito exitosamente al evento: "${evento.nombreevento}".`
          });
        }
      }
    } catch (notificationError) {
      console.error("No se pudo enviar la notificación de Telegram:", notificationError);
      // Don't fail the main operation due to notification errors
    }

    await transaction.commit();
    res.status(200).json({ message: "Inscripción exitosa." });

  } catch (error) {
    await transaction.rollback();
    console.error('Error en inscripción:', error);
    res.status(500).json({ 
      message: 'Error en la inscripción',
      error: error.message 
    });
  }
});
*/