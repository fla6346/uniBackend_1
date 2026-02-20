
export default (sequelize, DataTypes)=>{
    const Carrera=sequelize.define('Carrera',{
    idcarrera: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idcarrera'
    },
    facultad_id:{
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Facultad',
        key: 'facultad_id'
    }
  },
    nombreCarrera:{
      type: DataTypes.STRING,
      allowNull:false,
      field: 'nombre_carrera'
  },
  habilitado:{
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'habilitado'
  },

  }, {
    tableName: 'carrera',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });
  Carrera.associate = function(models){
     Carrera.belongsTo(models.Facultad, { 
      foreignKey: 'facultad_id', 
      as: 'facultad' 
    });
    
    Carrera.hasMany(models.Academico, { 
      foreignKey: 'idcarrera', 
      as: 'academicos' 
    });
  }
  return Carrera;
};
