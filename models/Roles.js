import { DataTypes } from 'sequelize';
//import sequelize from '../config/db.js';


export default (sequelize) => {
const Role = sequelize.define('Role', {
  idrol: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombrerol: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'roles',
  timestamps: false,
});
return Role;
}