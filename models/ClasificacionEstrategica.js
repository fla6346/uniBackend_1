// models/Participante.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize,DataTypes) => {
const Clasificacion = sequelize.define('ClasificacionEstrategica', {
  idClasificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombreClasificacion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  idsubcategoria: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'clasificacionEstrategica',
  timestamps: false 
});
  Clasificacion.associate = (models) => {

  }
return Clasificacion;
};