const { DataTypes } = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const Comite = sequelize.define('Comite', {
  idcomite: {
  type: DataTypes.INTEGER,
  primaryKey: true,
  autoIncrement: true
},
  
created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comite',
    timestamps: false
  });

  Comite.associate = (models) => {
   Comite.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
   Comite.belongsTo(models.User, { foreignKey: 'idusuario', as: 'miembroComite' });
   Comite.belongToMany(models.Academico{ foreignKey: 'idComite', through: 'ComiteUsuarios'});
  };

  return Comite;
}