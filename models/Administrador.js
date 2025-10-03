import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineAdministrador = (sequelize,User)=>{
    const administrador=sequelize.define('UserAdministrador',{
    idadministrador: { // Clave primaria para esta tabla específica
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references:{
        model:User,
        key:'idusuario'
      }
    },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
  }, {
    tableName: 'administrador',
    timestamps: false 
  });

  return administrador;
};

export default defineAdministrador;
