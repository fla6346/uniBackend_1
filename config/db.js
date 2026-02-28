// config/database.js
const { Sequelize } = require('sequelize');

// 🔐 ÚNICA configuración necesaria para Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
});

module.exports = sequelize;