import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineDaf = (sequelize)=>{
    const daf=sequelize.define('Daf',{
       idDaf: { 
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
      defaultValue: 6
    },
    // Otros campos específicos de Administrador
  }, {
    tableName: 'daf',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });

  return daf;
};

export default defineDaf;
