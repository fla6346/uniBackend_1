import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineRecursos = (sequelize)=>{
    const recursos=sequelize.define('Recursos',{
      idRecursos: { 
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
      defaultValue: 9
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'recursos',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return recursos;
};

export default defineRecursos;
