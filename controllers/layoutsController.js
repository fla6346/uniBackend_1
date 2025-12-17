// controllers/layoutsController.js
import { getModels } from '../models/index.js';
import asyncHandler from 'express-async-handler';

export const crearLayout = asyncHandler(async (req, res) => {
  try {
    const { nombre } = req.body;
    const imagen = req.file;

    if (!nombre?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre del layout es requerido' 
      });
    }

    if (!imagen) {
      return res.status(400).json({ 
        success: false, 
        message: 'La imagen del layout es requerida' 
      });
    }

    const models = await getModels();
    const { Layout } = models;

    const nuevoLayout = await Layout.create({
      nombre: nombre.trim(),
      url_imagen: imagen.filename 
    });

    res.status(201).json({ 
      success: true, 
      message: 'Layout creado exitosamente',
      layout: {
        id: nuevoLayout.idlayout,
        nombre: nuevoLayout.nombre,
        url_imagen: nuevoLayout.url_imagen,
        imagenUrl: `${req.protocol}://${req.get('host')}/uploads/${imagen.filename}`
      }
    });

  } catch (error) {
    console.error('Error al crear layout:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo es demasiado grande (máximo 5MB)' 
      });
    }

    if (error.message === 'Solo se permiten imágenes') {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se permiten archivos de imagen (jpg, png, etc.)' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al crear el layout' 
    });
  }
});

export const obtenerLayouts = asyncHandler(async (req, res) => {
  const models = await getModels();
  const { Layout } = models;

  const layouts = await Layout.findAll({
    attributes: ['idlayout', 'nombre', 'url_imagen'],
    order: [['createdAt', 'DESC']]
  });

  // CORRECCIÓN: Construir la URL completa correctamente
  const layoutsConUrlCompleta = layouts.map(layout => {
    // Limpiar el nombre del archivo de cualquier prefijo de ruta
    const filename = layout.url_imagen.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
    
    const imagenUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    
    console.log('Layout:', layout.nombre, 'URL generada:', imagenUrl);
    
    return {
      idlayout: layout.idlayout,
      nombre: layout.nombre,
      url_imagen: layout.url_imagen,
      imagenUrl: imagenUrl
    };
  });

  res.json(layoutsConUrlCompleta);
});