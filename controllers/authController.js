// backend/controllers/authController.js
import { getModels } from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Función para generar JWT (sin cambios)
const generateToken = (idusuario) => {
  return jwt.sign({ idusuario }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
  
export const registerUser = async (req, res) => {
 const models = await getModels();
  const User = models.User;
  const Academico = models.Academico;
  const Carrera = models.Carrera;
  const Facultad = models.Facultad;
  const Estudiante = models.Estudiante;
  const {
    userName,
    nombre,
    apellidopat, 
    apellidomat, 
    email, 
    contrasenia, 
    role, 
    habilitado = 1,
    idcarrera,
    idfacultad,
    carrera_id,
    facultad_id
  } = req.body;

  const username = req.body.username || req.body.userName;
  try {
    if (!username || !contrasenia || !email) {
      return res.status(400).json({ message: 'Por favor, proporciona nombre de usuario, contraseña y correo electrónico.' });
    }

    const userExistsByUserName = await User.findOne({ where: { username } });
    if (userExistsByUserName) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    const userExistsByEmail = await User.findOne({ where: { email } });
    if (userExistsByEmail) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

   let validatedCarreraId = null;
let validatedFacultadId = null;
if (role === 'academico' || role === 'student') {
  if (!idcarrera) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'idcarrera es requerido para el rol académico', param: 'idcarrera' }]
    });
  }
  
  if (!idfacultad) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'idfacultad es requerido para el rol académico', param: 'idfacultad' }]
    });
  }

  const cid = parseInt(idcarrera);
  const fid = parseInt(idfacultad);
  
  if (!cid || cid <= 0) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'idcarrera debe ser un número válido', param: 'idcarrera' }]
    });
  }
  
  if (!fid || fid <= 0) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'idfacultad debe ser un número válido', param: 'idfacultad' }]
    });
  }

  const carrera = await Carrera.findByPk(cid);
  const facultad = await Facultad.findByPk(fid);

  if (!carrera) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'Carrera no encontrada', param: 'idcarrera' }]
    });
  }
  
  if (!facultad) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: [{ message: 'Facultad no encontrada', param: 'idfacultad' }]
    });
  }
  
  
  validatedCarreraId = cid;
  validatedFacultadId = fid;
}

    const user = await User.create({
      username,
      contrasenia,
      email,
      nombre,
      apellidopat,
      apellidomat,
      role: role || 'student',
      habilitado: habilitado || '1',
    },{
      returning: true
    });
    console.log('USUARIO CREADO:', user.toJSON());

    if (role === 'academico' && validatedCarreraId && validatedFacultadId) {
      console.log('ID del usuario:', user.idusuario);
      console.log('ID de carrera:', validatedCarreraId);
      console.log('ID de facultad:', validatedFacultadId);

      if (!user.idusuario) {
        console.error('Usuario creado pero sin ID:', user.toJSON());
        return res.status(500).json({ message: 'Error al crear el usuario: ID no generado.' });
      }
      
      try {
        const academico = await Academico.create({
          idusuario: user.idusuario,
          idcarrera: validatedCarreraId,
          idfacultad: validatedFacultadId
        });
        console.log('Académico creado:', academico.toJSON());
      } catch (academicoError) {
        console.error('Error al crear académico:', academicoError);
        throw academicoError;
      }
    }

    const token = generateToken(user.idusuario);
    res.status(201).json({
      token,
      user: {
        id: user.idusuario,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        role: user.role,
        habilitado: user.habilitado,
        ...(role === 'academico' && { idcarrera: validatedCarreraId })
      },
    });

  } catch (error) {
    console.error('Error en registerUser:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Error de validación', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error del servidor durante el registro.' });
  }
};
export const  registerUserStudent = async (req, res) => {
   const models = await getModels();
  const User = models.User;
  const Academico = models.Academico;
  const Estudiante = models.Estudiante; 
  const Carrera = models.Carrera;
  const Facultad = models.Facultad;
  
  const {
    userName,
    nombre,
    apellidopat, 
    apellidomat, 
    email, 
    contrasenia, 
    role, 
    habilitado = 1,
    idcarrera,
    idfacultad,
    // 🔥 AÑADIDO: Aceptar múltiples variaciones del nombre del campo
    carrera_id,
    carreraId,
    facultad_id,
    facultadId,
  } = req.body;

  const username = req.body.username || req.body.userName;
  
  try {
    if (!username || !contrasenia || !email) {
      return res.status(400).json({ message: 'Por favor, proporciona nombre de usuario, contraseña y correo electrónico.' });
    }

    const userExistsByUserName = await User.findOne({ where: { username } });
    if (userExistsByUserName) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    const userExistsByEmail = await User.findOne({ where: { email } });
    if (userExistsByEmail) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // 🔥 MODIFICADO: Validar carrera y facultad para TANTO academico COMO student
    let validatedCarreraId = null;
    let validatedFacultadId = null;
    
    if (role === 'academico' || role === 'student') {
      // 🔥 Intentar obtener el ID de carrera de cualquier variación del campo
      const carreraIdFromRequest = idcarrera || carrera_id || carreraId;
      const facultadIdFromRequest = idfacultad || facultad_id || facultadId;
      
      console.log('🔍 DIAGNÓSTICO - Valores recibidos:');
      console.log('  - idcarrera:', idcarrera);
      console.log('  - carrera_id:', carrera_id);
      console.log('  - carreraId:', carreraId);
      console.log('  - idfacultad:', idfacultad);
      console.log('  - facultad_id:', facultad_id);
      console.log('  - facultadId:', facultadId);
      console.log('  - Carrera final:', carreraIdFromRequest);
      console.log('  - Facultad final:', facultadIdFromRequest);
      
      if (!carreraIdFromRequest) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: `idcarrera es requerido para el rol ${role}`, param: 'idcarrera' }]
        });
      }
      
      if (!facultadIdFromRequest) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: `idfacultad es requerido para el rol ${role}`, param: 'idfacultad' }]
        });
      }

      const cid = parseInt(carreraIdFromRequest);
      const fid = parseInt(facultadIdFromRequest);
      
      if (!cid || cid <= 0) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: 'idcarrera debe ser un número válido', param: 'idcarrera' }]
        });
      }
      
      if (!fid || fid <= 0) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: 'idfacultad debe ser un número válido', param: 'idfacultad' }]
        });
      }

      const carrera = await Carrera.findByPk(cid);
      const facultad = await Facultad.findByPk(fid);

      if (!carrera) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: 'Carrera no encontrada', param: 'idcarrera' }]
        });
      }
      
      if (!facultad) {
        return res.status(400).json({
          message: 'Error de validación',
          errors: [{ message: 'Facultad no encontrada', param: 'idfacultad' }]
        });
      }
      
      validatedCarreraId = cid;
      validatedFacultadId = fid;
      
      console.log('✅ Carrera y facultad validadas correctamente:');
      console.log('  - Carrera ID:', validatedCarreraId);
      console.log('  - Facultad ID:', validatedFacultadId);
    }

    // Crear el usuario
    const user = await User.create({
      username,
      contrasenia,
      email,
      nombre,
      apellidopat,
      apellidomat,
      role: role || 'student',
      habilitado: habilitado || '1',
    }, {
      returning: true
    });
    
    console.log('✅ USUARIO CREADO:', user.toJSON());

    // 🔥 MODIFICADO: Crear registro en tabla académico O estudiante según el rol
    if (role === 'academico' && validatedCarreraId && validatedFacultadId) {
      console.log('📚 Creando registro de ACADÉMICO...');
      console.log('  - ID del usuario:', user.idusuario);
      console.log('  - ID de carrera:', validatedCarreraId);
      console.log('  - ID de facultad:', validatedFacultadId);

      if (!user.idusuario) {
        console.error('❌ Usuario creado pero sin ID:', user.toJSON());
        return res.status(500).json({ message: 'Error al crear el usuario: ID no generado.' });
      }
      
      try {
        const academico = await Academico.create({
          idusuario: user.idusuario,
          idcarrera: validatedCarreraId,
          idfacultad: validatedFacultadId
        });
        console.log('✅ Académico creado:', academico.toJSON());
      } catch (academicoError) {
        console.error('❌ Error al crear académico:', academicoError);
        throw academicoError;
      }
    }
    
    // 🔥 AÑADIDO: Crear registro en tabla estudiante para rol student
    if (role === 'student' && validatedCarreraId && validatedFacultadId) {
      console.log('🎓 Creando registro de ESTUDIANTE...');
      console.log('  - ID del usuario:', user.idusuario);
      console.log('  - ID de carrera:', validatedCarreraId);
      console.log('  - ID de facultad:', validatedFacultadId);

      if (!user.idusuario) {
        console.error('❌ Usuario creado pero sin ID:', user.toJSON());
        return res.status(500).json({ message: 'Error al crear el usuario: ID no generado.' });
      }
      
      try {
        const estudiante = await Estudiante.create({
          idusuario: user.idusuario,
          idcarrera: validatedCarreraId,
          idfacultad: validatedFacultadId
        });
        console.log('✅ Estudiante creado:', estudiante.toJSON());
      } catch (estudianteError) {
        console.error('❌ Error al crear estudiante:', estudianteError);
        throw estudianteError;
      }
    }

    const token = generateToken(user.idusuario);
    res.status(201).json({
      token,
      user: {
        id: user.idusuario,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        role: user.role,
        habilitado: user.habilitado,
        ...((role === 'academico' || role === 'student') && { 
          idcarrera: validatedCarreraId,
          idfacultad: validatedFacultadId 
        })
      },
    });

  } catch (error) {
    console.error('❌ Error en registerUser:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Error de validación', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error del servidor durante el registro.' });
  }
};

export const loginUser = async (req, res) => {
  const models = await getModels();
  const User = models.User;

  console.log('---------------------------------------------------------------');
  console.log('Backend /api/auth/login - req.body recibido:', req.body);
  const { email, password } = req.body;
 
  try {
    if (!email || !password) {
      console.warn('BACKEND Validación fallida: email o password faltantes...');
      return res.status(400).json({ message: 'Por favor, proporciona correo electrónico y contraseña.' });
    }

    const user = await User.findOne({ where: { email } });
    
    console.log('LOGIN ATTEMPT - Usuario encontrado en BD:', user ? user.toJSON() : null); 
    
    if (!user) {
      console.warn(`Login attempt failed: User not found for email - ${email}`);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }
    console.log(`Login attempt: User found for email - ${email}, ID: ${user.idusuario}`);

    if (user.habilitado !== true && user.habilitado !== '1') {
        console.warn(`Login attempt failed: Account disabled for user ID - ${user.idusuario}`);
        return res.status(403).json({ message: 'Tu cuenta está deshabilitada. Contacta al administrador.' });
    }
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.warn(`Login attempt failed: Incorrect password for user ID - ${user.idusuario}`);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const token = generateToken(user.idusuario);

    console.log(`Login successful for user ID - ${user.idusuario}`);
    res.status(200).json({
      token,
      user: {
        id: user.idusuario,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Error in loginUser:', error);
    if (!res.headersSent) {
    res.status(500).json({ message: 'Error del servidor durante el inicio de sesión.' });
    }
  }
};


// @desc    Obtener datos del usuario actualmente logueado
// @route   GET /api/auth/me
// @access  Private (requiere token)
export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(404).json({ message: 'Usuario no encontrado o token inválido.' });
  }
  res.status(200).json(req.user);
};