
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

