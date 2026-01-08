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
    const { Evento, Objetivo, Resultado, Recurso, User, Comite, Segmento, ObjetivoPDI, ClasificacionEstrategica, Argumentacion } = models;

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
        texto_personalizado: objetivoData.texto_personalizado || null,
      }, { transaction: t });

      // Vincular al evento
      await sequelize.query(
        'INSERT INTO evento_objetivos (idevento, idobjetivo, texto_personalizado) VALUES (?, ?, ?)',
        {
          replacements: [nuevoEventoId, objetivo.idobjetivo, objetivoData.texto_personalizado || null],
          transaction: t
        }
      );

      if (data.argumentacion?.trim()) {
        const argumentacion = await models.Argumentacion.create({
          idobjetivo: objetivo.idobjetivo,
          texto_argumentacion: data.argumentacion.trim()
        }, { transaction: t });
 await objetivo.update({ idargumentacion: argumentacion.idargumentacion }, { transaction: t });
      }

      if (objetivoData.descripcion_pdi?.trim()) {
        const objetivoPDIRecord = await models.ObjetivoPDI.create({
          idobjetivo: objetivo.idobjetivo,
          descripcion: objetivoData.descripcion_pdi.trim()
        }, { transaction: t });

      }

      todosLosObjetivos.push(objetivo);
    }
  }

  // ✅ 3. Procesar objetivos PDI globales (independientes)
  if (data.objetivos_pdi) {
    let objetivosPDIArray = [];
    try {
      objetivosPDIArray = typeof data.objetivos_pdi === 'string'
        ? JSON.parse(data.objetivos_pdi)
        : data.objetivos_pdi;
    } catch (e) {
      console.warn('Error al parsear objetivos_pdi');
    }

    const descripcionesValidas = (objetivosPDIArray || [])
      .filter(desc => desc && desc.trim())
      .map(desc => desc.trim());

    if (descripcionesValidas.length > 0) {
      const objetivoPDI = await Objetivo.create({
        idtipoobjetivo: OTRO_TIPO_ID,
        texto_personalizado: `PDI - ${descripcionesValidas.length} objetivos`,
      }, { transaction: t });

      await sequelize.query(
        'INSERT INTO evento_objetivos (idevento, idobjetivo) VALUES (?, ?)',
        { replacements: [nuevoEventoId, objetivoPDI.idobjetivo], transaction: t }
      );

      await ObjetivoPDI.bulkCreate(
        descripcionesValidas.map(desc => ({
          idobjetivo: objetivoPDI.idobjetivo,
          descripcion: desc
        })),
        { transaction: t }
      );

      // Opcional: argumentación para este objetivo PDI agrupado
      if (data.argumentacion?.trim()) {
        const arg = await models.Argumentacion.create({
          idobjetivo: objetivoPDI.idobjetivo,
          texto_argumentacion: data.argumentacion.trim()
        }, { transaction: t });
        await objetivoPDI.update({ idargumentacion: arg.idargumentacion }, { transaction: t });
      }

      todosLosObjetivos.push(objetivoPDI);
    }
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


  // ✅ 5. Procesar clasificación (si es un array de nuevas clasificaciones)
  if (Array.isArray(data.clasificacion) && data.clasificacion.length > 0) {
    for (const clasificacionData of data.clasificacion) {
      await ClasificacionEstrategica.create({
        nombreClasificacion: clasificacionData.nombreClasificacion || null,
        idSubcategoria: clasificacionData.idSubcategoria || null,
      }, { transaction: t });
    }
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
  const { Evento, Comite, User, Resultado } = models;
  
  try {
    const { id } = req.params;
    const eventIdNum = parseInt(id, 10);
    
    if (isNaN(eventIdNum)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }
    
    const evento = await Evento.findByPk(eventIdNum, { 
      include: [
        { model: Resultado, as: 'Resultados' },
        { model: User, as: 'academicoCreador', 
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role'],
          required: false
        },
        { model: Comite, as: 'Comites' }
      ]
    });

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    let tiposDeEvento = [];
    try {
      const [tiposRaw] = await sequelize.query(
        `SELECT et.idevento, et.idtipoevento, et.texto_personalizado, 
                te.nombre_tipo
         FROM evento_tipos et
         LEFT JOIN tipo_evento te ON et.idtipoevento = te.idtipoevento
         WHERE et.idevento = ?`,
        { replacements: [eventIdNum] }
      );
      tiposDeEvento = tiposRaw;
    } catch (tiposError) {}

    let miembrosComite = [];
    try {
      miembrosComite = await Comite.findAll({
        where: { idevento: eventIdNum },
        include: [{
          model: User,
          as: 'miembroComite',
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role']
        }]
      });
    } catch (includeError) {
      const comiteRecords = await Comite.findAll({
        where: { idevento: eventIdNum },
        attributes: ['idevento', 'idusuario', 'created_at']
      });
      
      const usuariosIds = comiteRecords.map(c => c.idusuario);
      
      if (usuariosIds.length > 0) {
        const usuarios = await User.findAll({
          where: { idusuario: usuariosIds },
          attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role']
        });
        
        miembrosComite = comiteRecords.map(comite => ({
          ...comite.toJSON(),
          miembroComite: usuarios.find(u => u.idusuario === comite.idusuario)?.toJSON()
        }));
      }
    }

    const eventoConComite = evento.toJSON();
    eventoConComite.Comites = miembrosComite;
    eventoConComite.tiposDeEvento = tiposDeEvento;

    res.status(200).json(eventoConComite);

  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener evento',
      error: error.message 
    });
  }
});

export const updateEvento = asyncHandler(async (req, res) => {
  const models = await getModels();
  const Evento = models.Evento;
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
/*export const pendientes = asyncHandler(async(req,res) =>{
  try{
    const {area} = req.query;
    const result = await sequelize.query('SELECT * FROM public.evento ORDER BY idevento ASC ')
    res.json({evento: result.rows});

  }catch(err){
    console.error('Error al obtener los pendientes',err);
    res.status(500).json({message:'Error interno'});
  }
});*/
/*export const getEventosPendientesPorArea = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Evento, User, Comite } = models;
  const { area } = req.query;
  const userId = req.user.idusuario; // ← Usuario autenticado
  const userRole = req.user.role;

  try {
    // Si es admin, puede ver todos los eventos pendientes (opcional)
    if (userRole === 'admin') {
      const eventos = await Evento.findAll({
        where: { estado: 'pendiente' },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat']
        }],
        order: [['createdAt', 'DESC']]
      });

      const eventosFormateados = eventos.map(event => {
        const creador = event.academicoCreador;
        return {
          id: event.idevento,
          title: event.nombreevento || 'Sin título',
          description: event.descripcion || 'Sin descripción',
          date: event.fechaevento 
            ? new Date(event.fechaevento).toLocaleDateString('es-ES') 
            : 'N/A',
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
        };
      });

      return res.status(200).json(eventosFormateados);
    }

    // Para usuarios NO admin (académicos, DAF, etc.)
    // Buscar eventos donde:
    // - El usuario es el creador, O
    // - El usuario es miembro del comité
    const eventos = await Evento.findAll({
      where: { estado: 'pendiente' },
      include: [
        {
          model: User,
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat']
        },
        {
          model: Comite,
          as: 'Comites',
          where: { idusuario: userId },
          attributes: [], // No necesitamos datos del comité, solo saber que existe
          required: false // ← Clave: left join, no inner join
        }
      ],
      // Filtrar: creador = userId OR comité existe
      having: sequelize.where(
        sequelize.fn('COALESCE', 
          sequelize.col('academicoCreador.idusuario'), 
          0
        ), 
        userId
      ).or(
        sequelize.fn('COUNT', sequelize.col('Comites.idevento')), 
        { [Op.gt]: 0 }
      ),
      group: [
        'Evento.idevento',
        'academicoCreador.idusuario',
        'academicoCreador.nombre',
        'academicoCreador.apellidopat',
        'academicoCreador.apellidomat'
      ],
      order: [['createdAt', 'DESC']]
    });

    const eventosFormateados = eventos.map(event => {
      const creador = event.academicoCreador;
      return {
        id: event.idevento,
        title: event.nombreevento || 'Sin título',
        description: event.descripcion || 'Sin descripción',
        date: event.fechaevento 
          ? new Date(event.fechaevento).toLocaleDateString('es-ES') 
          : 'N/A',
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
      };
    });

    res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error('Error en getEventosPendientesPorArea:', error);
    res.status(500).json({ error: 'Error al cargar eventos pendientes' });
  }
});
*/
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

// controllers/evento.controller.js
export const getEventosAprobados = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Evento, User } = models;
  try {
    const userId = req.user.idusuario;
    const userRole = req.user.role;
    let eventos;

    if (userRole === 'admin' || userRole === 'daf') {
      eventos = await Evento.findAll({
        where: { estado: 'aprobado' },
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
      eventos = await Evento.findAll({
        where: {
          estado: 'aprobado',
          [Op.or]: [
            { idacademico: userId },
            { '$comite.idusuario$': userId } // ← minúscula
          ]
        },
        include: [
          {
            model: User,
            as: 'academicoCreador',
            attributes: ['nombre', 'apellidopat', 'apellidomat']
          },
          {
            model: User,
            as: 'comite', // ← incluir la relación
            attributes: [] // vacío para no devolver datos innecesarios
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const eventosFormateados = eventos.map(event => {
      const creador = event.academicoCreador;
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
        approvedBy: event.admin_aprobador || null, // ← string directo
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
      };
    });

    return res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error('Error en getEventosAprobados:', error);
    return res.status(500).json({ error: 'Error al cargar eventos aprobados' });
  }
});
export const getEventosNoAprobados = async (req, res) => {
  const models = await getModels();
  const { Evento, User } = models; // ← Solo necesitas User
  try {
    const userId = req.user.idusuario;        
    const userRole = req.user.role;  
    console.log('User Role:', userRole);  
    let eventos;
    
    if (userRole === 'admin') {
      console.log('Usuario es admin, obteniendo todos los eventos pendientes');
      eventos = await Evento.findAll({
        where: { estado: 'pendiente' },
        include: [{
          model: User,
          as: 'academicoCreador',
          attributes: ['nombre', 'apellidopat', 'apellidomat']
        },
      {
    model: User,
    as: 'comite',
    attributes: [],
    required: false // ← ¡ESTO ES CLAVE!
  }
],
        order: [['createdAt', 'DESC']]
      });
      console.log('Usuario es admin, obteniendo todos los eventos pendientes', eventos);
    } else if (userRole === 'academico') {
      console.log('Usuario es académico (ID:', userId, '), obteniendo eventos pendientes creados o asignados');

      eventos = await Evento.findAll({
        where: {
          estado: 'pendiente',
          [Op.or]: [
            { idacademico: userId },
            { '$comite.idusuario$': userId } // ✅ Alias en minúscula
          ]
        },
        include: [
          {
            model: User,
            as: 'academicoCreador',
            attributes: ['nombre', 'apellidopat', 'apellidomat']
          },
          {
            model: User,
            as: 'comite', // ✅ Relación muchos a muchos con User
            attributes: [],
            required:false
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const eventosFormateados = eventos.map(event => {
      const creador = event.academicoCreador;
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
        additionalComments: event.comentarios_admin, // ✅ Nombre correcto
        rejectionDate: event.fecha_rechazo,
        rejectionReason: event.razon_rechazo,
        classificationId: event.idclasificacion,
        resultId: event.idresultado
      };
    });

    return res.status(200).json(eventosFormateados);

  } catch (error) {
    console.error('Error en getEventosNoAprobados:', error);
    return res.status(500).json({ error: 'Error al cargar eventos pendientes' });
  }
};
/*export const fetchUserProfile = async (userId) => {
  const models = await getModels();
  const { User,Facultad } = models;

  const user = await User.findByPk(userId, {
    attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role','facultad_id'],
    include: [
      {
        model: models.Academico,
        as: 'academico',
        attributes: [], // no necesitas atributos del académico, solo su facultad
        include: [
          {
            model: models.Facultad,
            as: 'facultad',
            attributes: ['facultad_id', 'nombre_facultad'],
            required:false
          }
        ]
      }],
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  //const facultad = user.academico?.facultad || null;

  return {
    idusuario: user.idusuario,
    nombre: user.nombre,
    apellidopat: user.apellidopat,
    apellidomat: user.apellidomat,
    email: user.email,
    role: user.role,
    facultad: user.facultad || null
  };
};*/
// NUEVA FUNCIÓN: Estadísticas del dashboard para administradores
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