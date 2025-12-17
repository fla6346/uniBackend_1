// backend/controllers/userController.js
import {getModels} from '../models/index.js ';
import { Op, where } from 'sequelize';
import bcrypt from 'bcryptjs'; // Para hashear contraseñas
import asyncHandler from 'express-async-handler'; // Para manejo de errores async


export const createUser = asyncHandler(async (req, res) => {
  const models = await getModels();
  const {User} = models;
  const {
    username,
    nombre,
    apellidopat,
    apellidomat,
    email,
    contrasenia, 
    role,
    habilitado,
     idfacultad,     
    idcarrera,      
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
  const models = await getModels();
  const {User,Academico, Carrera} = models;
  const users = await User.findAll({
     include: [
    {
      model: Academico,
      as: 'academico',
      include: [{
        model: Carrera,
        as: 'carrera',
        attributes: ['nombreCarrera'] // Solo el nombre de la carrera
      }],
       attributes: []
  }
  ],
  attributes: { exclude: ['contrasenia'] } // Excluye la contraseña por seguridad
});
  res.status(200).json(users);
});

export const getCarrera= asyncHandler(async (req,res)=>{
  try {
      const models = await getModels();
      const {Carrera} = models;
    const carreras = await Carrera.findAll(); // Suponiendo que usas un ORM como Sequelize
    res.status(200).json(carreras);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener carreras', error });
  }
});
export const getUserProfile = asyncHandler(async (req, res) => {

  try {
    const userId = req.user.id; // ID del usuario autenticado desde el middleware
    
    // Query con JOIN para obtener el nombre de la facultad
    const query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.apellidopat, 
        u.apellidomat, 
        u.email,
        u.role,
        u.facultad_id,
        f.nombre_facultad as facultad
      FROM usuarios u
      LEFT JOIN facultad f ON u.facultad_id = f.id
      WHERE u.id = ?
    `;
    
    // Ajusta según tu configuración de base de datos
    const [rows] = await pool.query(query, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const user = rows[0];
    
    res.json({
      id: user.id,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      facultad: user.facultad || 'Sin facultad',
      facultad_id: user.facultad_id
    });
    
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      message: 'Error al obtener el perfil del usuario',
      error: error.message 
    });
  }
});
export const getUserById = asyncHandler(async (req, res) => {
   const models = await getModels();
  const {User} = models;
  try {
    const { id } = req.params; // ✅ Obtiene el ID de la URL
    
    console.log('Backend: Consultando usuario con ID:', id);

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['contrasenia'] } // No enviar la contraseña
    });

    if (!user) {
      console.log('Backend: Usuario no encontrado con ID:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Backend: Usuario encontrado:', user.toJSON());

    // ✅ Enviar respuesta en el formato que espera el frontend
    res.status(200).json({
      user: {
        idusuario: user.idusuario,
        username: user.username,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        email: user.email,
        role: user.role,
        habilitado: user.habilitado
      }
    });
  } catch (error) {
    console.error('Error en getUserById:', error);
    res.status(500).json({ 
      message: 'Error al obtener usuario',
      error: error.message 
    });
  }
});

  export const getUserById1 = asyncHandler(async (req, res) => {
     const models = await getModels();
  const {User} = models;
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['contrasenia'] }, // Excluir 'contrasenia'
  });

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }
  res.status(200).json(user);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { username, nombre, apellidopat, apellidomat, email, role, habilitado, contrasenia } = req.body;

  console.log('Backend: Actualizando usuario ID:', userId);
  console.log('Backend: Datos recibidos:', req.body);

  try {
    // Construir query dinámicamente
    let query = 'UPDATE usuarios SET username = ?, nombre = ?, apellidopat = ?, apellidomat = ?, email = ?, role = ?, habilitado = ?';
    let params = [username, nombre, apellidopat, apellidomat, email, role, habilitado];

    // Si se proporciona contraseña, incluirla
    if (contrasenia && contrasenia.trim() !== '') {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(contrasenia, 10);
      query += ', contrasenia = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    db.query(query, params, (error, results) => {
      if (error) {
        console.error('Error al actualizar usuario:', error);
        
        // Manejar error de duplicado (username o email ya existen)
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ 
            message: 'El nombre de usuario o email ya están en uso' 
          });
        }
        
        return res.status(500).json({ 
          message: 'Error al actualizar el usuario',
          error: error.message 
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ 
          message: 'Usuario no encontrado' 
        });
      }

      console.log('Backend: Usuario actualizado exitosamente');
      res.status(200).json({ 
        message: 'Usuario actualizado correctamente',
        affectedRows: results.affectedRows
      });
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      message: 'Error del servidor',
      error: error.message 
    });
  }
});
export const updateUser = asyncHandler(async (req, res) => {
   const models = await getModels();
  const {User} = models;
  try {
    const { id } = req.params;
    const { username, nombre, apellidopat, apellidomat, email, role, habilitado, contrasenia } = req.body;

    console.log('Backend: Actualizando usuario ID:', id);
    console.log('Backend: Datos recibidos:', req.body);

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    // Buscar el usuario
    const user = await User.findByPk(id);

    if (!user) {
      console.log('Backend: Usuario no encontrado con ID:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el username o email ya existen (y no son del mismo usuario)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'El email ya está en uso' });
      }
    }

    // Actualizar campos
    if (username) user.username = username;
    if (nombre) user.nombre = nombre;
    if (apellidopat) user.apellidopat = apellidopat;
    if (apellidomat !== undefined) user.apellidomat = apellidomat;
    if (email) user.email = email;
    if (role) user.role = role;
    if (habilitado !== undefined) user.habilitado = habilitado;

    // Si se proporciona contraseña, hashearla
    if (contrasenia && contrasenia.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.contrasenia = await bcrypt.hash(contrasenia, salt);
    }

    // Guardar cambios
    await user.save();

    console.log('Backend: Usuario actualizado exitosamente');

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: {
        idusuario: user.idusuario,
        username: user.username,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        email: user.email,
        role: user.role,
        habilitado: user.habilitado
      }
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      message: 'Error al actualizar el usuario',
      error: error.message 
    });
  }
});

export const getDirectoresCarrera = asyncHandler(async(req, res) => {
   const models = await getModels();
  const {User,Role} = models;
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
   const models = await getModels();
  const {User} = models;
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

export const getComite = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { sequelize } = models;

  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.idusuario,
        u.nombre,
        u.apellidopat,
        u.apellidomat,
        u.email,
        u.role,
        f.nombre_facultad AS facultad
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN facultad f ON a.facultad_id = f.facultad_id
      WHERE u.role = 'academico' AND u.habilitado = '1'
      ORDER BY u.nombre, u.apellidopat
    `);

    // ✅ Formatear directamente desde 'results'
    const usuariosFormateados = results.map(row => ({
      id: row.idusuario,
      nombreCompleto: `${row.nombre || ''} ${row.apellidopat || ''} ${row.apellidomat || ''}`.trim(),
      email: row.email,
      role: row.role,
      facultad: row.facultad || null  // <-- viene directo de la columna 'f.nombre_facultad AS facultad'
    }));

    res.status(200).json(usuariosFormateados);
  } catch (error) {
    console.error('Error al obtener usuarios para comité:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
export const getComiteUser = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { sequelize } = models;

  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.idusuario,
        u.nombre,
        u.apellidopat,
        u.apellidomat,
        u.email,
        u.role,
        f.nombre_facultad AS facultad
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN facultad f ON a.facultad_id = f.facultad_id
      WHERE u.role = 'academico' AND u.habilitado = '1'
      ORDER BY u.nombre, u.apellidopat
    `);

    // ✅ Formatear directamente desde 'results'
    const usuariosFormateados = results.map(row => ({
      id: row.idusuario,
      nombreCompleto: `${row.nombre || ''} ${row.apellidopat || ''} ${row.apellidomat || ''}`.trim(),
      email: row.email,
      role: row.role,
      facultad: row.facultad || null  // <-- viene directo de la columna 'f.nombre_facultad AS facultad'
    }));

    res.status(200).json(usuariosFormateados);
  } catch (error) {
    console.error('Error al obtener usuarios para comité:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
export const getId = asyncHandler(async(req, res)=>{
  try {
    const { id } = req.params;

    // Asegúrate de que el ID sea un entero
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const query = `
      SELECT 
        u.idusuario, 
        u.username, 
        u.email, 
        u.role, 
        u.habilitado,
        a.idarea AS area_id,
        c.idcarrera AS carrera_id,
        c.nombrecarrera
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN carrera c ON a.idcarrera = c.idcarrera
      WHERE u.idusuario = ?
    `;

    const [rows] = await db.query(query, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Formatear el objeto para incluir datos anidados si es académico
    const response = {
      idusuario: user.idusuario,
      username: user.username,
      email: user.email,
      role: user.role,
      habilitado: user.habilitado,
    };

    if (user.role === 'academico') {
      response.academico = {
        idarea: user.area_id,
        carrera: user.carrera_id
          ? { idcarrera: user.carrera_id, nombrecarrera: user.nombrecarrera }
          : null,
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export const linkTelegramAccount = asyncHandler(async (req, res) => {
   const models = await getModels();
  const {User} = models;
  
  const { email, chat_id } = req.body;

  // 1. Validar la entrada
  if (!email || !chat_id) {
    res.status(400);
    throw new Error('Faltan el email o el chat_id.');
  }

  const user = await User.findOne({ where: { email } });

  const token = jwt.sign(
    { id: user.id }, // ✅ Usa "id", no "idusuario"
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  if (!user) {
    res.status(404);
    throw new Error('No se encontró ningún usuario con ese email. Por favor, verifica que lo hayas escrito correctamente.');
  }

  if (user.telegram_chat_id) {
    if (user.telegram_chat_id == chat_id) {
      return res.status(200).json({ message: 'Esta cuenta ya estaba vinculada correctamente.' });
    } else {
      res.status(409); 
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

export const getProfile = asyncHandler(async (req, res) => {
  
    if (!req.user.idusuario) {
    return res.status(401).json({ message: 'No autorizado: usuario no autenticado' });
  }

  const userId = req.user.idusuario;
  if (!userId) {
    console.error('req.user no tiene idusuario:', req.user);
    return res.status(500).json({ message: 'Error: usuario autenticado sin ID válido' });
  }

  const models = await getModels();
  const { User, Facultad } = models; // o 'User', según el nombre real de tu modelo

  try {
    const user = await User.findByPk(userId,{
      attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat', 'email', 'role', 'facultad_id'],
      include: [
        {
          model: Facultad,
          as: 'facultad', // debe coincidir con el alias de la asociación
          attributes: ['nombre_facultad']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.idusuario,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      facultad: user.facultad?.nombre_facultad || 'Sin facultad',
      facultad_id: user.facultad_id
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      message: 'Error al obtener el perfil del usuario',
      error: error.message 
    });
  }
  /*const idusuario = req.user.idusuario;
  const models = await getModels();
  const { sequelize,Usuario } = models;
  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.idusuario,
        u.nombre,
        u.apellidopat,
        u.apellidomat,
        u.email,
        u.role,
        f.nombre_facultad AS facultad
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN facultad f ON a.facultad_id = f.facultad_id
      WHERE u.idusuario = ?
    `, {
      replacements: [idusuario],
      type: sequelize.QueryTypes.SELECT
    });

    if (results.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = results[0];

    res.status(200).json({
      idusuario: user.idusuario,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      facultad: user.facultad || null // Puede ser null si no es académico o no tiene facultad asignada
    });
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario' });
  }*/
});
export const getFacultades = asyncHandler(async(req,res)=>{
try{
  const models = await getModels();
  const {Facultad} = models;
  const facultad = await Facultad.findAll();
  res.status(200).json(facultad);

}catch(error){
  res.status(500).json({message: 'Error al obtener', error})

}

})