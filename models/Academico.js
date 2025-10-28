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
        model:'Usuario',
        key:'idusuario'
      }
    },
    idfacultad:{
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Facultad',
        key: 'idfacultad'
    }
  },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'academico',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return academico;
};

export default defineAcademico;
