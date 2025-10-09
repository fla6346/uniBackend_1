import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineEstudiante = (sequelize)=>{
    const estudiante=sequelize.define('Estudiante',{
       idEstudiante: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { // Clave foránea que referencia a la tabla 'usuarios'
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true // Un usuario solo puede ser un tipo de administrador
    },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'Estudiante',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return estudiante;
};

export default defineEstudiante;
