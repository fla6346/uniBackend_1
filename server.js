// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { startTelegramBot } from './bot.js';
import { profile } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Middleware básico (estos SÍ van antes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
/*app.use(cors({
  origin: '*', // En producción, especifica tu dominio
  credentials: true
}));*/
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', (req, res, next) => {
  console.log('Solicitud de archivo estático:', req.url);
  next();
});
// ✅ FUNCIÓN PRINCIPAL ASYNC
const startServer = async () => {
  try {
    // 1. Conectar a PostgreSQL
    const { sequelize, initModels } = await import('./models/index.js');
    await sequelize.authenticate();
    console.log('PostgreSQL Conectado Exitosamente.');

    // 2. Inicializar modelos y asociaciones
    const models = await initModels();
    console.log('Modelos y asociaciones inicializados correctamente.');

    const authRoutes = (await import('./routes/authRoutes.js')).default;
    const eventosRouter = (await import('./routes/eventos.js')).default;
    const categoryRoutes = (await import('./routes/categoryRoutes.js')).default;
    const locationRoutes = (await import('./routes/locationRoutes.js')).default;
    const userRoutes = (await import('./routes/userRoutes.js')).default;
    const recursosRouter = (await import('./routes/recursosRoutes.js')).default;
    const notificacionesRoutes = (await import('./routes/notificacionesRoutes.js')).default;
    const proyectosRoutes = (await import('./routes/proyectosRoutes.js')).default;
    const facultadesRoutes = (await import('./routes/facultadRoutes.js')).default;
    const dashboardRoutes = (await import('./routes/dashboardRoutes.js')).default;
    const croquisRoutes = (await import('./routes/croquisRoutes.js')).default;
    const profileRoutes = (await import('./routes/profileRoutes.js')).default;  
    const recursoRoutes = (await import('./routes/recursosRoutes.js')).default;
    const layoutsRoutes = (await import('./routes/layoutsRoutes.js')).default;
    const estudiantesRoutes = (await import('./routes/estudiantesRoutes.js')).default;
    app.use('/api/auth', authRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/locations', locationRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/eventos', eventosRouter);
    app.use('/api/proyectos', proyectosRoutes);
    app.use('/api/recursos', recursosRouter);
    app.use('/api/notificaciones', notificacionesRoutes);
    app.use('/api/facultades', facultadesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/croquis', croquisRoutes);
    app.use('/api/profile',profileRoutes);
    app.use('/api/recursos', recursoRoutes);
    app.use('/api/layouts',layoutsRoutes);
    app.use('/api/estudiantes',estudiantesRoutes);
    app.use('/uploads', express.static(path.join(__dirname,'uploads')));

    app.get('/api', (req, res) => {
      res.json({ message: 'API de Gestión de Eventos Universitarios Funcionando!' });
    });

    // Manejo de errores global
    app.use((err, req, res, next) => {
      console.error('Error no manejado:', err.stack);
      res.status(500).json({ message: 'Error interno del servidor', error: err.message });
    });

    // 4. Iniciar servidor
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      startTelegramBot();
    });

  } catch (err) {
    console.error('❌ Error crítico al iniciar la aplicación:', err);
    process.exit(1);
  }
};

startServer();
