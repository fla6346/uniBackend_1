// models/index.js
import 'dotenv/config';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

// 🌐 Variable global para almacenar los modelos una vez inicializados
let _models = null;

export const initModels = async () => {
  if (_models) return _models; // Ya inicializado

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
    'Estudiantes.js',
    'ProyectoEstudiante.js',
    'ObjetivoPDI.js',
    'Notificacion.js',
    'Recurso.js',
    'TipoObjetivo.js',
    'Segmento.js',
    'ObjetivoSegmento.js',
    'Argumentacion.js',
    'EventoComite.js',
    'Academico.js',
    'TiposDeEvento.js',
    'Layouts.js'
  ];

  // Cargar en orden
  for (const file of orderedModelFiles) {
    const modelPath = path.join(__dirname, file);
    if (fs.existsSync(modelPath)) {
      const modelUrl = new URL(`file://${modelPath}`).href;
      const modelDefiner = (await import(modelUrl)).default;
      const model = modelDefiner(sequelize, Sequelize.DataTypes);
      models[model.name] = model;
    }
  }

  // Cargar resto (aunque ya está cubierto)
  const allModelFiles = fs.readdirSync(__dirname).filter(file => 
    file !== 'index.js' && file.endsWith('.js') && !orderedModelFiles.includes(file)
  );
  
  for (const file of allModelFiles) {
    const modelPath = path.join(__dirname, file);
    const modelUrl = new URL(`file://${modelPath}`).href;
    const modelDefiner = (await import(modelUrl)).default;
    const model = modelDefiner(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  }

  // 🔗 Asociar modelos
  //console.log('\n🔗 Iniciando asociaciones...');
  //console.log('Modelos disponibles:', Object.keys(models));
  
  Object.keys(models).forEach(modelName => {
    console.log(`\n📌 Procesando modelo: ${modelName}`);
    console.log(`   typeof associate:`, typeof models[modelName].associate);
    
    if (typeof models[modelName].associate === 'function') {
      console.log(`   ✅ Ejecutando ${modelName}.associate()`);
      models[modelName].associate(models);
      
      // Verificar que se crearon
      const assocs = Object.keys(models[modelName].associations || {});
      console.log(`   ✅ Asociaciones creadas: ${assocs.join(', ') || 'ninguna'}`);
    } else {
      console.log(`   ⚠️ ${modelName} NO tiene método associate`);
    }
  });
  
  console.log('\n🔗 Asociaciones completadas.\n');

  models.sequelize = sequelize;
  _models = models;
  return models;
};

// Exporta una función para obtener los modelos (ya inicializados o no)
export const getModels = async () => {
  if (!_models) {
    await initModels();
  }
  return _models;
};

// Exporta sequelize directamente
export { sequelize };