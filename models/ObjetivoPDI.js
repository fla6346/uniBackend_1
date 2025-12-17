export default (sequelize,DataTypes) => {
  const ObjetivoPDI = sequelize.define('ObjetivoPDI', {
    idobjetivo_pdi: {
      type: DataTypes.INTEGER,
      primaryKey: true, // ← Agregar esta línea
      autoIncrement: true,
      allowNull: false,
    },
    idobjetivo: {
      type: DataTypes.INTEGER,
      allowNull: false, // ← Agregar allowNull: false para consistencia
      references: {
        model: 'Objetivo',
        key: 'idobjetivo',
      },
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'objetivo_pdi',
    timestamps: false,
  });
    ObjetivoPDI.associate = function(models){
      ObjetivoPDI.belongsTo(models.Objetivo, { foreignKey: 'idobjetivo', as: 'objetivo' });
    }
  return ObjetivoPDI;
};