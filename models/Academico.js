import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineAcademico = (sequelize)=>{
    const academico=sequelize.define('Academico',{
    idacademico: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references:{
        model:'usuario',
        key:'idusuario'
      }
    },
    idfacultad:{
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'facultad',
        key: 'idfacultad'
    }
  },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'directores',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return academico;
};

export default defineAcademico;
