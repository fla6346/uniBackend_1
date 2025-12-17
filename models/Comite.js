export default function(sequelize, DataTypes) {
  const Comite = sequelize.define('Comite', {
   idevento: {
  type: DataTypes.INTEGER,
  field: 'id_evento' // Nombre real en DB
},
idusuario: {
  type: DataTypes.INTEGER,
  field: 'id_usuario'
}
  }, {
    tableName: 'comite',
    timestamps: false
  });

  Comite.associate = function(models) {
   Comite.belongsTo(models.Event, { foreignKey: 'idevento' });
    Comite.belongsTo(models.User, { foreignKey: 'idusuario' });
  };

  return Comite;
}