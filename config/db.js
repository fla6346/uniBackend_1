import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false, // Cambiar a console.log para depurar SQL
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

// Importa las funciones que definen los modelos
import defineEvento from '../models/Event.js';
import defineObjetivo from '../models/Objetivo.js';
import defineUser from '../models/User.js';
import defineRole from '../models/Roles.js';
import defineCategory from '../models/Category.js';
import defineLocation from '../models/Location.js';
import defineResultado from '../models/Resultado.js';
import definePDI from '../models/ObjetivoPDI.js';
import defineTipoObjetivo from '../models/TipoObjetivo.js';
import defineSegmento from '../models/Segmento.js'; 
import defineObjetivoSegmento from '../models/ObjetivoSegmento.js'; // Estandarizado
import defineRecurso from '../models/Recurso.js';
import defineEventoRecurso from '../models/EventoRecurso.js';
import defineEventoTipo from '../models/EventoTipo.js';
import defineArgumentacion from '../models/Argumentacion.js';
import defineEventoObjetivo from '../models/EventoObjetivo.js';
import defineNotificacion from '../models/Notificacion.js';

import defineAdministrador from '../models/Administrador.js';
import defineAdmisiones from '../models/Admisiones.js';
import defineAlumno from '../models/Alumno.js'; 
import defineComunicacion from '../models/Comunicacion.js';
import defineDaf from '../models/Daf.js';
import defineAcademico  from '../models/Academico.js';
import defineEstudiantes from '../models/Estudiante.js';
import defineExterno from '../models/Estudiante.js';
import defineTi from '../models/Ti.js';
import defineServicios from '../models/ServiciosEstudiantiles.js';
import defineFacultad from '../models/Facultad.js';
import defineComite from '../models/EventoComite.js'

const Evento = defineEvento(sequelize);
const Objetivo = defineObjetivo(sequelize);
const User = defineUser(sequelize);
const Role = defineRole(sequelize);
const Category = defineCategory(sequelize);
const Location = defineLocation(sequelize); 
const Resultado = defineResultado(sequelize);
const ObjetivoPDI = definePDI(sequelize);
const TipoObjetivo = defineTipoObjetivo(sequelize);
const Segmento = defineSegmento(sequelize);
const ObjetivoSegmento = defineObjetivoSegmento(sequelize); 
const Recurso = defineRecurso(sequelize);
const EventoRecurso = defineEventoRecurso(sequelize);
const EventoTipo = defineEventoTipo(sequelize);
const EventoObjetivo = defineEventoObjetivo(sequelize);
const Argumentacion = defineArgumentacion(sequelize);

const Administrador= defineAdministrador(sequelize);
const Admisiones = defineAdmisiones(sequelize);
const Alumno = defineAlumno(sequelize);
const Comunicacion = defineComunicacion(sequelize);
const Daf = defineDaf(sequelize);
const Academico = defineAcademico(sequelize);
const Estudiantes = defineEstudiantes(sequelize);
const Externo= defineExterno(sequelize);
const Ti = defineTi(sequelize);
const ServiciosEstudiantiles = defineServicios(sequelize);
const Facultad= defineFacultad(sequelize);
const Notificacion = defineNotificacion(sequelize);
const Comite = defineComite(sequelize);
// Crea la instancia de Sequelize


Evento.belongsToMany(Objetivo, { 
  through:EventoObjetivo,
  foreignKey: 'idevento',
  otherKey:'idobjetivo',
  as: 'Objetivos' });

Objetivo.belongsToMany(Evento, { 
  through: EventoObjetivo,
  foreignKey: 'idobjetivo',
  otherKey:'idevento' ,
  as: 'Eventos'});

Objetivo.hasMany(ObjetivoPDI, { foreignKey: 'idobjetivo', as: 'ObjetivoPDIs' });
ObjetivoPDI.belongsTo(Objetivo, { foreignKey: 'idobjetivo' });
Objetivo.belongsTo(TipoObjetivo, {foreignKey:'idtipoobjetivo',as:'TipoObjetivo'})
TipoObjetivo.hasMany(Objetivo,{foreignKey:'idtipoobjetivo', as:'Objetivos'})
// Relaciones Muchos-a-Muchos
Evento.belongsToMany(EventoTipo, { // Ahora 'TipoEvento' SÍ está definido
  through: 'evento_tipos',
  foreignKey: 'idevento',
  otherKey: 'idtipoevento',
  as: 'tiposDeEvento'
});
EventoTipo.belongsToMany(Evento, { // Y aquí también
  through: 'evento_tipos',
  foreignKey: 'idtipoevento',
  otherKey: 'idevento',
  as: 'Eventos'
});
Evento.hasOne(Resultado, { foreignKey: 'idevento', as: 'Resultados' });
Objetivo.belongsToMany(Segmento, {
  through: ObjetivoSegmento,
  foreignKey: 'idobjetivo',
  otherKey: 'idsegmento',
  as: 'Segmentos'
});
Segmento.belongsToMany(Objetivo, {
  through: ObjetivoSegmento,
  foreignKey: 'idsegmento',
  otherKey: 'idobjetivo',
  as: 'Objetivos'
});

Evento.belongsToMany(Recurso, {
  through: EventoRecurso,
  foreignKey: 'idevento',
  otherKey:'idrecurso',
  as: 'Recursos'
});
Recurso.belongsToMany(Evento, {
  through: EventoRecurso,
  foreignKey: 'idrecurso',
  otherKey:'idevento',
  as: 'Eventos'
});
Objetivo.hasMany(Argumentacion, { foreignKey: 'idobjetivo', as: 'argumentaciones' });
Argumentacion.belongsTo(Objetivo, { foreignKey: 'idobjetivo' });
Resultado.belongsTo(Evento, { foreignKey: 'idevento',as:'evento' });

User.hasOne(Administrador,{foreignKey:'idusuario', as: 'administrador'});
Administrador.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Admisiones,{foreignKey:'idusuario', as: 'admisiones'});
Admisiones.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Alumno,{foreignKey:'idusuario', as: 'alumno'});
Alumno.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Comunicacion,{foreignKey:'idusuario', as: 'comunicacion'});
Comunicacion.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Daf,{foreignKey:'idusuario', as: 'daf '});
Daf.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Academico,{foreignKey:'idusuario', as: 'academico'});
Academico.belongsTo(User,{foreignKey:'idusuario', as: 'user'});

User.hasOne(Estudiantes,{foreignKey:'idusuario', as: 'estudiantes '});
Estudiantes.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Externo,{foreignKey:'idusuario', as: 'externo '});
Externo.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(Ti,{foreignKey:'idusuario', as: 'ti '});
Ti.belongsTo(User,{foreignKey:'idusuario'});

User.hasOne(ServiciosEstudiantiles,{foreignKey:'idusuario', as: 'serviciosEstudiantiles '});
ServiciosEstudiantiles.belongsTo(User,{foreignKey:'idusuario'});

Academico.belongsTo(Facultad, { foreignKey: 'idfacultad', as:'facultad' });
Facultad.hasMany(Academico, { foreignKey: 'idfacultad', as: 'academicos' });

Notificacion.hasMany(Administrador,{foreignKey:'idnotificacion',sourceKey:'idnotificacion'})
Administrador.belongsTo(Notificacion,{foreignKey:'idnotificaion', targetKey:'idnotificacion'})

Administrador.hasMany(Evento,{foreignKey:'idadministrador', as:'eventos'});
Evento.belongsTo(Administrador,{foreignKey:'admin_aprobador', as:'usuario'});

Evento.belongsTo(User,{
  foreignKey: 'idadministrador',
  as:'creador'
})
Notificacion.belongsTo(Administrador,{foreignKey:'idadministrador'});
Administrador.hasMany(Notificacion,{foreignKey:'idadministrador'});
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Conectado Exitosamente.');
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL:', error);
    process.exit(1);
  }
};

export {
  sequelize,
  connectDB,
  Evento,
  Objetivo,
  User,
  Category,
  Location,
  Resultado,
  ObjetivoPDI,
  TipoObjetivo,
  Segmento,
  ObjetivoSegmento,
  Recurso,
  EventoRecurso,
  EventoTipo  ,
  Argumentacion,
  EventoObjetivo,
  Role,
  Administrador,
  Admisiones,
  Alumno,
  Comunicacion,
  Daf,
  Facultad,
  Estudiantes,
  Externo,
  Ti,
  ServiciosEstudiantiles,
  Academico,
  Notificacion
};