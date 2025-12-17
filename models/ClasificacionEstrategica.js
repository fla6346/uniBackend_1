// models/Participante.js

export default (sequelize,DataTypes) => {
const Clasificacion = sequelize.define('ClasificacionEstrategica', {
  idClasificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombreClasificacion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  idsubcategoria: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'clasificacionEstrategica',
  timestamps: false // O configúralo si tienes columnas createdAt/updatedAt
});
  Clasificacion.associate = function(models){

  }
return Clasificacion;
};