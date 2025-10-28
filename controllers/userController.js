// backend/controllers/userController.js
import { User,Role, Academico, Facultad } from '../config/db.js'; // Asegúrate que esta importación traiga tu modelo User
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs'; // Para hashear contraseñas
import asyncHandler from 'express-async-handler'; // Para manejo de errores async


export const createUser = asyncHandler(async (req, res) => {
  const {
    username,
    nombre,
    apellidopat,
    apellidomat,
    email,
    contrasenia, 
    role,
    habilitado,
     idusuarioexterno,
     idestudiante,   
  } = req.body;

  // 1. Validar datos de entrada
  if (!username || !nombre || !apellidopat || !email || !contrasenia || !role) {
    res.status(400);
    throw new Error('Por favor, completa todos los campos requeridos: userName, nombre, apellidopat, email, contrasenia, role.');
  }

  // 2. Verificar si el email o userName ya existen
  const emailExists = await User.findOne({ where: { email } });
  if (emailExists) {
    res.status(400);
    throw new Error('El correo electrónico ya está registrado.');
  }

  const userNameExists = await User.findOne({ where: { username } });
  if (userNameExists) {
    res.status(400);
    throw new Error('El nombre de usuario ya está en uso.');
  }

  // 3. Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(contrasenia, salt);

  // 4. Crear el usuario en la base de datos
  const newUser = await User.create({
    username,
    nombre,
    apellidopat,
    apellidomat: apellidomat || null,
    email,
    contrasenia,
    role,
    habilitado: habilitado !== undefined ? habilitado : true,
  });

  if (newUser) {
    // Devolver el usuario creado (sin la contraseña)
    const userResponse = {
      idusuario: newUser.idusuario, // Asegúrate que este sea el nombre de tu PK
      username: newUser.username,
      nombre: newUser.nombre,
      apellidopat: newUser.apellidopat,
      apellidomat: newUser.apellidomat,
      email: newUser.email,
      role: newUser.role,
      habilitado: newUser.habilitado,
      //createdAt: newUser.createdAt,
    };
    res.status(201).json(userResponse);
  } else {
    res.status(400);
    throw new Error('No se pudo crear el usuario, datos inválidos.');
  }
});

export const getAllUsers = asyncHandler(async (req, res) => {
  
  const users = await User.findAll({
    attributes: { exclude: ['contrasenia'] }, // Excluir 'contrasenia'
    //order: [['createdAt', 'DESC']],
  });
  res.status(200).json(users);
});

export const getCarrera= asyncHandler(async (req,res)=>{
  try {
    const carreras = await carreras.findAll(); // Suponiendo que usas un ORM como Sequelize
    res.status(200).json(carreras);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener carreras', error });
  }
});
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.idusuario, {
    attributes: { exclude: ['contrasenia'] }, // Excluir 'contrasenia'
  });

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }
  res.status(200).json(user);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  // Tu código existente para updateUserRole
  const { id } = req.params;
  const { role } = req.body; // Asumiendo que solo actualizas el rol por ahora

  // Si quieres actualizar más campos, los tomarías de req.body
  // const { nombre, apellidopat, apellidomat, email, habilitado, newPassword } = req.body;


  const user = await User.findByPk(id);

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }

  // Actualizar campos (ejemplo)
  // user.nombre = nombre || user.nombre;
  // user.email = email || user.email;
  // user.habilitado = habilitado !== undefined ? habilitado : user.habilitado;

  if (role) {
    const allowedRoles = ['student', 'organizer', 'admin']; // Añade 'user' si es un rol válido
    if (!allowedRoles.includes(role)) {
        res.status(400);
        throw new Error(`Rol inválido. Roles permitidos: ${allowedRoles.join(', ')}.`);
    }
    // Lógica para evitar quitar el rol de admin al único admin (ya la tenías)
    if (user.idusuario === req.user.idusuario && user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
            res.status(400);
            throw new Error('No puedes quitar el rol de administrador al único administrador.');
        }
    }
    user.role = role;
  }
  

  // Si se envía una nueva contraseña, hashearla y actualizarla
  // if (newPassword) {
  //   if (newPassword.length < 6) {
  //     res.status(400);
  //     throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  //   }
  //   const salt = await bcrypt.genSalt(10);
  //   user.contrasenia = await bcrypt.hash(newPassword, salt);
  // }

  const updatedUser = await user.save();

  const userResponse = {
    idusuario: updatedUser.idusuario,
    username: updatedUser.username,
    nombre: updatedUser.nombre,
    apellidopat: updatedUser.apellidopat,
    apellidomat: updatedUser.apellidomat,
    email: updatedUser.email,
    role: updatedUser.role,
    habilitado: updatedUser.habilitado,
    updatedAt: updatedUser.updatedAt,
  };
  res.status(200).json(userResponse);
});

export const getDirectoresCarrera = asyncHandler(async(req, res) => {
  try{ 
  const directorRole = await Role.findOne({
      where: { nombrerol: 'Director de carrera' }
    });
  if (!directorRole) {
      res.status(404);
      throw new Error('Rol "Director de carrera" no encontrado.');
    }

    const directores = await User.findAll({
      attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
      include: [{
        model: Role,
        where: { idrol: directorRole.idrol },
        through: { attributes: [] } // No incluir atributos de la tabla de unión
      }],
      limit: 5, // Según tu consulta original
    });

    // Formatea la respuesta para que coincida con el 'nombreCompleto' esperado por tu frontend
    const formattedDirectores = directores.map(director => ({
      id: director.idusuario,
      nombreCompleto: `${director.nombre} ${director.apellidopat} ${director.apellidomat ? director.apellidomat : ''}`.trim()
    }));

    res.status(200).json(formattedDirectores);
  } catch (error) {
    console.error('Error al obtener directores de carrera:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }

});

// @desc    Eliminar un usuario (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  // Tu código existente para deleteUserByAdmin
  const { id } = req.params;
  const user = await User.findByPk(id);

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }

  if (user.idusuario === req.user.idusuario) { // Compara con la PK correcta
    res.status(400);
    throw new Error('No puedes eliminar tu propia cuenta de administrador.');
  }

  await user.destroy();
  res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
});
export const getComite = asyncHandler(async(req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: ['admin', 'academico', 'DAF', 'TI'], // o los roles que apliquen
        habilitado: '1'
      },
      attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role'],
      include:[{
        model:Academico,
        as: 'academico',
        attributes:[],
        include:[
          {
            model:Facultad,
            as:'facultad',
            attributes:['nombre_facultad']
          }
        ],
        required: false
      }
    ],
      order: [['rol', 'ASC']]
    });

    const formattedUsers = users.map(user => {
       const facultad = user.academico?.facultad?.nombre || null;
      return {
        id: user.idusuario,
        nombreCompleto: `${user.nombre} ${user.apellidopat} ${user.apellidomat}`.trim(),
        email: user.email,
        role: user.role,
        facultad: user.academico?.facultad?.nomfacultad 
      };
    });
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error al obtener usuarios para comité:', error);
    res.status(500).json({ error: 'Error al cargar los usuarios' });
  }
});

export const linkTelegramAccount = asyncHandler(async (req, res) => {
   console.log('============================================');
  console.log('[API] Petición de vinculación de Telegram RECIBIDA.');
  console.log('[API] Body de la petición:', req.body);
  console.log('============================================');
  
  const { email, chat_id } = req.body;

  // 1. Validar la entrada
  if (!email || !chat_id) {
    res.status(400);
    throw new Error('Faltan el email o el chat_id.');
  }

  // 2. Buscar al usuario por su email usando el modelo de Sequelize
  const user = await User.findOne({ where: { email } });

  // Si no se encuentra el usuario
  if (!user) {
    res.status(404);
    throw new Error('No se encontró ningún usuario con ese email. Por favor, verifica que lo hayas escrito correctamente.');
  }

  // 3. Verificar si la cuenta de email o de Telegram ya están vinculadas
  // (Asumiendo que tu modelo tiene un campo 'telegram_chat_id')
  if (user.telegram_chat_id) {
    if (user.telegram_chat_id == chat_id) {
      // Ya estaba vinculado a esta misma cuenta, todo bien.
      return res.status(200).json({ message: 'Esta cuenta ya estaba vinculada correctamente.' });
    } else {
      // El email ya está vinculado a OTRO chat de Telegram.
      res.status(409); // 409 Conflict
      throw new Error('Este email ya está vinculado a otra cuenta de Telegram.');
    }
  }
  
  // 4. Si el usuario existe, actualizar su registro con el chat_id
  user.telegram_chat_id = chat_id;
  await user.save(); // Guardar los cambios en la base de datos

  // 5. Enviar una respuesta de éxito
  res.status(200).json({
    message: `¡Éxito! Tu cuenta (${user.email}) ha sido vinculada. Ahora recibirás notificaciones.`
  });
});