import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineAdmisiones = (sequelize)=>{
    const admisiones=sequelize.define('admisiones',{
       idadmisiones: { // Clave primaria para esta tabla específica
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
      defaultValue: 4
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'admisiones',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return admisiones;
};

export default defineAdmisiones;
