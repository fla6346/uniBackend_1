import {getModels} from '../models/index.js ';
export default (sequelize, DataTypes) => {
  const Administrador = sequelize.define('Administrador', {
    idadministrador: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: DataTypes.INTEGER,
    // ... otros campos que tengas
  }, {
    tableName: 'administrador',
    timestamps: false
  });

  Administrador.associate = function(models) {
    Administrador.belongsTo(models.User, {
      foreignKey: 'idusuario',
      as: 'usuario'
    });
    
  };

  return Administrador;
};