// models/Participante.js

export default (sequelize,DataTypes) => {
const Subcategoría = sequelize.define('Subcategoria', {
  idsubcategoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombreSubcategoria: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
}, {
  tableName: 'subcategoria',
  timestamps: false // O configúralo si tienes columnas createdAt/updatedAt
});

return Subcategoría;
};