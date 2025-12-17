
export default (sequelize,DataTypes) =>{
    const comite = sequelize.define('Comite',{
   
  idevento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: 'idevento',
      references: { model: 'evento', key: 'idevento' }
  },
  idComite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: 'idcomite',
    references: { model: 'comite', key: 'idcomite' }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'evento_comite',
  timestamps: false
});
return comite;
}