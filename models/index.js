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

  _sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      quoteIdentifiers: false
    }
  );

  await _sequelize.authenticate();
  console.log('✅ PostgreSQL conectado en models/index.js');

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
    'Recursos.js',
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
    'Croquis.js'
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