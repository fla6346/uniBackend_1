// models/ChatMensaje.js
module.exports = (sequelize, DataTypes) => {
  const ChatMensaje = sequelize.define('ChatMensaje', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    evento_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(20),  // 'admin' | 'creador' | 'logistica'
      allowNull: false
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'chat_mensajes',
    timestamps: true
  });

  return ChatMensaje;
};