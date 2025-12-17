import {getModels} from '../models/index.js ';
import asyncHandler from 'express-async-handler';

// Constants for better maintainability
const OBJETIVO_TYPES = {
  modeloPedagogico: 1,
  posicionamiento: 2,
  internacionalizacion: 3,
  rsu: 4,
  fidelizacion: 5,
  otro: 6
};

const OTRO_TIPO_ID = 6;
const OTRO_SEGMENTO_ID = 5;

// Helper function to parse JSON safely
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString || JSON.stringify(defaultValue));
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

// Helper function to create objectives
const createObjetivos = async (nuevoEventoId, data, transaction) => {
  const objetivosACrear = [];
  const parsedObjetivos = safeJsonParse(data.objetivos, {});

  // Create regular objectives
  for (const [key, value] of Object.entries(parsedObjetivos)) {
    if (value === true && OBJETIVO_TYPES[key]) {
      objetivosACrear.push({
        idevento: nuevoEventoId,
        idtipoobjetivo: OBJETIVO_TYPES[key],
        texto_personalizado: (key === 'otro') ? parsedObjetivos.otroTexto : null,
      });
    }
  }

  // Create segment-based objectives
  const parsedSegmentos = safeJsonParse(data.segmentos_objetivo, []);
  const argumentacionSegmento = data.argumentacion_segmento || '';
  const otroSegmentoTexto = parsedSegmentos.find(s => s.id === OTRO_SEGMENTO_ID)?.texto || '';

  if (argumentacionSegmento.trim() || otroSegmentoTexto.trim()) {
    objetivosACrear.push({
      idevento: nuevoEventoId,
      idtipoobjetivo: OTRO_TIPO_ID,
      texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
      argumentacion: argumentacionSegmento.trim(),
    });
  }

  return objetivosACrear.length > 0 
    ? await Objetivo.bulkCreate(objetivosACrear, { transaction })
    : [];
};

// Helper function to associate objectives with segments
const associateObjetivosWithSegmentos = async (objetivos, segmentosData, transaction) => {
  if (!objetivos.length || !segmentosData.length) return;

  const associations = [];
  for (const objetivo of objetivos) {
    for (const segmentoData of segmentosData) {
      const textoPersonalizado = (segmentoData.id === OTRO_SEGMENTO_ID) ? segmentoData.texto : null;
      associations.push({
        idobjetivo: objetivo.idobjetivo,
        idsegmento: segmentoData.id,
        texto_personalizado: textoPersonalizado
      });
    }
  }

  // Bulk insert for better performance
  if (associations.length > 0) {
    const query = `
      INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) 
      VALUES ${associations.map(() => '(?, ?, ?)').join(', ')}
    `;
    const values = associations.flatMap(assoc => [
      assoc.idobjetivo, 
      assoc.idsegmento, 
      assoc.texto_personalizado
    ]);
    
    await sequelize.query(query, { 
      replacements: values, 
      transaction 
    });
  }
};

// Helper function to create PDI objectives
const createObjetivosPDI = async (nuevoEventoId, data, transaction) => {
  const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
  if (!objetivosPDIArray.length) return;

  const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
  if (!descripcionesPDI.length) return;

  const objetivoGeneralPDI = await Objetivo.create({
    idevento: nuevoEventoId,
    idtipoobjetivo: OTRO_TIPO_ID,
    texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
    argumentacion: data.argumentacion_pdi || null,
  }, { transaction });

  const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
    idobjetivo: objetivoGeneralPDI.idobjetivo,
    descripcion: descripcion,
  }));

  await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction });
};

// Helper function to create event types associations
const createEventoTipos = async (nuevoEventoId, tiposDeEvento, transaction) => {
  if (!Array.isArray(tiposDeEvento) || !tiposDeEvento.length) return;

  const associations = tiposDeEvento.map(tipo => [
    nuevoEventoId, 
    tipo.id, 
    tipo.texto || null
  ]);

  const query = `
    INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) 
    VALUES ${associations.map(() => '(?, ?, ?)').join(', ')}
  `;
  const values = associations.flat();

  await sequelize.query(query, { 
    replacements: values, 
    transaction 
  });
};

export const createEvento = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const data = req.body;
    console.log('Datos recibidos:', JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.nombreevento || !data.fechaevento) {
      await t.rollback();
      return res.status(400).json({ 
        message: 'Campos requeridos: nombreevento, fechaevento' 
      });
    }
const responsableCompleto = `${req.user.nombre} ${req.user.apellidopat || ''}`.trim() || 'Responsable no especificado';

    // Create main event
    const nuevoEvento = await Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento,
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: responsableCompleto,
      idacademico: data.user.idusuario
    }, { transaction: t });

    const nuevoEventoId = nuevoEvento.idevento;
    console.log('Evento creado con ID:', nuevoEventoId);

    // 1. TIPOS DE EVENTOS
    if (data.tipos_de_evento && Array.isArray(data.tipos_de_evento)) {
      console.log('Creando tipos de eventos:', data.tipos_de_evento);
      for (const tipo of data.tipos_de_evento) {
        await sequelize.query(
          'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
          { replacements: [nuevoEventoId, tipo.id, tipo.texto || null], transaction: t }
        );
      }
    }

    // 2. OBJETIVOS
    const objetivosACrear = [];
    const parsedObjetivos = safeJsonParse(data.objetivos, {});
    console.log('Objetivos parseados:', parsedObjetivos);

    const objetivoMapping = {
      modeloPedagogico: 1, 
      posicionamiento: 2, 
      internacionalizacion: 3,
      rsu: 4, 
      fidelizacion: 5, 
      otro: 6
    };

    // Crear objetivos básicos
    for (const key in parsedObjetivos) {
      if (parsedObjetivos[key] === true && objetivoMapping[key]) {
        objetivosACrear.push({
          idevento: nuevoEventoId,
          idtipoobjetivo: objetivoMapping[key],
          texto_personalizado: (key === 'otro') ? parsedObjetivos.otroTexto : null,
          argumentacion: data.argumentacion || null,
        });
      }
    }

    // Manejar segmentos y crear objetivo de segmentación si es necesario
    const parsedSegmentos = safeJsonParse(data.segmentos_objetivo, []);
    const argumentacionSegmento = data.argumentacion_segmento || '';
    const otroSegmentoTexto = parsedSegmentos.find(s => s.id === 5)?.texto || '';

    console.log('Segmentos parseados:', parsedSegmentos);
    console.log('Argumentación segmento:', argumentacionSegmento);

    // Si hay segmentos o argumentación de segmentos, crear objetivo de segmentación
    if (parsedSegmentos.length > 0 || argumentacionSegmento.trim()) {
      objetivosACrear.push({
        idevento: nuevoEventoId,
        idtipoobjetivo: 6, // Tipo "Otro" para segmentación
        texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
        argumentacion: argumentacionSegmento.trim() || null,
      });
    }

    // Crear objetivos en bulk
    let nuevosObjetivos = [];
    if (objetivosACrear.length > 0) {
      console.log('Creando objetivos:', objetivosACrear);
      nuevosObjetivos = await Objetivo.bulkCreate(objetivosACrear, { transaction: t });
      console.log('Objetivos creados:', nuevosObjetivos.length);
    }

    // 3. OBJETIVOS PDI
    const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
    console.log('Objetivos PDI:', objetivosPDIArray);

    if (objetivosPDIArray && objetivosPDIArray.length > 0) {
      const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
      if (descripcionesPDI.length > 0) {
        const objetivoGeneralPDI = await Objetivo.create({
          idevento: nuevoEventoId,
          idtipoobjetivo: 6,
          texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
          argumentacion: data.argumentacion_pdi || null,
        }, { transaction: t });

        nuevosObjetivos.push(objetivoGeneralPDI);

        const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
          idobjetivo: objetivoGeneralPDI.idobjetivo,
          descripcion: descripcion,
        }));
        await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
        console.log('Objetivos PDI creados:', objetivosPDIACrear.length);
      }
    }

    // 4. ASOCIAR OBJETIVOS CON SEGMENTOS
    if (parsedSegmentos.length > 0 && nuevosObjetivos.length > 0) {
      console.log('Asociando objetivos con segmentos...');
      for (const objetivo of nuevosObjetivos) {
        for (const segmentoData of parsedSegmentos) {
          const textoPersonalizado = (segmentoData.id === 5) ? segmentoData.texto : null;
          console.log(`Asociando objetivo ${objetivo.idobjetivo} con segmento ${segmentoData.id}`);
          
          await sequelize.query(
            'INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) VALUES (?, ?, ?)',
            {
              replacements: [objetivo.idobjetivo, segmentoData.id, textoPersonalizado],
              transaction: t
            }
          );
        }
      }
    }

    // 5. RESULTADOS ESPERADOS
    console.log('Creando resultados esperados:', data.resultados_esperados);
    await Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: parseInt(data.resultados_esperados?.participacion, 10) || 0,
      satisfaccion_esperada: parseInt(data.resultados_esperados?.satisfaccion, 10) || 0,
      otros_resultados: data.resultados_esperados?.otro || null,
    }, { transaction: t });

    // 6. RECURSOS
    if (data.recursos && Array.isArray(data.recursos)) {
      console.log('Creando recursos:', data.recursos);
      const recursosACrear = data.recursos.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso, // CORREGIDO: era 'rec.idrecurso'
        nombre_recurso: recurso.nombre_recurso, // CORREGIDO: era 'rec.nombre_recurso'
        cantidad: recurso.cantidad || 1,
        costo_unitario: recurso.costo_unitario || 0,
        costo_total: recurso.costo_total || 0,
      }));

      if (recursosACrear.length > 0) {
        await Recurso.bulkCreate(recursosACrear, { transaction: t });
        console.log('Recursos creados:', recursosACrear.length);
      }
    }

       try {
      const { UserComite } = await getModels();

      // 1. Obtener los IDs de los usuarios en el comité del evento recién creado
      const miembrosComite = await UserComite.findAll({
        where: { idevento: nuevoEventoId },
        attributes: ['idusuario'],
        transaction: t // Usa la misma transacción
      });

      const idsDestinatarios = miembrosComite.map(m => m.idusuario);

      if (idsDestinatarios.length > 0) {
        const { Notification } = await import('./notificationController.js');
        
        const notificationPayload = {
          title: 'Nuevo evento en tu comité',
          message: `Se ha creado un nuevo evento: "${nuevoEvento.nombreevento}". Por favor, revísalo lo antes posible.`,
          type: 'info',
          idevento: nuevoEventoId,
          idusuarios: idsDestinatarios
        };

        await Notification(
          { body: notificationPayload },
          {
            status: (statusCode) => ({
              json: (data) => {
                if (statusCode >= 400) {
                  console.error('⚠️ Error al enviar notificación desde createEvento:', data);
                } else {
                  console.log(`✅ Notificaciones enviadas a ${idsDestinatarios.length} miembros del comité.`);
                }
              }
            })
          }
        );
      }

    } catch (notificationError) {
      console.error('❗ Error no crítico al notificar al comité:', notificationError);
    }

    await t.commit();
    console.log('Transacción completada exitosamente');

    // Recargar evento con todas las relaciones
    const eventoCompleto = await Evento.findByPk(nuevoEventoId, {
      include: [
        { model: Resultado, as: 'resultados' },
        { model: Objetivo, as: 'objetivos' },
        { model: Recurso, as: 'recursos' }
      ]
    });

    res.status(201).json({ 
      message: 'Evento creado exitosamente', 
      evento: eventoCompleto || nuevoEvento 
    });

  } catch (error) {
    await t.rollback();
    console.error('Error en la transacción al crear el evento:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
};

export const getAllEventos = async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      }
    });

    // CORREGIDO: Usar 'eventos' en lugar de 'eventosFromDb' que no existe
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventosConUrl = eventos.map(evento => {
      const eventoData = evento.get({ plain: true });
      eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
      return eventoData;
    });

    res.status(200).json(eventosConUrl);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ 
      message: 'Error al obtener eventos',
      error: error.message 
    });
  }
};

export const fetchAllEvents = async () => {
  try {
    const eventos = await Evento.findAll({
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
    const evento = await Evento.findByPk(req.params.id, {
      attributes: {
        exclude: ['organizerId', 'categoryId', 'locationId']
      },
      include: [
        { model: Resultado, as: 'resultados' },
        { model: Objetivo, as: 'objetivos' }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    res.status(200).json(evento);
  } catch (error) {
    console.error('Error al obtener evento por ID:', error);
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});

export const updateEvento = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Authorization check (uncomment when user system is implemented)
    // if (evento.idorganizador && evento.idorganizador.toString() !== req.user.idusuario && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'No autorizado para modificar este evento' });
    // }

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
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
    const evento = await Evento.findByPk(req.params.id);

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

// Raw query functions (kept for compatibility)
export const fetchEventsWithRawQuery = async () => {
  try {
    console.log('[DB-RAW] Buscando eventos con consulta directa...');
    
    const [eventos] = await sequelize.query(
      "SELECT idevento, nombreevento, lugarevento, fechaevento, horaevento FROM evento ORDER BY fechaevento DESC"
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
    
    const evento = await Evento.findByPk(id, {
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