// models/Participante.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

export default (sequelize) => {
const Subcategoría = sequelize.define('Subcategoria', {
  idsubcategoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombreSubcategoria: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  idclasificacion:{
     type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    references:{
        model:'ClasificacionEstrategica',
        key:'idclasificacion'
      }
  }
}, {
  tableName: 'subcategoria',
  timestamps: false // O configúralo si tienes columnas createdAt/updatedAt
});

return Subcategoría;
};