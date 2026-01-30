import { getModels,sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import asyncHandler from 'express-async-handler';


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

export const createEvento = async (req, res) => {
  const t = await sequelize.transaction();
try {
   const models = await getModels(); 
    const { Evento, Objetivo, Resultado, Recurso, User, Comite, Segmento, ObjetivoPDI, ClasificacionEstrategica, Argumentacion,Notificacion } = models;
  
    const admins = await Usuario.findAll({
    where: { rol: 'admin' }, // o como identifiques a los admins
    attributes: ['idusuario']
  });
  const data = req.body;
  const nuevoEvento = await Evento.create({
    nombreevento: data.nombreevento,
    lugarevento: data.lugarevento || 'Por definir',
    fechaevento: data.fechaevento,
    horaevento: data.horaevento,
    estado: 'pendiente',
    fechaAprobacion: null,
    idclasificacion: data.idclasificacion || null,
    idresultado: data.idresultado || null,
    aprobado: false,
    rechazado: false,
    idacademico: req.user.idusuario,
  }, { transaction: t });

  const nuevoEventoId = nuevoEvento.idevento;
  let todosLosObjetivos = []; // Para segmentos

  if (Array.isArray(data.tipos_de_evento) && data.tipos_de_evento.length > 0) {
    for (const tipo of data.tipos_de_evento) {
      if (!tipo.id) {
        console.warn('Tipo de evento sin ID:', tipo);
        continue;
      }
      await sequelize.query(
        'INSERT INTO evento_tipos (idevento, idtipoevento, texto_personalizado) VALUES (?, ?, ?)',
        {
          replacements: [nuevoEventoId, tipo.id, tipo.texto_personalizado || null],
          transaction: t
        }
      );
    }
  }

  if (Array.isArray(data.objetivos) && data.objetivos.length > 0) {
    for (const objetivoData of data.objetivos) {
      if (!objetivoData.id) continue;

      const objetivo = await Objetivo.create({
        idtipoobjetivo: objetivoData.id,
        idargumentacion: null,
        idobjetivopdi: null,
      }, { transaction: t });

       const idObjCreado = objetivo.idobjetivo || objetivo.id;
    if (!idObjCreado) {
      throw new Error(`No se pudo obtener el ID del objetivo creado con idtipoobjetivo=${objetivoData.id}`);
    }
     const textoPersonalizado = objetivoData.texto_personalizado?.trim() || null;

      await sequelize.query(
        'INSERT INTO evento_objetivos (idevento, idobjetivo, texto_personalizado) VALUES (?, ?, ?)',
        {
          replacements: [nuevoEventoId, idObjCreado, textoPersonalizado],
          transaction: t
        }
      );

      if (data.argumentacion?.trim() && todosLosObjetivos.length > 0) {
        const argumentacion = await models.Argumentacion.create({
          idobjetivo: todosLosObjetivos[0].idobjetivo, // Asignar al primer objetivo
          texto_argumentacion: data.argumentacion.trim()
        }, { transaction: t });

        await todosLosObjetivos[0].update({
          idargumentacion: argumentacion.idargumentacion
        }, { transaction: t });
      }

     

      todosLosObjetivos.push(objetivo);
    }
  }
if (data.argumentacion?.trim() && todosLosObjetivos.length > 0) {
  const argumentacion = await models.Argumentacion.create({
    idobjetivo: todosLosObjetivos[0].idobjetivo, // Asociar al primer objetivo
    texto_argumentacion: data.argumentacion.trim()
  }, { transaction: t });
  
  await todosLosObjetivos[0].update({ 
    idargumentacion: argumentacion.idargumentacion 
  }, { transaction: t });
}


  // ✅ 4. Procesar segmentos (vinculados a todos los objetivos creados)
  if (Array.isArray(data.segmentos_objetivo) && data.segmentos_objetivo.length > 0 && todosLosObjetivos.length > 0) {
    const segmentosValidos = await Segmento.findAll({ attributes: ['idsegmento'], raw: true });
    const idsSegmentosValidos = new Set(segmentosValidos.map(seg => seg.idsegmento));

    const segmentosFiltrados = data.segmentos_objetivo
      .map(seg => ({
        id: parseInt(seg.id),
        texto: seg.texto_personalizado || null
      }))
      .filter(seg => !isNaN(seg.id) && idsSegmentosValidos.has(seg.id));

    for (const objetivo of todosLosObjetivos) {
      for (const seg of segmentosFiltrados) {
        await sequelize.query(
          'INSERT INTO objetivo_segmento (idobjetivo, idsegmento, texto_personalizado) VALUES (?, ?, ?)',
          {
            replacements: [objetivo.idobjetivo, seg.id, seg.texto],
            transaction: t
          }
        );
      }
    }
  }

// ✅ Guardar los 3 objetivos PDI independientes del evento
if (!Array.isArray(data.pdi_objetivos) || data.pdi_objetivos.length !== 3) {
  throw new Error('Se requieren exactamente 3 objetivos del PDI');
}

for (let i = 0; i < 3; i++) {
  const descripcion = data.pdi_objetivos[i]?.trim();
  if (!descripcion) {
    throw new Error(`El objetivo PDI ${i + 1} no puede estar vacío`);
  }

  await sequelize.query(
    'INSERT INTO evento_pdi (idevento, descripcion) VALUES (?, ?)',
    {
      replacements: [nuevoEventoId, descripcion],
      transaction: t
    }
  );
}
  

  // ✅ 6. Guardar resultados esperados
  let parsedResultados = {};
  if (data.resultados_esperados) {
    try {
      parsedResultados = typeof data.resultados_esperados === 'string'
        ? JSON.parse(data.resultados_esperados)
        : data.resultados_esperados;
    } catch (e) {
      console.warn('Error al parsear resultados_esperados');
    }
  }

  await Resultado.create({
    idevento: nuevoEventoId,
    satisfaccion_real:parsedResultados.satisfaccion_real || null,
    participacion_esperada: parsedResultados.participacion || '',
    satisfaccion_esperada: parsedResultados.satisfaccion || '',
    otros_resultados: parsedResultados.otro || null,
  }, { transaction: t });

  // ✅ 7. Recursos nuevos
  if (Array.isArray(data.recursos_nuevos) && data.recursos_nuevos.length > 0) {
    const recursosACrear = data.recursos_nuevos.map(recurso => ({
      idevento: nuevoEventoId,
      nombre_recurso: recurso.nombre_recurso,
      recurso_tipo: recurso.recurso_tipo || 'Material/Técnico/Tercero',
      habilitado: 1
    }));
    await Recurso.bulkCreate(recursosACrear, { transaction: t });
  }

  // ✅ 8. Recursos existentes (vinculación)
  if (Array.isArray(data.recursos) && data.recursos.length > 0) {
    const recursosExistentesACrear = data.recursos.map(recurso => ({
      idevento: nuevoEventoId,
      idrecurso: recurso.idrecurso,
      nombre_recurso: recurso.nombre_recurso,
    }));
    await Recurso.bulkCreate(recursosExistentesACrear, { transaction: t });
  }

  if (Array.isArray(data.comite) && data.comite.length > 0) {
  const usuariosValidos = await User.findAll({
    where: {
      idusuario: data.comite,
      habilitado: '1'
    },
    attributes: ['idusuario']
  });

  const idsValidos = usuariosValidos.map(u => u.idusuario);

  if (idsValidos.length > 0) {
   for (const idusuario of idsValidos) {
      await sequelize.query(
        'INSERT INTO comite (idevento, idusuario, created_at) VALUES (?, ?, ?)',
        {
          replacements: [nuevoEventoId, idusuario, new Date()],
          transaction: t
        }
      );

      await models.Notificacion.create({
        idusuario: idusuario,
        tipo: 'evento_asignado',
        titulo: 'Has sido asignado a un evento',
        mensaje: `El evento "${nuevoEvento.nombreevento}" te ha asignado como miembro del comité.`,
        estado: 'pendiente',
        created_at: new Date(),
     
      }, { transaction: t });
    }
  }
}
  await t.commit();

  const eventoCompleto = await Evento.findByPk(nuevoEventoId, {
    include: [
      { model: Resultado, as: 'Resultados' },
      { model: Recurso, as: 'Recursos' },
      {
        model: User,
        as: 'academicoCreador',
        attributes: ['nombre', 'apellidopat', 'apellidomat', 'email', 'role']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Evento creado exitosamente',
    data: eventoCompleto
  });
}catch (error) {
  await t.rollback();
  console.error('Error al crear evento:', error);
  res.status(500).json({
    success: false,
    message: 'Error al crear el evento',
    error: error.message
  });
}
};
export const getAllEventos = async (req, res) => {
  const models = await getModels();
  const Evento = models.Evento;
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
};
export const fetchAllEvents = async () => {
  const models = await getModels();
  const Evento = models.Evento;
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
  const { Evento,Fase,Resultado, User, Comite, Objetivo, ObjetivoPDI, Segmento, Recurso, Actividad, Servicio } = models;

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
          model: Fase,
          as: 'fase',
          attributes: ['nrofase']
        }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

      const actividades = await Actividad.findAll({
        where: { idevento: eventIdNum },
        attributes: ['nombre', 'responsable', 'fecha_inicio', 'fecha_fin', 'tipo']
      });

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
      fase: evento.fase ? [{
        nrofase: evento.fase.nrofase
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
  try {
    const { id } = req.params;
    const idevento = parseInt(id, 10);

    if (isNaN(idevento) || idevento <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    const [eventoExists] = await sequelize.query(
      'SELECT 1 FROM evento WHERE idevento = ?',
      { replacements: [idevento], transaction: t }
    );
    
    if (eventoExists.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

  const TIPO_MAPEO = {
  actividadesPrevias: 'Previa',
  actividadesDurante: 'Durante',
  actividadesPost: 'Posterior'
};
    const tiposActividad = ['actividadesPrevias', 'actividadesDurante', 'actividadesPost'];
   
for (const tipoFrontend of tiposActividad) {
  const tipoDB = TIPO_MAPEO[tipoFrontend]; // ✅ Ej: 'actividadesPrevias' → 'previa'

  if (!tipoDB) {
    console.warn(`Tipo no mapeado: ${tipoFrontend}`);
    continue;
  }

  if (Array.isArray(req.body[tipoFrontend])) {
    await sequelize.query(
      'DELETE FROM actividades WHERE idevento = ? AND tipo = ?',
      { replacements: [idevento, tipoDB], transaction: t }
    );

    // Insertar nuevas
    for (const act of req.body[tipoFrontend]) {
      await sequelize.query(
        `INSERT INTO actividades (idevento, nombre, responsable, fecha_inicio, fecha_fin, lugar, tipo) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            idevento,
            act.nombreActividad?.trim() || '',
            act.responsable?.trim() || '',
            act.fechaInicio || null,
            act.fechaFin || null,
            act.lugar?.trim() || '', // si existe
            tipoDB // ✅ Valor exacto: 'Previa', 'Durante', 'Posterior'
          ],
          transaction: t
        }
      );
    }
  }
}
    // 2. Servicios
    if (Array.isArray(req.body.serviciosContratados)) {
      await sequelize.query(
        'DELETE FROM servicio WHERE idevento = ?',
        { replacements: [idevento], transaction: t }
      );
      
      for (const s of req.body.serviciosContratados) {
        const fechaEntrega = s.fechaInicio instanceof Date 
          ? s.fechaInicio.toISOString().split('T')[0]
          : (typeof s.fechaInicio === 'string' ? s.fechaInicio.split('T')[0] : null);
          
        await sequelize.query(
          `INSERT INTO servicio (idevento, nombreservicio, fechadeentrega, caracteristicas, observaciones) 
           VALUES (?, ?, ?, ?, ?)`,
          {
            replacements: [
              idevento,
              s.nombreServicio?.trim() || '',
              fechaEntrega,
              s.caracteristica?.trim() || '',
              s.observaciones?.trim() || ''
            ],
            transaction: t
          }
        );
      }
    }

  if (req.body.nuevaFase?.nrofase) {
  const nrofase = parseInt(req.body.nuevaFase.nrofase, 10);
  if (!isNaN(nrofase)) {
    const [faseExistente] = await sequelize.query(
      'SELECT idfase FROM fase WHERE idevento = ? AND nrofase = ?',
      { replacements: [idevento, nrofase], transaction: t }
    );

    if (faseExistente.length > 0) {
      // ✅ Actualizar fase existente (si necesitas guardar más datos)
      // await sequelize.query('UPDATE fase SET ...', { ... });
    } else {
      // ✅ Crear NUEVA fase para este evento
      await sequelize.query(
        'INSERT INTO fase (idevento, nrofase) VALUES (?, ?)',
        { replacements: [idevento, nrofase], transaction: t }
      );
    }
  }
}

    // ✅ NUEVO: Actualizar idlayout si viene en el body
    if ('idlayout' in req.body) {
      const idlayout = req.body.idlayout === null ? null : parseInt(req.body.idlayout, 10);
      if (isNaN(idlayout) && req.body.idlayout !== null) {
        console.warn('idlayout no es un número válido ni null:', req.body.idlayout);
      }
      await sequelize.query(
        'UPDATE evento SET idlayout = ? WHERE idevento = ?',
        { replacements: [idlayout, idevento], transaction: t }
      );
    }

    await t.commit();
    res.status(200).json({ message: 'Evento actualizado correctamente' });

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
  const models = await getModels();
  const Evento = models.Evento;
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    await evento.destroy();
    res.status(200).json({ message: 'Evento eliminado exitosamente' });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error al eliminar evento',
      error: error.message 
    });
  }
});




export const aprobarEvento = async (req, res) => {
  const { id } = req.params;
  try {
    const models = await getModels();
    const { Evento } = models;


    const evento = await Evento.findByPk(id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await evento.update({ 
      estado: 'aprobado', fecha_aprobacion: new Date()});

    // Opcional: crear notificación para el creador
    // (puedes integrar notificationController aquí si lo deseas)

    return res.status(200).json({ message: 'Evento aprobado correctamente' });
  } catch (error) {
    console.error('Error al aprobar evento:', error);
    return res.status(500).json({ error: 'Error al aprobar el evento' });
  }
};

export const rechazarEvento = async (req, res) => {
  const { id } = req.params;
  try {
   const models = await getModels();
    const { Evento } = models;


    const evento = await Evento.findByPk(id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    await evento.update({ estado: 'rechazado' });

    return res.status(200).json({ message: 'Evento rechazado correctamente' });
  } catch (error) {
    console.error('Error al rechazar evento:', error);
    return res.status(500).json({ error: 'Error al rechazar el evento' });
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
  const models = await getModels();
  const Evento = models.Evento;
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


export const getEventosAprobados = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Evento, User, Fase } = models;
  try {
    const userId = req.user.idusuario;
    const userRole = req.user.role;
    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: { estado: 'aprobado' },
        attributes:{ include: ['idfase']},
        include: [
          {
            model: User,
            as: 'academicoCreador',
            attributes: ['nombre', 'apellidopat', 'apellidomat']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else if (userRole === 'academico') {
      // Paso 1: Eventos donde soy miembro del comité
      const eventosEnComite = await sequelize.query(
        'SELECT idevento FROM evento_comite WHERE idusuario = ?',
        { replacements: [userId], type: sequelize.QueryTypes.SELECT }
      );
      const idsEventosComite = eventosEnComite.map(r => r.idevento);

      // Paso 2: Facultad del usuario actual
      const academicoActual = await models.Academico.findOne({
        where: { idusuario: userId },
        attributes: ['facultad_id']
      });

      let idsCreadores = [];

      if (academicoActual?.facultad_id) {
        // Paso 3: Todos los creadores de la misma facultad
        const creadoresMismaFacultad = await models.Academico.findAll({
          where: { facultad_id: academicoActual.facultad_id },
          attributes: ['idusuario']
        });
        idsCreadores = creadoresMismaFacultad.map(a => a.idusuario);
      }

      // Paso 4: Combinar condiciones
      const condiciones = [];
      if (idsCreadores.length > 0) {
        condiciones.push({ idacademico: { [Op.in]: idsCreadores } });
      }
      if (idsEventosComite.length > 0) {
        condiciones.push({ idevento: { [Op.in]: idsEventosComite } });
      }

      if (condiciones.length === 0) {
        return res.status(200).json([]);
      }

      eventos = await Evento.findAll({
        where: {
          estado: 'aprobado',
          [Op.or]: condiciones
        },
        include: [
          {
            model: User,
            as: 'academicoCreador',
            attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat']
          }
        
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
      const eventoIds = eventos.map(e => e.idevento);
    const fases = await models.Fase.findAll({
      where: { idfase: { [Op.in]: eventos.map(e => e.idfase).filter(id => id) } },
      attributes: ['idfase', 'nrofase']
    });

    const faseMap = new Map(fases.map(f => [f.idfase, f.nrofase]));

    const eventosFormateados = eventos.map(event => {
      const creador = event.academicoCreador;
      const eventoPlain = event.get({ plain: true });
      return {
        id: event.idevento,
        title: event.nombreevento || 'Sin título',
        description: event.descripcion || 'Sin descripción',
        date: event.fechaevento ? new Date(event.fechaevento).toLocaleDateString('es-ES') : 'N/A',
        time: event.horaevento || 'N/A',
        location: event.lugarevento || 'Sin ubicación',
        organizer: creador 
          ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() || 'Sin nombre'
          : 'Sin organizador',
        category: 'General',
        priority: 'normal',
        submittedBy: creador 
          ? `${creador.nombre?.charAt(0) || ''}. ${creador.apellidopat || ''}`.trim()
          : 'Sistema',
        submittedDate: event.createdAt || event.fechaevento,
        status: event.estado,
        approvedAt: event.fecha_aprobacion 
          ? new Date(event.fecha_aprobacion).toLocaleString('es-ES') 
          : null,
        approvedBy: event.admin_aprobador || null,
        rejectionDate: event.fecha_rechazo 
          ? new Date(event.fecha_rechazo).toLocaleDateString('es-ES') 
          : null,
        rejectionReason: event.razon_rechazo || null,
        additionalComments: event.comentarios_admin || null,
        classificationId: event.idclasificacion || null,
        resultId: event.idresultado || null,
        updatedAt: event.updatedAt 
          ? new Date(event.updatedAt).toLocaleString('es-ES') 
          : null,
         //fase: eventoPlain.fase ? [eventoPlain.fase] : [],
         idfase: event.idfase || null,
        
      };
    });

    return res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error('Error en getEventosAprobados:', error);
    return res.status(500).json({ error: 'Error al cargar eventos aprobados' });
  }
});
export const getEventosAprobadosPorFacultad = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Evento, User, Academico, Facultad } = models;
  
  try {
    const userId = req.user.idusuario;
    const userRole = req.user.role;
    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: { estado: 'aprobado' },
        distinct: true,
        attributes: { include: ['idfase'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['createdAt', 'DESC']]
      });
    } else if (userRole === 'academico') {
      eventos = await Evento.findAll({
        where: { 
          estado: 'aprobado',
          idacademico: userId  // 👈 CLAVE: Solo eventos creados por este usuario
        },
        distinct: true,
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // ✅ Deduplicar eventos por ID
    const eventosUnicos = Array.from(
      new Map(eventos.map(e => [e.idevento, e])).values()
    );

    // ✅ Formatear respuesta
    const eventosFormateados = eventosUnicos.map(event => {
      const creador = event.academicoCreador;
      const facultadNombre = creador?.academico?.facultad?.nombre_facultad || 'Sin facultad';

      return {
        id: event.idevento,
        title: event.nombreevento || 'Sin título',
        description: event.descripcion || 'Sin descripción',
        date: event.fechaevento ? new Date(event.fechaevento).toLocaleDateString('es-ES') : 'N/A',
        time: event.horaevento || 'N/A',
        location: event.lugarevento || 'Sin ubicación',
        organizer: creador 
          ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() || 'Sin nombre'
          : 'Sin organizador',
        category: 'General',
        submittedBy: creador 
          ? `${creador.nombre?.charAt(0) || ''}. ${creador.apellidopat || ''}`.trim()
          : 'Sistema',
        submittedDate: event.createdAt || event.fechaevento,
        approvedAt: event.fecha_aprobacion 
          ? new Date(event.fecha_aprobacion).toLocaleString('es-ES') 
          : null,
        approvedBy: event.admin_aprobador || null,
        additionalComments: event.comentarios_admin || null,
        idfase: event.idfase || 1,
        faculty: facultadNombre
      };
    });

    return res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error('Error en getEventosAprobadosPorFacultad:', error);
    return res.status(500).json({ error: 'Error al cargar eventos aprobados con facultad' });
  }
});

export const getEventosNoAprobados = async (req, res) => {
  const models = await getModels();
  const { Evento, User, Academico, Facultad } = models;

  try {
    const userId = req.user.idusuario;
    const userRole = req.user.role;

    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      // ✅ Admin/DAF ven TODOS los eventos pendientes con información de facultad
      eventos = await Evento.findAll({
        where: { estado: 'pendiente' },
        distinct: true,
        attributes: { include: ['idfase'] },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['createdAt', 'DESC']]
      });

    } else if (userRole === 'academico') {
      // ✅ Académicos ven SOLO sus propios eventos pendientes
      eventos = await Evento.findAll({
        where: { 
          estado: 'pendiente',
          idacademico: userId
        },
        distinct: true,
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
          include: [{
            model: Academico,
            as: 'academico',
            attributes: ['facultad_id'],
            include: [{
              model: Facultad,
              as: 'facultad',
              attributes: ['nombre_facultad']
            }]
          }]
        }],
        order: [['createdAt', 'DESC']]
      });
    } else {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // ✅ Deduplicar eventos por ID
    const eventosUnicos = Array.from(
      new Map(eventos.map(e => [e.idevento, e])).values()
    );

    // ✅ Formatear respuesta
    const eventosFormateados = eventosUnicos.map(event => {
      const creador = event.academicoCreador;
      const facultadNombre = creador?.academico?.facultad?.nombre_facultad || 'Sin facultad';

      return {
        id: event.idevento,
        title: event.nombreevento || 'Sin título',
        description: event.descripcion || 'Sin descripción',
        date: event.fechaevento ? new Date(event.fechaevento).toLocaleDateString('es-ES') : 'N/A',
        time: event.horaevento || 'N/A',
        location: event.lugarevento || 'Sin ubicación',
        organizer: creador 
          ? `${creador.nombre || ''} ${creador.apellidopat || ''}`.trim() || 'Sin nombre'
          : 'Sin organizador',
        category: 'General',
        priority: 'normal',
        submittedBy: creador 
          ? `${creador.nombre?.charAt(0) || ''}. ${creador.apellidopat || ''}`.trim()
          : 'Sistema',
        submittedDate: event.createdAt || event.fechaevento,
        approvedAt: event.fecha_aprobacion,
        approvedBy: event.admin_aprobador,
        additionalComments: event.comentarios_admin,
        rejectionDate: event.fecha_rechazo,
        rejectionReason: event.razon_rechazo,
        classificationId: event.idclasificacion,
        resultId: event.idresultado,
        area: facultadNombre // ✅ Campo 'area' para mostrar en el frontend
      };
    });

    return res.status(200).json(eventosFormateados);

  } catch (error) {
    console.error('Error en getEventosNoAprobados:', error);
    return res.status(500).json({ error: 'Error al cargar eventos pendientes' });
  }
};
  

export const getDashboardStats = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
  }
  const models = await getModels();
  const { Evento, User } = models;

  try {
    // Usuarios activos
    const activeUsers = await User.count({
      where: { habilitado: '1' }
    });

    // Eventos totales
    const totalEvents = await Evento.count();

    // Contenidos pendientes
    const pendingContent = await Evento.count({
      where: { estado: 'pendiente' }
    });

    // Estabilidad del sistema (simulación)
    const systemStability = 98;

    res.status(200).json({
      activeUsers,
      totalEvents,
      pendingContent,
      systemStability
    });
  } catch (error) {
    console.error('Error en getDashboardStats:', error);
    res.status(500).json({ message: 'Error al cargar estadísticas' });
  }
});
export const getHistoricalData = asyncHandler(async (req, res) => {
  // Verificar que sea admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
  }

  const models = await getModels();
  const { Evento } = models;

  try {
    const now = new Date();
    const historical = [];

    // Últimos 6 meses (de más antiguo a más reciente)
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('es-ES', { month: 'short' });

      // Contar eventos CREADOS en ese mes (usa createdAt, no fechaevento)
      const count = await Evento.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
            [Op.lt]: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
          }
        }
      });

      historical.push({
        name: monthName,
        eventos: count
      });
    }

    res.status(200).json({ historical });
  } catch (error) {
    console.error('Error en getHistoricalData:', error);
    res.status(500).json({ message: 'Error al cargar datos históricos' });
  }
});
// Nueva función para obtener evento con todos los detalles
export const getEventoCompletoById = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Evento, User, Recurso, ClasificacionEstrategica, Subcategoria } = models;

  try {
    const { id } = req.params;
    const eventIdNum = parseInt(id, 10);

    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    // 1. Obtener el evento principal con su creador
    const evento = await Evento.findByPk(eventIdNum, {
      include: [{
        model: User,
        as: 'academicoCreador',
        attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role']
      }]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    // 2. Obtener los recursos del evento
    const [recursos] = await sequelize.query(
      `SELECT r."idrecurso", r."nombre_recurso", r."recurso_tipo", 
              r."descripcion", r."habilitado", r."cantidad"
       FROM "evento_recurso" er
       JOIN "recurso" r ON er."idrecurso" = r."idrecurso"
       WHERE er."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    // 3. Obtener la clasificación estratégica con su subcategoría
    const [clasificacionData] = await sequelize.query(
      `SELECT 
         c."idclasificacion", 
         c."nombreClasificacion",
         s."idsubcategoria",
         s."nombressubcategoria"
       FROM "evento" e
       LEFT JOIN "clasificacion_estrategica" c ON e."idclasificacion" = c."idclasificacion"
       LEFT JOIN "subcategoria" s ON e."idsubcategoria" = s."idsubcategoria"
       WHERE e."idevento" = ?`,
      { replacements: [eventIdNum] }
    );

    const clasificacion = clasificacionData[0] || null;

    // 4. Construir la respuesta completa
    const eventoCompleto = {
      ...evento.toJSON(),
      Recursos: recursos,
      Clasificacion: clasificacion
    };

    res.status(200).json(eventoCompleto);

  } catch (error) {
    console.error('Error al obtener evento completo:', error);
    res.status(500).json({
      message: 'Error al obtener evento',
      error: error.message
    });
  }
});