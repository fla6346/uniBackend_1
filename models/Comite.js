export default function(sequelize, DataTypes) {
  const Comite = sequelize.define('Comite', {
   idevento: {
  type: DataTypes.INTEGER,
  references: {
        model: 'Evento',
        key: 'idevento'
      }
},
idusuario: {
  type: DataTypes.INTEGER,
  field: 'idusuario',
   references: {
        model: 'User',
        key: 'idusuario'
      }
},
created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comite',
    timestamps: false
  });

  Comite.associate = function(models) {
   Comite.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    Comite.belongsTo(models.User, { foreignKey: 'idusuario', as: 'miembroComite' });
  };

  return Comite;
}