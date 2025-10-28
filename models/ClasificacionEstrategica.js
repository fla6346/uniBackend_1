// models/Participante.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export default (sequelize) => {
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
}, {
  tableName: 'clasificacionEstrategica',
  timestamps: false // O configúralo si tienes columnas createdAt/updatedAt
});

return Clasificacion;
};