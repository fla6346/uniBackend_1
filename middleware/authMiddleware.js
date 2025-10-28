
import jwt from 'jsonwebtoken';
import {User} from '../config/db.js';
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

export const protect1 = asyncHandler( async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado, usuario no encontrado con ese token' });
    }
    next(); // Move to the next middleware/route handler
  } catch (error) {
    console.error('Error en middleware protect:', error);
    // Differentiate between token errors and other errors if needed
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'No autorizado, token inválido o expirado' });
    }
    return res.status(401).json({ message: 'No autorizado, token falló' }); // Generic error for other issues
  }
});

export const authorize1 = (roles) => {
  return (req, res, next) => {
    console.log('AUTHORIZE: Checking authorization for roles:', roles); // DEBUG
    console.log('AUTHORIZE: Current user (from req.user):', req.user ? req.user.id : 'No user object'); // DEBUG
    console.log('AUTHORIZE: Current user role:', req.user ? req.user.role : 'No role found'); // DEBUG

    if (!req.user || !req.user.role) {
        console.log('AUTHORIZE: Access denied - No user or role defined.'); // DEBUG
        return res.status(403).json({ message: 'Acceso denegado. Rol no definido o usuario no autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      console.log(`AUTHORIZE: Access denied - Role '${req.user.role}' not in allowed roles: ${roles.join(', ')}`); // DEBUG
      return res.status(403).json({ message: `Acceso denegado. Rol '${req.user.role}' no tiene permiso para este recurso.` });
    }
    console.log('AUTHORIZE: Access granted for role:', req.user.role); // DEBUG
    next();
  };
};
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, no hay token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.idusuario, { // ← Asegúrate de usar el campo correcto (idusuario)
      attributes: { exclude: ['contrasenia'] } // ← Nombre correcto de la columna en tu DB
    });

    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
    }
    next();
  } catch (error) {
    console.error('Error en middleware protect:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    return res.status(401).json({ message: 'Error al verificar el token' });
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

