// backend/models/User.js
import { DataTypes } from 'sequelize';
import {sequelize}  from '../config/db.js';
import bcrypt from 'bcryptjs';

const defineUser = (sequelize) => { 
  const User = sequelize.define('User', {
    idusuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
      field:'idusuario'
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'username',
    },
    contrasenia: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'contrasenia',
    },
    habilitado: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: '1',
      field: 'habilitado',
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nombre',
    },
    apellidopat: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'apellidopat',
    },
    apellidomat: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'apellidomat',
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      field: 'email',
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'student',
      validate: {
        isIn: [[
          'student',
          'daf',
          'admin',
          'comunicacion',
          'academico',
          'TI',
          'recursos',
          'Admisiones',
          'serv. Estudiatil'
        ]],
      },
      field: 'role',
    },
    telegramChatId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      field: 'telegram_chat_id'
    },
    created_at: { // Coincide con tu DB
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: { // Coincide con tu DB
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  }, {
    tableName: 'usuario',
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        if (user.contrasenia && (user.isNewRecord || user.changed('contrasenia'))) {
          const salt = await bcrypt.genSalt(10);
          user.contrasenia = await bcrypt.hash(user.contrasenia, salt);
        } else {
          // Considera lanzar un error o manejar el caso si la contraseña no está presente
          // y no debería serlo.
        }
        if (!user.role) {
          user.role = 'student';
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('contrasenia')) {
          console.log('Hook beforeUpdate - Contraseña CAMBIÓ, hasheando de nuevo. ANTES:', user.previous('contrasenia'), 'NUEVA (antes de hash):', user.contrasenia);
          const salt = await bcrypt.genSalt(10);
          user.contrasenia = await bcrypt.hash(user.contrasenia, salt);
          console.log('Hook beforeUpdate - Contraseña DESPUÉS del hash:', user.contrasenia);
        }
      },
    },
  });

  User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.contrasenia);
  };

  return User;
};

export default defineUser;