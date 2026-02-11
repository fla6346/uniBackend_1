
import jwt from 'jsonwebtoken';
import {getModels} from '../models/index.js';
import asyncHandler from 'express-async-handler';
import 'dotenv/config';


export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const protect = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const models = await getModels();
    const User = models.User;

    const user = await User.findByPk(decoded.idusuario); // ✅ Usa 'decoded.id'
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (user.habilitado !== '1') {
      return res.status(401).json({ error: 'Usuario deshabilitado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en protect:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Error de autenticación' });
  }
};

export const protect1 = asyncHandler(async (req, res, next) => {
  console.log('🔐 [Middleware protect] URL:', req.url);
  console.log('   Headers:', req.headers.authorization ? '✅ Token presente' : '❌ Token ausente');

  let token;

  // 1. Extraer token del header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('   Token extraído (primeros 20 chars):', token.substring(0, 20) + '...');
  }

  if (!token) {
    console.log('   ❌ Error: No se proporcionó token');
    return res.status(401).json({ 
      error: 'Token de autorización requerido',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    // 2. Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('   ✅ Token decodificado:', JSON.stringify(decoded));

    // 3. Obtener modelo correcto (USUARIO, no User)
    const models = await getModels();
    const { User } = models; // ✅ CORRECTO: Modelo se llama 'Usuario'

    if (!User) {
      console.error('   ❌ Error: Modelo Usuario no encontrado en models');
      return res.status(500).json({ 
        error: 'Error interno: Modelo de usuario no disponible',
        code: 'MODEL_NOT_FOUND'
      });
    }

    // 4. Buscar usuario en BD (usa 'id' o 'idusuario' según tu token)
    const userId = decoded.id || decoded.idusuario; // ✅ Maneja ambos casos
    console.log('   Buscando usuario con ID:', userId);

    const user = await User.findByPk(userId, { raw: true });

    if (!user) {
      console.log('   ❌ Error: Usuario no encontrado en base de datos');
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // 5. Verificar si usuario está habilitado
    if (user.habilitado !== '1' && user.habilitado !== 1 && user.habilitado !== true) {
      console.log('   ❌ Error: Usuario deshabilitado');
      return res.status(401).json({ 
        error: 'Usuario deshabilitado',
        code: 'USER_DISABLED'
      });
    }

    // 6. Adjuntar usuario a la request
    req.user = user;
    console.log('   ✅ Usuario autenticado:', user.nombre || user.email || user.idusuario);
    
    next();
  } catch (error) {
    console.error('   ❌ Error en middleware protect:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(401).json({ 
      error: 'Error de autenticación',
      code: 'AUTH_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Acceso denegado. Rol no definido.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Acceso denegado. Rol '${req.user.role}' no autorizado.` });
    }
    next();
  };
};

