export default (sequelize,DataTypes)=>{
    const Daf=sequelize.define('Daf',{
       idDaf: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true 
    },
    nivelAcceso: {
      type: DataTypes.INTEGER,
      defaultValue: 6
    },
  }, {
    tableName: 'daf',
    timestamps: false 
  });
  Daf.associate = function(models){
    Daf.belongsTo(models.User,{foreignKey:'idusuario'});


  }

  return Daf;
};

