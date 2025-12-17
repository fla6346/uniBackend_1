export default (sequelize, DataTypes) => {
const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT, // Para descripciones más largas
    allowNull: true,
  },
}, {
  tableName: 'categories',
  timestamps: true,
});

return Category;
};