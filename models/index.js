const { Sequelize,DataTypes } = require('sequelize');
require('dotenv').config();
const fs = require('fs');
const path = require('path');


let _sequelize;
let _models = null;
const getSequelize = () => {
  if (!_sequelize) {
    throw new Error('Sequelize not initialized. Call initModels() first.');
  }
  return _sequelize;
};

const initModels = async () => {
  if (_models) return _models;

  let sequelize;
 if (process.env.DATABASE_URL) {
    // Modo producción (Render, Railway, etc.)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false  // evita error de certificado self-signed
        }
      },
      logging: false,  // o console.log si quieres debug
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      quoteIdentifiers: false,
      define: {
        timestamps: false,
        underscored: true
      }
    });
    console.log('✅ Usando DATABASE_URL para conexión (Render mode)');
  } else {
 
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        quoteIdentifiers: false,
        define: { timestamps: false, underscored: true }
      }
    );
    console.log('✅ Conexión local (desarrollo)');
  }
  _sequelize = sequelize;

  try {
    await _sequelize.authenticate();
    console.log('✅ PostgreSQL conectado correctamente');
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
  
  const models = {};

  const orderedModelFiles = [
    'Facultad.js',
    'User.js',
    'Evento.js',
    'Objetivo.js',
    'Resultado.js',
    'Recurso.js',
    'EventoTipo.js',
    'Comite.js',
    'Notificacion.js',
    'Administrador.js',
    'Admisiones.js',
    'Daf.js',
    'Externo.js',
    'Ti.js',
    'Comunicacion.js',
    'Alumno.js',
    'Estudiante.js',
    'EventoObjetivo.js',
    'EventoInscripcion.js',
    'ResultadoRecurso.js',
    'ClasificacionEstrategica.js',
    'Proyecto.js',
    'ProyectoEstudiante.js',
    'ObjetivoPDI.js',
    'TipoObjetivo.js',
    'Segmento.js',
    'ObjetivoSegmento.js',
    'Argumentacion.js',
    'EventoComite.js',
    'Academico.js',
    'TiposDeEvento.js',
    'Layouts.js',
    'Fase.js',
    'Actividad.js',
    'Servicio.js',
    'Croquis.js',
    'Presupuesto.js',
    'Ingreso.js',
    'Egreso.js'
  ];

  const loadModel = (filename) => {
    const modelPath = path.join(__dirname, filename);
    if (!fs.existsSync(modelPath)) return null;
    
    // require() en CommonJS - maneja .default si existe
    const modelDefiner = require(modelPath);
    const definer = modelDefiner.default || modelDefiner;
    
    if (typeof definer === 'function') {
      const model = definer(_sequelize, Sequelize.DataTypes);
      if (model && model.name) {
        return model;
      }
    }
    return null;
  };

  for (const file of orderedModelFiles) {
    const model = loadModel(file);
    if (model) {
      models[model.name] = model;
      console.log(`✅ Modelo cargado: ${model.name}`);
    }
  }

  const allFiles = fs.readdirSync(__dirname);
  for (const file of allFiles) {
    if (file === 'index.js' || !file.endsWith('.js') || orderedModelFiles.includes(file)) {
      continue;
    }
    const model = loadModel(file);
    if (model && !models[model.name]) {
      models[model.name] = model;
      console.log(`✅ Modelo cargado (adicional): ${model.name}`);
    }
  }

  console.log('\n🔗 Ejecutando asociaciones de modelos...');
  Object.values(models).forEach(model => {
    if (model && typeof model.associate === 'function') {
      model.associate(models);
    }
  });
  console.log('✅ Asociaciones completadas\n');

  models.sequelize = _sequelize;
  _models = models;
  return { sequelize: _sequelize, models: _models };
};

const getModels = () => {
  if (!_models || Object.keys(_models).length === 0) {
    throw new Error('Models not initialized. Call initModels() first.');
  }
  return _models;
};

module.exports = {
  sequelize: _sequelize,
  initModels,
  getModels
};