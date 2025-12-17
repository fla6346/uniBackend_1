export default (sequelize,DataTypes) => {
  const Recurso = sequelize.define('Recurso', {
    idrecurso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
   
   nombre_recurso: {
      type: DataTypes.STRING,
        allowNull: false,
    }, 
    recurso_tipo: {     
      type: DataTypes.STRING,
      allowNull: false,
       validate: {
        isIn: [['tecnologico', 'mobiliario', 'vajilla']]
      }
    },
      descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    habilitado: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
},
    {
    tableName: 'recurso', // Nombre de la tabla "hija"
    timestamps: false,
  });
 /*Evento.associate = function(models) {
Recurso.belongsToMany(models.Evento, {
  through: 'evento_recurso',
  foreignKey: 'idrecurso',
  otherKey: 'idevento',
  timestamps: false 
});
  };*/
return Recurso;
};