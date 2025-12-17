export default (sequelize, DataTypes) => {
  const Evento = sequelize.define('Evento', {
    idevento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'idevento'
    },
    nombreevento: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'nombreevento'
    },
    lugarevento: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'lugarevento'
    },
    fechaevento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'fechaevento'
    },
    horaevento: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'horaevento'
    },
   
    estado: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'estado'
    },
    fecha_aprobacion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_aprobacion' // ✅ Agregado field
    },
    admin_aprobador: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'admin_aprobador' // ✅ Agregado field
    },
    comentarios_admin: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'comentarios_admin' // ✅ Agregado field
    },
    fecha_rechazo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'fecha_rechazo' // ✅ Agregado field
    },
    razon_rechazo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'razon_rechazo' // ✅ Agregado field
    },
    descripcion: {
      type: DataTypes.STRING,
      field: 'descripcion' // ✅ Agregado field
    },
    idadministrador: {
      type: DataTypes.INTEGER, // ✅ Cambiado a INTEGER
      allowNull: true,
      field: 'idadministrador', // ✅ Agregado field
      references: { model: 'usuario', key: 'idusuario' } // ✅ Corregido nombre de tabla
    },
    idacademico: {
      type: DataTypes.INTEGER,
      allowNull: true,
      //references: { model: 'usuario', key: 'idusuario' }
    },
    idclasificacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'idclasificacion', 
      references: { model: 'subcategoria', key: 'idsubcategoria' }
    },
    idresultado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'idresultado', 
      references: { model: 'resultado', key: 'idresultado' }
    },
  }, {
    tableName: 'evento',
    timestamps: true
  });

  Evento.associate = function(models) {
    Evento.belongsTo(models.ClasificacionEstrategica, {
      foreignKey: 'idclasificacion',
      as: 'clasificacion'
    });
   /* Evento.belongsTo(models.User, {
      foreignKey: 'idadministrador',
      as: 'administradorAprobador'
    });*/
    Evento.belongsTo(models.User, {
      foreignKey: 'idacademico',
      as: 'academicoCreador'
    });
     Evento.belongsToMany(models.User, {
    through: models.Comite,
    as: 'comite',
    foreignKey: 'idevento',
    otherKey: 'idusuario'
  });
    Evento.belongsToMany(models.Recurso, {
      through: 'evento_recurso',
      foreignKey: 'idevento',
      otherKey: 'idrecurso',
      as: 'Recursos',
      timestamps: false
    });
    Evento.hasOne(models.Resultado, {
      foreignKey: 'idevento',
      as: 'Resultados'
    });
 
    
    Evento.belongsToMany(models.Objetivo, {
      through: models.EventoObjetivo,
      foreignKey: 'idevento',
      otherKey: 'idobjetivo',
      as: 'Objetivos'
    });
    Evento.belongsToMany(models.Estudiante, {
      through: 'evento_inscripciones',
      foreignKey: 'idevento',
      otherKey: 'idestudiante',
      as: 'Estudiantes'
    });
     Evento.hasMany(models.Comite, {
    foreignKey: 'idevento',
    as: 'Comites'
  });
  // models/Evento.js (dentro de associate)
Evento.belongsToMany(models.TiposDeEvento, { 
  through: models.EventoTipo,             
  foreignKey: 'idevento',
  otherKey: 'idtipoevento',
  as: 'tiposDeEvento'
});

  };

  return Evento;
};