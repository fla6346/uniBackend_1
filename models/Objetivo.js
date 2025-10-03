import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';


export default (sequelize) => {
  const Objetivo = sequelize.define('Objetivo', {
    idobjetivo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idtipoobjetivo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    texto_personalizado: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'texto_personalizado',
    },
     
  }, {
    tableName: 'objetivos', // Nombre de la tabla "hija"
    timestamps: false,
  });

return Objetivo;
};