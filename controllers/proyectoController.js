import { sequelize,
  Evento,
  EventoTipo,
  Objetivo, 
  Resultado,
  ObjetivoPDI,
  TipoObjetivo,
  Segmento,
  Recurso,
  User } from '../config/db.js';
import { Op } from 'sequelize';
import asyncHandler from 'express-async-handler';

const guardarTiposEvento = async (idevento, tiposEvento, transaction) => {
  // CORRECCIÓN: La lógica estaba invertida
  if (!tiposEvento || !Array.isArray(tiposEvento)) {
    console.log('No hay tipos de eventos para procesar');
    return;
  }

  console.log('Procesando tipos de eventos:', tiposEvento);
  
  for (const tipo of tiposEvento) {
    if (!tipo.id) {
      console.warn('Tipo de evento sin ID:', tipo);
      continue;
    }
    
    await sequelize.query(
      'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
      { 
        replacements: [idevento, tipo.id, tipo.texto_personalizado || null], 
        transaction 
      }
    );
  }
  console.log(`✓ ${tiposEvento.length} tipos de evento guardados`);
};

// --- CONSTANTES ---
const OBJETIVO_TYPES = {
  modeloPedagogico: 1, posicionamiento: 2, internacionalizacion: 3,
  rsu: 4, fidelizacion: 5, otro: 6
};
const OTRO_TIPO_ID = 6;
const OTRO_SEGMENTO_ID = 5;

// --- FUNCIONES AUXILIARES ---
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    if (!jsonString) return defaultValue;
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

// --- CONTROLADOR PRINCIPAL CORREGIDO ---
export const createEvento = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const data = req.body;
    
    console.log('=== DEBUG DATOS RECIBIDOS ===');
    console.log('data.tipos_de_evento:', data.tipos_de_evento);
    console.log('data.segmentos_objetivo (raw):', data.segmentos_objetivo);

    // 1. Crear el Evento principal
    const nuevoEvento = await Evento.create({
      nombreevento: data.nombreevento,
      lugarevento: data.lugarevento,
      fechaevento: data.fechaevento,
      horaevento: data.horaevento,
      responsable_evento: data.responsable_evento,
      aprobado:false,
      rechazado:false,

    }, { transaction: t });

    const nuevoEventoId = nuevoEvento.idevento;

    await guardarTiposEvento(nuevoEventoId, data.tipos_de_evento, t);

    const objetivosACrear = [];
    const parsedObjetivos = safeJsonParse(data.objetivos, {});

    for (const key in parsedObjetivos) {
      if (parsedObjetivos[key] === true && OBJETIVO_TYPES[key]) {
        objetivosACrear.push({
          idevento: nuevoEventoId,
          idtipoobjetivo: OBJETIVO_TYPES[key],
          texto_personalizado: (key === 'otro') ? parsedObjetivos.otroTexto : null,
          //argumentacion: data.argumentacion || null,
        });
      }
    }

    // 3.2 Preparar Objetivo de Segmentación
    const parsedSegmentos = safeJsonParse(data.segmentos_objetivo, []);
    const argumentacionSegmento = data.argumentacion_segmento || '';
    const otroSegmentoTexto = parsedSegmentos.find(s => s.texto)?.texto || '';

    if (argumentacionSegmento.trim() || otroSegmentoTexto.trim()) {
      objetivosACrear.push({
        idevento: nuevoEventoId,
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: otroSegmentoTexto.trim() || 'Segmentación de Público',
        argumentacion: argumentacionSegmento.trim(),
      });
    }

    let nuevosObjetivos = [];

    if (objetivosACrear.length > 0) {
      nuevosObjetivos = await Objetivo.bulkCreate(objetivosACrear, { transaction: t });
    }

    const objetivosPDIArray = safeJsonParse(data.objetivos_pdi, []);
    if (objetivosPDIArray.length > 0) {
      const descripcionesPDI = objetivosPDIArray.filter(desc => desc && desc.trim() !== '');
      if (descripcionesPDI.length > 0) {
        const objetivoGeneralPDI = await Objetivo.create({
          idevento: nuevoEventoId,
          idtipoobjetivo: OTRO_TIPO_ID,
          texto_personalizado: `PDI - ${descripcionesPDI.length} objetivos`,
          //argumentacion: data.argumentacion_pdi || null,
        }, { transaction: t });

        nuevosObjetivos.push(objetivoGeneralPDI);

        const objetivosPDIACrear = descripcionesPDI.map(descripcion => ({
          idobjetivo: objetivoGeneralPDI.idobjetivo,
          descripcion: descripcion,
        }));
        await ObjetivoPDI.bulkCreate(objetivosPDIACrear, { transaction: t });
      }
    }

    // 4. Procesar relaciones objetivo_segmento
    console.log('=== DEBUG SEGMENTOS ===');
    console.log('parsedSegmentos:', parsedSegmentos);
    console.log('nuevosObjetivos length:', nuevosObjetivos.length);
    console.log('nuevosObjetivos IDs:', nuevosObjetivos.map(o => o.idobjetivo));

    if (parsedSegmentos.length > 0) {
      // Si no hay objetivos, crear uno genérico
      if (nuevosObjetivos.length === 0) {
        console.log('No se encontraron objetivos, creando objetivo genérico...');
        const objetivoGenerico = await Objetivo.create({
          idevento: nuevoEventoId,
          idtipoobjetivo: OTRO_TIPO_ID,
          texto_personalizado: 'Objetivo General del Evento',
        }, { transaction: t });
        nuevosObjetivos.push(objetivoGenerico);
      }

      console.log('Insertando relaciones objetivo_segmento...');
      for (const objetivo of nuevosObjetivos) {
        for (const segmentoData of parsedSegmentos) {
          try {
            console.log(`Insertando: objetivo ${objetivo.idobjetivo}, segmento ${segmentoData.id}`);
            
            // Validar que segmentoData tiene la estructura correcta
            if (!segmentoData.id) {
              console.warn('Segmento sin ID:', segmentoData);
              continue;
            }

            await sequelize.query(
              'INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) VALUES (?, ?, ?)',
              {
                replacements: [objetivo.idobjetivo, segmentoData.id, segmentoData.texto_personalizado || null],
                transaction: t
              }
            );

            console.log(`✓ Insertado objetivo_segmento: ${objetivo.idobjetivo} - ${segmentoData.id}`);
          } catch (segmentoError) {
            console.error('Error insertando objetivo_segmento:', segmentoError);
            console.error('Datos:', { 
              objetivoId: objetivo.idobjetivo, 
              segmentoId: segmentoData.id, 
              textoPersonalizado: segmentoData.texto_personalizado 
            });
            // Re-lanzar el error para que la transacción se revierta
            throw segmentoError;
          }
        }
      }
      console.log('✓ Todas las relaciones objetivo_segmento insertadas correctamente');
    } else {
      console.log('No hay segmentos para asociar');
    }

    const parsedResultados = data.resultados_esperados || {};
    await Resultado.create({
      idevento: nuevoEventoId,
      participacion_esperada: parseInt(parsedResultados.participacion, 10) || 0,
      satisfaccion_esperada: parseInt(parsedResultados.satisfaccion, 10) || 0,
      otros_resultados: parsedResultados.otro || null,
    }, { transaction: t });

    // 6. Guardar Recursos
    if (data.recursos && Array.isArray(data.recursos)) {
      const recursosACrear = data.recursos.map(recurso => ({
        idevento: nuevoEventoId,
        idrecurso: recurso.idrecurso,
        nombre_recurso: recurso.nombre_recurso,
      }));
      if (recursosACrear.length > 0) {
        await Recurso.bulkCreate(recursosACrear, { transaction: t });
      }
    }

    await t.commit();

   const completo = await Evento.findByPk(nuevoEventoId, {
  include: [
    { model: Resultado, as: 'Resultados' },
    { model: Objetivo, as: 'Objetivos' },
    { model: Recurso, as: 'Recursos' },
    { model: User, as: 'creadorEvento' }
  ]
});
    res.status(201).json({ message: 'Evento creado exitosamente', evento: eventoCompleto });

  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error('Error en la transacción al crear el evento:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear el evento.',
      error: error.message,
      details: error.stack
    });
  }
};

export const getAllEventos = asyncHandler(async (req, res) => {
  const eventos = await Evento.findAll({
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
export const getid = async(req, res) => {
  const eventId = req.params.id;
  console.log(`[Backend] ${eventId}`);

}
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
    const { id } = req.params; 
    console.log('Backend: getEventoById - ID recibido de params:', id, 'Tipo:', typeof id); // LOG 1: ¿Llega el ID correcto?

    if (!id) {
      console.log('Backend: ID es null/undefined - Error en params');
      return res.status(400).json({ message: 'ID de evento requerido' });
    }

    const eventIdNum = parseInt(id, 10);
    if (isNaN(eventIdNum)) {
      console.log('Backend: ID no es numérico válido:', id);
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    console.log('Backend: ID convertido a número:', eventIdNum); // LOG 2

    const evento = await Evento.findByPk(eventIdNum, { 
      include: [
        { model: Resultado, as: 'Resultados' },  
        { model: Objetivo, as: 'Objetivos' },
        { model: User, as:'creador',
          attributes:['nombre','apellidopat','apellidomat','email','role']
        }
      ]
    });
    if (!evento) {
      console.log('Backend: No se encontró evento con ID:', eventIdNum);
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    if (evento.idevento !== eventIdNum) {
      console.warn('Backend: ADVERTENCIA - idevento devuelto NO coincide con ID buscado:', { buscado: eventIdNum, encontrado: evento.idevento });
    }

    const eventoData = evento.toJSON(); // Convierte a plain object
    eventoData.Resultados = eventoData.Resultados || []; // Asegura arrays
    eventoData.Objetivos = eventoData.Objetivos || [];

    console.log('Backend: Enviando respuesta con idevento:', eventoData.idevento); // LOG 4: ID final enviado

    res.status(200).json(eventoData);
  } catch (error) {
    console.error('Backend: Error al obtener evento por ID:', error);
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

    const allowedUpdates = [
      'nombreevento', 'lugarevento', 'fechaevento', 'horaevento',
      'idtipoevento', 'idservicio', 'idactividad', 'idambiente', 'idobjetivo'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.startsWith('id') && field !== 'idobjetivo') {
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
export const pendientes = asyncHandler(async(req,res) =>{
  try{
    const result = await sequelize.query('SELECT * FROM public.evento ORDER BY idevento ASC ',
      ['estado']
    );
    res.json({evento: result.rows});

  }catch(err){
    console.error('Error al obtener los pendientes',err);
    res.status(500).json({message:'Error interno'});
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
export const getEventosNoAprobados = asyncHandler(
  async(req,res)=>{
  try {
       console.log('Backend: Obteniendo eventos no aprobados...');
    
    const eventos = await Evento.findAndCountAll({
      where:{
        [Op.or]: [
          {estado:'pendiente'},
          {estado: null},
          {estado:''}
      ]
        },
         order: [['idevento', 'DESC']], // Usar el campo real
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    });

     console.log(`Backend: ${eventos.count} eventos no aprobados encontrados`);
     eventos.rows.forEach(evento => {
      console.log(`- Evento ID: ${evento.idevento}, Nombre: ${evento.nombreevento}, Estado: ${evento.estado}`);
    });
 const eventosTransformados = eventos.rows.map(evento => ({
        id: evento.idevento,
      title: evento.nombreevento || 'Sin título',
      description: evento.descripcion || 'Sin descripción',
      date: evento.fechaevento,
      time: evento.horaevento,
      location: evento.lugarevento || 'Sin ubicación',
      organizer: evento.responsable_evento || 'Sin organizador',
      attendees: evento.participantes_esperados || 'No especificado',
      status: evento.estado || 'pendiente',
      priority: 'media', // Valor por defecto
      category: 'General', // Valor por defecto
      submittedDate: evento.createdAt || evento.fechaevento,
      submittedBy: evento.responsable_evento || 'Sistema',
      // Campos adicionales de tu DB
      fechaAprobacion: evento.fecha_aprobacion,
      adminAprobador: evento.admin_aprobador,
      comentarios: evento.comentarios_admin
    }));
   console.log('Eventos transformados:', eventosTransformados.length);

    res.json({
      success: true,
      events: eventosTransformados,
      total: eventos.count,
      message: `Se encontraron ${eventos.count} eventos pendientes de aprobación`
    });

  } catch (error) {
    console.error('Error al obtener eventos no aprobados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener eventos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
export const aprobarEvento = async (req, res) => {
  const { id } = req.params;
  const evento = await Evento.findByPk(id);
  if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });
console.log('evento',evento);
  evento.estado = 'aprobado'; // ← minúscula
  await evento.save();
  res.json({ success: true, evento });
};

export const rechazarEvento = async (req, res) => {
  const { id } = req.params;
  const evento = await Evento.findByPk(id);
  if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

  evento.estado = 'rechazado'; // ← minúscula
  await evento.save();
  res.json({ success: true, evento });
};

export const debugEventoById = asyncHandler(async (req, res) => {
  try {
    console.log('=== DEBUG INFO ===');
    console.log('Requested ID:', req.params.id);
    console.log('ID Type:', typeof req.params.id);
    
    // Primero verificar si el ID es numérico
    const numericId = parseInt(req.params.id);
    if (isNaN(numericId)) {
      console.log('ERROR: ID no es numérico');
      return res.status(400).json({ 
        message: 'ID de evento inválido - debe ser numérico',
        receivedId: req.params.id,
        receivedType: typeof req.params.id
      });
    }
    
    console.log('Numeric ID:', numericId);
    
    // Verificar si existe en la base de datos
    console.log('Buscando en base de datos...');
    
    const evento = await Evento.findByPk(numericId);
    
    if (!evento) {
      console.log('Evento no encontrado en base de datos');
      
      // Mostrar eventos disponibles para debugging
      const eventosDisponibles = await Evento.findAll({
        attributes: ['idevento', 'nombreevento'],
        limit: 10
      });
      
      return res.status(404).json({ 
        message: 'Evento no encontrado',
        requestedId: numericId,
        availableEvents: eventosDisponibles.map(e => ({
          id: e.idevento,
          name: e.nombreevento
        }))
      });
    }
    
    console.log('Evento encontrado:', evento.nombreevento);
    
    // Obtener evento con todas las relaciones
    const eventoCompleto = await Evento.findByPk(numericId, {
      include: [
        { model: Resultado, as: 'Resultados' },
        { 
          model: Objetivo, 
          as: 'Objetivos',
          through: { attributes: ['texto_personalizado_relacion'] }
        },
        { model: Recurso, as: 'Recursos' }
      ]
    });
    
    console.log('Evento completo obtenido');
    
    // Agregar URL de imagen si existe
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventoData = eventoCompleto.get({ plain: true });
    eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
    
    console.log('=== DEBUG INFO END ===');
    
    res.status(200).json({
      debug: true,
      message: 'Evento encontrado exitosamente',
      data: eventoData
    });
    
  } catch (error) {
    console.error('=== ERROR DEBUG ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== ERROR DEBUG END ===');
    
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message,
      stack: error.stack,
      debug: true
    });
  }
});
export const approveEvent = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Verificar que el usuario tenga permisos de administrador
    // if (req.user.role !== 'admin' && req.user.role !== 'director') {
    //   return res.status(403).json({ message: 'No tienes permisos para aprobar eventos' });
    // }

    // Actualizar el estado del evento
    evento.estado = 'aprobado';
    evento.fecha_aprobacion = new Date();
    // evento.aprobado_por = req.user.idusuario; // Descomenta cuando tengas el sistema de usuarios

    const eventoActualizado = await evento.save();

    // Opcional: Enviar notificación al organizador
    // await sendNotificationToOrganizer(evento, 'approved');

    res.status(200).json({
      message: 'Evento aprobado exitosamente',
      evento: eventoActualizado
    });

  } catch (error) {
    console.error('Error al aprobar evento:', error);
    res.status(500).json({ 
      message: 'Error al aprobar evento',
      error: error.message 
    });
  }
});
export const getApprovedEvents = asyncHandler(async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: {
        estado: 'Aprobado'
      },
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: Objetivo, as: 'Objetivos' },
        { model: Recurso, as: 'Recursos' }
      ]
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventosConUrl = eventos.map(evento => {
      const eventoData = evento.get({ plain: true });
      eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
      return eventoData;
    });

    res.status(200).json(eventosConUrl);
  } catch (error) {
    console.error('Error al obtener eventos aprobados:', error);
    res.status(500).json({ 
      message: 'Error al obtener eventos aprobados',
      error: error.message 
    });
  }
});
export const getPendingEvents = asyncHandler(async (req, res) => {
  try {
    const eventos = await Evento.findAll({
      where: {
        estado: 'Pendiente'
      },
      order: [['fechaevento', 'ASC'], ['horaevento', 'ASC']],
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: Objetivo, as: 'Objetivos' },
        { model: Recurso, as: 'Recursos' }
      ]
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const eventosConUrl = eventos.map(evento => {
      const eventoData = evento.get({ plain: true });
      eventoData.imagenUrl = eventoData.imagen ? `${baseUrl}${eventoData.imagen}` : null;
      return eventoData;
    });

    res.status(200).json(eventosConUrl);
  } catch (error) {
    console.error('Error al obtener eventos pendientes:', error);
    res.status(500).json({ 
      message: 'Error al obtener eventos pendientes',
      error: error.message 
    });
  }
});

export const rejectEvent = asyncHandler(async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Verificar que el usuario tenga permisos de administrador
    // if (req.user.role !== 'admin' && req.user.role !== 'director') {
    //   return res.status(403).json({ message: 'No tienes permisos para rechazar eventos' });
    // }

    const { razon_rechazo } = req.body;

    // Actualizar el estado del evento
    evento.estado = 'rechazado';
    evento.fecha_rechazo = new Date();
    evento.razon_rechazo = razon_rechazo || 'Sin razón especificada';
    // evento.rechazado_por = req.user.idusuario; // Descomenta cuando tengas el sistema de usuarios

    const eventoActualizado = await evento.save();

    // Opcional: Enviar notificación al organizador
    // await sendNotificationToOrganizer(evento, 'rejected', razon_rechazo);

    res.status(200).json({
      message: 'Evento rechazado exitosamente',
      evento: eventoActualizado
    });

  } catch (error) {
    console.error('Error al rechazar evento:', error);
    res.status(500).json({ 
      message: 'Error al rechazar evento',
      error: error.message 
    });
  }
});
export const getEventoById1 = asyncHandler(async(req,res)=>{
  const evento = await Evento.findAll({
    attributes:{ exclude:['idevento']},
  })
})
