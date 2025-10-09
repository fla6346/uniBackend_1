import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const defineNotificacion = (sequelize) => {
    const notificacion = sequelize.define('Notificacion', {
  idnotificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  idadministrador: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idestudiante: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idevento: {
    type: DataTypes.INTEGER,
    allowNull: true,
    References:{model:'evento',
      key:'idEvento'
    }
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    defaultValue: 'nueva'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  event_data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'notificacion',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
return notificacion;
};
export default defineNotificacion;