// config/database.js
const { Sequelize } = require('sequelize');

// Usar DATABASE_URL si existe (producción en Render)
// O usar variables separadas (desarrollo local)
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Obligatorio para Render
        }
      },
      logging: false,
      define: {
        timestamps: false,
        underscored: true 
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false,
        define: {
          timestamps: false,
          underscored: true 
        }
      }
    );

module.exports = sequelize;