module.exports = (sequelize, DataTypes) => {
  const ComiteMensaje = sequelize.define('comite_mensaje', {
    idmensaje: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    idcomite: {
      type: DataTypes.INTEGER,
      allowNull: false
      // references: { model: 'evento_comite', key: 'idcomite' }
    },
    idevento: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    idusuario_emisor: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(30),
      defaultValue: 'texto',
      validate: { isIn: [['texto', 'archivo', 'sistema']] }
    },
    archivo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    leido_por: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array de idusuario que ya leyeron el mensaje'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comite_mensajes',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      { fields: ['idevento'] },
      { fields: ['idusuario_emisor'] },
      { fields: ['created_at'] }
    ]
  });

  ComiteMensaje.associate = (models) => {
    ComiteMensaje.belongsTo(models.EventoComite, { foreignKey: 'idcomite', as: 'comite' });
    ComiteMensaje.belongsTo(models.Evento, { foreignKey: 'idevento', as: 'evento' });
    ComiteMensaje.belongsTo(models.User, { foreignKey: 'idusuario_emisor', as: 'emisor' });
  };

  return ComiteMensaje;
};