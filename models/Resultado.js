// models/Objetivo.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import Evento from '../models/Event.js';
export default (sequelize) => {
  const Resultado = sequelize.define('Resultado', {
    idresultados_esperados: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'evento',
        key: 'idevento',
      },
    },
    satisfaccion_real: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'satisfaccion_real',
    },
    otros_resultados: {
     type: DataTypes.STRING,
     allowNull: true,
     field: 'otros_resultados',
   },
   participacion_esperada: {
     type: DataTypes.INTEGER,
     allowNull: false,
   },
    satisfaccion_esperada: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'resultado', // Nombre de la tabla "hija"
    timestamps: false,
  });
  return Resultado;
};
//Evento.hasOne(Resultado, { foreignKey: 'idevento', as: 'resultado'});