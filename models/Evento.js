// backend/models/Evento.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    idevento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombreevento: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lugarevento: DataTypes.STRING,
    fechaevento: DataTypes.DATEONLY,
    horaevento: DataTypes.TIME,
    idtipoevento: DataTypes.INTEGER,
    imagenUrl: {
      type: DataTypes.STRING,
      field: 'imagen_evento'
    },
    // ... otros campos según tu BD
  }, {
    tableName: 'evento',
    timestamps: false, // o true si usas createdAt/updatedAt
    underscored: true
  });

  // Asociaciones (se ejecutan desde index.js)
  Evento.associate = (models) => {
    if (models.TipoObjetivo) {
      Evento.belongsTo(models.TipoObjetivo, { foreignKey: 'idtipoevento', as: 'tipoEvento' });
    }
    if (models.Facultad) {
      Evento.belongsTo(models.Facultad, { foreignKey: 'idfacultad', as: 'facultad' });
    }
    // ... otras asociaciones
  };

  return Evento;
};