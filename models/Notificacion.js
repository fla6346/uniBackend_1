
export default (sequelize,DataTypes) => {
    const Notificacion = sequelize.define('Notificacion', {
  idnotificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
 idusuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuario',
        key: 'idusuario'
      }
    },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo:{
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'nueva'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
 
  created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
}, {
  tableName: 'notificacion',
  timestamps: false,
});
Notificacion.associate = function(models) {
    Notificacion.belongsTo(models.User, {
      foreignKey: 'idusuario',
      as: 'usuario'
    });
  };

return Notificacion;
};