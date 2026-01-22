
export default (sequelize,DataTypes) => {
const Actividad=sequelize.define('Actividad',{
    idactividad:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    },
    idevento:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
            model:'evento',
            key:'idevento',
        },
      
    },
    nombre:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'nombre',

    },
    
    
},{
    tableName:'actividades',
    timestamps:false,
});
Actividad.associate = function(models){
    Actividad.belongsTo(models.Evento,{
        foreignKey:'idevento',
        as:'evento',
    });
}
 return Actividad;
};