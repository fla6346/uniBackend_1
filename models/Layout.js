// models/Layout.js

export default function(sequelize,DataTypes) {
  const Layout = sequelize.define('Layout', {
    idlayout: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    url_imagen: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'layouts',
    timestamps: false
  });
  Layout.associate = function(models) {
  Layout.hasMany(models.Evento, {
  foreignKey: 'idlayout',
  as: 'Eventos'
});
  };
  return Layout;
};