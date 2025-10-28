import { sequelize } from '../config/db.js'
import { DataTypes } from 'sequelize';

const defineComite = (sequelize) =>{
    const comite = sequelize.define('Comite',{
     ideventocomite: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ideventocomite'
  },
  idevento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idevento'
  },
  idusuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idusuario'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'evento_comite',
  timestamps: false
});
return comite;
}
export default defineComite;