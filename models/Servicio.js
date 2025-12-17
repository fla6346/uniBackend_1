
export default (sequelize,DataTypes) => {
const Servicio=sequelize.define('Servicio',{
    idservicio:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
    },
    nombreservicio:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'nombreservicio',

    },
    fechadeentrega:
        DataTypes.DATE,


    
    caracteristicas:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'caracteristicas',
    },
    observaciones:{
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'observaciones',
    },
    habilitado:{
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '1',
        field: 'habilitado',
    }
    
},{
    tableName:'servicio',
});
 return Servicio;
};