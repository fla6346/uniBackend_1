
export default (sequelize, DataTypes)=>{
    const Carrera=sequelize.define('Carrera',{
    idcarrera: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idcarrera'
    },
    idfacultad:{
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Facultad',
        key: 'idfacultad'
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
  idfacultad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'idfacultad'
  },  
  }, {
    tableName: 'carrera',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });
  Carrera.associate = function(models){
     Carrera.belongsTo(models.Facultad, { 
      foreignKey: 'idfacultad', 
      as: 'facultad' 
    });
    
    Carrera.hasMany(models.Academico, { 
      foreignKey: 'idcarrera', 
      as: 'academicos' 
    });
  }
  return Carrera;
};
