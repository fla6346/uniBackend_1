export default (sequelize, DataTypes) => {
  const Academico = sequelize.define('Academico', {
    idacademico: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    idusuario: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'usuario',
        key: 'idusuario'
      }
    },
    idfacultad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'facultad',
        key: 'idfacultad'
      }
    },
    idcarrera: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carrera',
        key: 'idcarrera'
      }
    }
  }, {
    tableName: 'academico',
    timestamps: false 
  });

  Academico.associate = function(models) {
    Academico.belongsTo(models.User, { foreignKey: 'idusuario', as: 'usuario' });
    Academico.belongsTo(models.Facultad, { foreignKey: 'idfacultad', as: 'facultad' });
    Academico.belongsTo(models.Carrera, { foreignKey: 'idcarrera', as: 'carrera' });
  };

  return Academico;
};