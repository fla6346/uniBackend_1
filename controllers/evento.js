import {getModels} from '../models/index.js ';
import asyncHandler from 'express-async-handler';
import { sequelize } from '../config/db.js';

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
        const faseMaestra = await Fase.findOne({ 
            where: { nrofase: 1 },
            transaction: t 
          });
          if (faseMaestra) {
            nuevoEvento.idfase = faseMaestra.idfase;
            await nuevoEvento.save({ transaction: t });
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
        { model: Recurso, as: 'recursos' },
        { model: Fase, as: 'fases'}
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
  const models = await getModels();
  const { Evento, Resultado, User, Comite, Objetivo, ObjetivoPDI, Segmento, Recurso, Actividad, Servicio } = models;

  try {
    const { id } = req.params;
    const eventIdNum = parseInt(id, 10);

    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    // 1. Obtener el evento principal
    const evento = await Evento.findByPk(eventIdNum, {
      include: [
        {
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role'],
          required: false
        },
        {
          model: models.Fase,
          as: 'fases',
          attributes: ['nrofase']
        }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // 2. Obtener ACTIVIDADES por tipo
    const actividades = await Actividad.findAll({
      where: { idevento: eventIdNum },
      attributes: ['nombre', 'responsable', 'fecha_inicio', 'fecha_fin', 'tipo']
    });

    // 3. Obtener SERVICIOS
    const servicios = await Servicio.findAll({
      where: { idevento: eventIdNum },
      attributes: ['nombreservicio', 'fechadeentrega', 'caracteristicas', 'observaciones']
    });

    // Resto de tus consultas existentes (tipos de evento, resultados, etc.)
    const [tiposDeEvento] = await sequelize.query(
      `SELECT et.idevento,t."nombretipo", et."texto_personalizado"
   FROM "evento_tipos" et
   JOIN "tipos_de_evento" t ON et."idtipoevento" = t."idtipoevento"
   WHERE et."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    const [resultados] = await sequelize.query(
      `SELECT "satisfaccion_esperada","otros_resultados","participacion_esperada", "satisfaccion_real" FROM "resultado"
    WHERE idevento=?`,
      { replacements: [eventIdNum] }
    );

    const [clasificacionData] = await sequelize.query(
      `SELECT 
      e."idevento",
      c."nombreClasificacion",
      s."nombresubcategoria",
      c."idclasificacion",
      s."idsubcategoria"
    FROM "evento" e
    LEFT JOIN "clasificacion_estrategica" c ON e."idclasificacion" = c."idclasificacion"
    LEFT JOIN "subcategoria" s ON c."idclasificacion" = s."idclasificacion"
    WHERE e."idevento" = ? LIMIT 1`,
      { replacements: [eventIdNum] }
    );
    const clasificacion = clasificacionData[0] || null;

    const [objetivosRaw] = await sequelize.query(
      `SELECT 
        eo."idevento",
         o."idobjetivo", 
         o."idtipoobjetivo", 
         o."texto_personalizado",
         t."nombre_objetivo",  
         s."nombre_segmento", 
         s."idsegmento",
         os."texto_personalizado" AS segmento_texto,
         a."texto_argumentacion" AS argumentacion
       FROM "evento_objetivos" eo
       JOIN "objetivos" o ON eo."idobjetivo" = o."idobjetivo"
       LEFT JOIN "tipos_objetivo" t ON o."idtipoobjetivo" = t."idtipoobjetivo" 
       LEFT JOIN "objetivo_segmento" os ON o."idobjetivo" = os."idobjetivo"
       LEFT JOIN "segmento" s ON os."idsegmento" = s."idsegmento"
       LEFT JOIN "argumentacion" a ON o."idobjetivo" = a."idobjetivo"
       WHERE eo."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    // Agrupar objetivos (tu lógica existente)
    const objetivosMap = new Map();
    objetivosRaw.forEach(row => {
      if (!objetivosMap.has(row.idobjetivo)) {
        objetivosMap.set(row.idobjetivo, {
          idobjetivo: row.idobjetivo,
          idtipoobjetivo: row.idtipoobjetivo,
          texto_personalizado: row.texto_personalizado,
          nombre_objetivo: row.nombre_objetivo, 
          pdi_descripciones: [],
          segmentos: [],
          argumentacion: row.argumentacion || null  
        });
      }
      const obj = objetivosMap.get(row.idobjetivo);
      if (row.idsegmento) obj.segmentos.push({
        idsegmento: row.idsegmento,
        nombre_segmento: row.nombre_segmento,
        texto_personalizado: row.segmento_texto
      });
    });

    const objetivos = Array.from(objetivosMap.values());
    
    const pdiRows = await sequelize.query(
      `SELECT "descripcion" FROM evento_pdi WHERE idevento = :idevento ORDER BY idevento_pdi ASC`,
      { 
        replacements: { idevento: eventIdNum },
        type: sequelize.QueryTypes.SELECT 
      }
    );
    const pdiIndependientes = pdiRows.map(row => row.descripcion);

    const [comiteRaw] = await sequelize.query(
      `SELECT u."idusuario", u."nombre", u."apellidopat", u."apellidomat", 
              u."email", u."role"
       FROM "comite" c
       JOIN "usuario" u ON c."idusuario" = u."idusuario"
       WHERE c."idevento" = ?`,
      { replacements: [eventIdNum] }
    );
    const comite = comiteRaw;

    const [recursosRaw] = await sequelize.query(
      `SELECT r."idrecurso", r."nombre_recurso", r."recurso_tipo", 
              r."descripcion", r."habilitado"
       FROM "evento_recurso" er
       JOIN "recurso" r ON er."idrecurso" = r."idrecurso"
       WHERE er."idevento" = ?`,
      { replacements: [eventIdNum] }
    );
    const recursos = recursosRaw;

    let presupuesto = null;
    if (evento.datos_presupuesto) {
      try {
        presupuesto = JSON.parse(evento.datos_presupuesto);
      } catch (e) {
        presupuesto = null;
      }
    }

    // ✅ Construir la respuesta completa con actividades y servicios
    const eventoCompleto = {
      ...evento.toJSON(),
      // ✅ Actividades separadas por tipo
      actividadesPrevias: actividades.filter(a => a.tipo === 'Previa'),
      actividadesDurante: actividades.filter(a => a.tipo === 'Durante'),
      actividadesPost: actividades.filter(a => a.tipo === 'Posterior'),
      // ✅ Servicios contratados
      serviciosContratados: servicios,
      Resultados: resultados || [],
      TiposDeEvento: tiposDeEvento,
      Objetivos: objetivos,
      Comite: comite,
      Recursos: recursos,
      Presupuesto: presupuesto,
      ObjetivosPDI: pdiIndependientes,
      Clasificacion: clasificacion,
      fase: evento.fases ? [{
        nrofase: evento.fases.nrofase
      }] : []
    };

    res.status(200).json(eventoCompleto);

  } catch (error) {
    console.error('Error detallado en getEventoById:', error);
    res.status(500).json({
      message: 'Error al obtener evento',
      error: error.message
    });
  }
});

export const updateEvento = asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  const { Evento, Actividad, Servicio, Fase } = await getModels();
 console.log('🔍 Modelos disponibles:', Object.keys(models));
  console.log('Actividad existe:', !!models.Actividad);
  console.log('Servicio existe:', !!models.Servicio);
  
  try {
    const evento = await Evento.findByPk(req.params.id, { transaction: t });
    if (!evento) {
      await t.rollback();
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // Actualizar campos básicos del evento
    const camposBasicos = ['nombreevento', 'lugarevento', 'fechaevento', 'horaevento', 'responsable'];
    camposBasicos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        evento[campo] = req.body[campo];
      }
    });

    // Actualizar layout si viene
    if (req.body.idlayout !== undefined) {
      evento.idlayout = req.body.idlayout;
    }

    // === ACTIVIDADES ===
    const tiposActividad = ['actividadesPrevias', 'actividadesDurante', 'actividadesPost'];
    for (const tipo of tiposActividad) {
      if (Array.isArray(req.body[tipo])) {
        // Eliminar existentes
        await Actividad.destroy({
          where: { idevento: evento.idevento, tipo: tipo },
          transaction: t
        });

        // Crear nuevas
        const nuevas = req.body[tipo].map(act => ({
          idevento: evento.idevento,
          nombre: act.nombreActividad,
          responsable: act.responsable,
          fecha_inicio: act.fechaInicio,
          fecha_fin: act.fechaFin,
          tipo: tipo
        }));

        if (nuevas.length > 0) {
          await Actividad.bulkCreate(nuevas, { transaction: t });
        }
      }
    }

    // === SERVICIOS ===
    if (Array.isArray(req.body.serviciosContratados)) {
      await Servicio.destroy({
        where: { idevento: evento.idevento },
        transaction: t
      });

      const nuevosServicios = req.body.serviciosContratados.map(s => ({
        idevento: evento.idevento,
        nombreservicio: s.nombreServicio,
        fechadeentrega: s.fechaInicio instanceof Date ? 
          s.fechaInicio.toISOString().split('T')[0] : s.fechaInicio,
        caracteristicas: s.caracteristica,
        observaciones: s.observaciones
      }));

      if (nuevosServicios.length > 0) {
        await Servicio.bulkCreate(nuevosServicios, { transaction: t });
      }
    }

    if (req.body.nuevaFase?.nrofase) {
      const faseObj = await Fase.findOne({
        where: { nrofase: req.body.nuevaFase.nrofase },
        attributes: ['idfase'],
        transaction: t
      });
      if (faseObj) {
        evento.idfase = faseObj.idfase;
      }
    }

    await evento.save({ transaction: t });
    await t.commit();

    // Responder con el evento actualizado
    const eventoActualizado = await Evento.findByPk(evento.idevento, {
      include: [
        { model: Actividad, as: 'actividades' },
        { model: Servicio, as: 'servicios' }
      ]
    });

    res.status(200).json(eventoActualizado);
  } catch (error) {
    await t.rollback();
    console.error('Error en updateEvento:', error);
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
  const models = await getModels();
  const { Evento } = models;
  try {
    console.log('[DB-RAW] Buscando eventos con consulta directa...');
    
    const eventos = await Evento.findAll(
      'SELECT idevento, nombreevento, lugarevento, fechaevento, horaevento FROM evento ORDER BY fechaevento DESC'
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

