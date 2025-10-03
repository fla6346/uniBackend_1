// backend/models/User.js
import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';



const defineUser = async (sequelize) =>{
  const User=sequelize.define('User',{
  idusuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
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
  unique: true ,
  field: 'telegram_chat_id'
}
}, {
  tableName: 'usuario',
  timestamps: true,
  underscored: true,
  hooks: { 
     beforeCreate: async (user) => {
    if (user.contrasenia && (user.isNewRecord || user.changed('contrasenia'))) {
      const salt = await bcrypt.genSalt(10);
      user.contrasenia = await bcrypt.hash(user.contrasenia, salt);
    } else {
    }
    if (!user.role) {
      user.role = 'student';
    }
  },
    beforeUpdate: async (user) => {
      // Aquí también podrías añadir logs si necesitas depurar actualizaciones
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

const user = await User.findByPk(id, {
  include: [
    { model: Estudiante, as: 'Estudiante' },
    { model: Administrador, as: 'Administrador' }
  ]
});

return User;
};
export default defineUser;