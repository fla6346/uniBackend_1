// backend/controllers/authController.js
import { User,Facultad,Academico } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// Función para generar JWT (sin cambios)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
    console.log('------------------- authController.js - registerUser INICIO -------------------');
    console.log('REQ.BODY COMPLETO:', JSON.stringify(req.body, null, 2));
  
    const {
        userName,
        nombre,
        apellidopat, 
        apellidomat, 
        email, 
        contrasenia, 
        role, 
        habilitado,
        facultad_id
    } = req.body;

    const username = req.body.username || req.body.userName;
    
    // Validar que facultad_id exista
    if (facultad_id) {
      const facultad = await Facultad.findByPk(facultad_id);
      if (!facultad) {
        return res.status(400).json({ message: 'Error de validación', errors: [{ message: 'Facultad no encontrada' }] });
      }
    }
    if (role === 'academico' && !facultad_id) {
      return res.status(400).json({ message: 'Error de validación', errors: [{ message: 'facultad_id es requerido para el rol academico' }] });
    }
    try {
        // 3. Valida los datos de entrada usando la variable normalizada 'username'.
        if (!username || !contrasenia || !email) {
            return res.status(400).json({ message: 'Por favor, proporciona nombre de usuario, contraseña y correo electrónico.' });
        }

        // 4. Busca en la base de datos usando la clave correcta del modelo ('username').
        const userExistsByUserName = await User.findOne({ where: { username: username } });
        if (userExistsByUserName) {
            return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
        }

        const userExistsByEmail = await User.findOne({ where: { email } });
        if (userExistsByEmail) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        // 5. Crea el usuario usando la clave correcta del modelo ('username').
        //    El hook 'beforeCreate' en el modelo se encargará de hashear la contraseña.
        const user = await User.create({
            username: username, // <-- Se usa la variable normalizada
            contrasenia,
            email,
            nombre,
            apellidopat,
            apellidomat,
            role: role || 'student',
            habilitado: habilitado || '1',
        });
        if (role === 'academico') {
      await Academico.create({
        user_id: user.idusuario,
        facultad_id
      });
    }
        if (user) {
            // 6. Genera el token y responde.
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
                },
            });
        } else {
            res.status(400).json({ message: 'Datos de usuario inválidos, no se pudo crear el usuario.' });
        }
    } catch (error) {
        console.error('Error en registerUser:', error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Error de validación', errors: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: 'Error del servidor durante el registro.' });
    }
};

export const loginUser = async (req, res) => {
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