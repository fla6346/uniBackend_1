
export default (sequelize,DataTypes)=>{
    const Estudiante=sequelize.define('Estudiante',{
       idEstudiante: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'idestudiante'
    },
    idusuario: { // Clave foránea que referencia a la tabla 'usuarios'
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true // Un usuario solo puede ser un tipo de administrador
    },
    nivelacceso: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'nivelacceso'
    },
    idcarrera: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'idcarrera',
      references: {
        model: 'carrera', // Nombre de la tabla en la BD
        key: 'idcarrera'
      }
    },
    idfacultad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'idfacultad',
      references: {
        model: 'facultad', // Nombre de la tabla en la BD
        key: 'facultad_id'
      }
    }
  }, {
    tableName: 'estudiante',
    timestamps: false // Opcional: si no quieres timestamps en esta tabla
  });
Estudiante.associate = function(models) {
   Estudiante.belongsTo(models.User, {
      foreignKey: 'idusuario',
      as: 'usuario'
    });

    // Relación con Carrera
    Estudiante.belongsTo(models.Carrera, {
      foreignKey: 'idcarrera',
      as: 'carrera'
    });

    // Relación con Facultad
    Estudiante.belongsTo(models.Facultad, {
      foreignKey: 'idfacultad',
      as: 'facultad'
    });


}
  return Estudiante;
};

