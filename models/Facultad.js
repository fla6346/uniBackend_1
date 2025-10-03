import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const defineFacultad = (sequelize) => {
  const Facultad = sequelize.define('Facultad', {
    idfacultad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nombre_facultad: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'facultad',
    timestamps: false,
    underscored: true
  });

  return Facultad;
};

export default defineFacultad;