// config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear instancia de Sequelize usando las variables de .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Cambia a console.log si quieres ver las queries SQL
    define: {
      timestamps: false, // Ajusta según tu modelo (si usas createdAt/updatedAt, pon true)
      underscored: true  // Si tus columnas usan guion bajo (ej: id_usuario)
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

export { sequelize };