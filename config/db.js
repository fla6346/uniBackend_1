// config/database.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    
    // 🔐 AGREGA ESTO: Configuración SSL para Render
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Necesario para Render
      }
    },
    
    define: {
      timestamps: false,
      underscored: true 
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Opcional: probar conexión al iniciar
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión a PostgreSQL establecida.');
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos:', err);
  });

module.exports = sequelize;