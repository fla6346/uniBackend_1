// backend/models/Evento.js
import { Administrador, sequelize } from '../config/db.js';
import { DataTypes, Model } from 'sequelize';
import Resultado from '../models/Resultado.js';
import Objetivo from '../models/Objetivo.js';
import EventoTipo from '../models/EventoTipo.js';
import Recurso from '../models/Recurso.js';
import  all  from 'axios';
export default (sequelize) => {
  
  // Definición del modelo Evento
const Event = sequelize.define('Evento', {
  idevento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'idevento', 
  },
  nombreevento: {
    type: DataTypes.STRING(20), 
    allowNull: false, 
    field: 'nombreevento',
  },
  lugarevento: {
    type: DataTypes.STRING(30),
    allowNull: true, 
    field: 'lugarevento',
  },
  fechaevento: {
    type: DataTypes.DATEONLY, 
    allowNull: false,
    field: 'fechaevento',
  },
  horaevento: {
    type: DataTypes.TIME, 
    allowNull: true, 
    field: 'horaevento',
  },
    
  responsable_evento: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'responsable_evento',
  },
  estado:{
    type:DataTypes.STRING(100),
    allowNull: true, 
    field:'estado',
  },
  fecha_aprobacion:{
    type: DataTypes.DATE,
    allowNull:true,
  },
  admin_aprobador:{
    type:DataTypes.STRING(255),
    allowNull:true,
   
  },
  comentarios_admin:{
    type:DataTypes.STRING,
    allowNull:true
  },
  fecha_rechazo:{
    type:DataTypes.DATE,
    allowNull:true,
  },
  razon_rechazo:{
    type:DataTypes.STRING,
    allowNull:true,
  },
  descripcion: {
    type:DataTypes.STRING
  },
  idadministrador:{
    type:DataTypes.STRING,
    allowNull:true,
    references:{model:'user',
      key:'idusuario'
    }
  },idclasificacion:{
    type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subcategoria',
        key: 'idsubcategoria',
      },
  }
},
 {
  tableName: 'evento', 
  timestamps: false, 
});

 
return Event;
};