// backend/server.js
require('dotenv').config();

console.log('🔍 Configuración de BD actual:');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);

const express = require('express');
const cors = require('cors');
const path = require('path');
const { startTelegramBot } = require('./bot.js');

const app = express();

// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const startServer = async () => {
  try {
  const modelsModule = require('./models/index.js');
    const { initModels } = modelsModule;
    
    console.log('🔄 Inicializando modelos y conexión a PostgreSQL...');
    const result = await initModels(); // ← Esto crea _sequelize dentro de models/index.js
    
    // 🔑 PASO 2: Ahora sí obtener sequelize del resultado
    const sequelize = result.sequelize;
    
    if (!sequelize) {
      throw new Error('❌ sequelize no está disponible después de initModels()');
    }
    
    console.log('✅ PostgreSQL Conectado Exitosamente (vía initModels).');

    // 3. Rutas
    app.use('/api/auth', require('./routes/authRoutes.js'));
    app.use('/api/categories', require('./routes/categoryRoutes.js'));
    app.use('/api/locations', require('./routes/locationRoutes.js'));
    app.use('/api/users', require('./routes/userRoutes.js'));
    app.use('/api/eventos', require('./routes/eventos.js'));
    app.use('/api/proyectos', require('./routes/proyectosRoutes.js'));
    app.use('/api/recursos', require('./routes/recursosRoutes.js'));
    app.use('/api/notificaciones', require('./routes/notificacionesRoutes.js'));
    app.use('/api/facultades', require('./routes/facultadRoutes.js'));
    app.use('/api/dashboard', require('./routes/dashboardRoutes.js'));
    app.use('/api/croquis', require('./routes/croquisRoutes.js'));
    app.use('/api/profile', require('./routes/profileRoutes.js'));
    app.use('/api/layouts', require('./routes/layoutsRoutes.js'));
    app.use('/api/estudiantes', require('./routes/estudiantesRoutes.js'));

    // Ruta de salud
    app.get('/api', (req, res) => {
      res.json({ message: 'API de Gestión de Eventos Universitarios Funcionando!' });
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error('❌ Error no manejado:', err.stack);
      res.status(500).json({ message: 'Error interno del servidor', error: err.message });
    });

    // 4. Iniciar servidor
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
      if (process.env.TELEGRAM_TOKEN) {
        startTelegramBot();
      } else {
        console.log('⚠️ Telegram Bot: TELEGRAM_TOKEN no configurado');
      }
    });

  } catch (err) {
    console.error('❌ Error crítico al iniciar la aplicación:', err);
    process.exit(1);
  }
};

startServer();