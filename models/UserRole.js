import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Role from './Role.js';

export default(sequelize)=>{
const UserRole = sequelize.define('UserRole', {
    idrol: {
    type: DataTypes.INTEGER,
    primaryKey: true,
     allowNull: false,
      references: {
        model: 'roles', // Nombre de la tabla referenciada
        key: 'idrol', // Columna referenciada
      },
},
  idusuario:{
    type: DataTypes.INTEGER,
    allowNull: false,
      references: {
        model: 'usuario', // Nombre de la tabla referenciada
        key: 'idusuario', // Columna referenciada
      },
  }
  // No se necesita id aquí si es solo una tabla de unión
}, {
  tableName: 'usuario_rol',
  timestamps: false,
});
}
return UserRole;