require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PORT = process.env.PORT || 3001;

// 🔍 DEBUG
console.log('🔍 [DEBUG] DB_USER:', process.env.DB_USER ? '***' : 'undefined');
console.log('🔍 [DEBUG] DB_HOST:', process.env.DB_HOST);
console.log('🔍 [DEBUG] DB_NAME:', process.env.DB_NAME);
console.log('🔍 [DEBUG] PORT:', PORT);

const FRONTEND_PATH = path.join(__dirname, '../public_html/frontendEvento.cidtec-uc.com');
console.log('🔍 [DEBUG] FRONTEND_PATH:', FRONTEND_PATH);

app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://evento.cidtec-uc.com',
      'https://evento.cidtec-uc.com',
      'http://cidtec-uc.com',
      'https://cidtec-uc.com',
      'http://localhost:3000',
      'http://localhost:8081',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS origen no listado (permitido igual):', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(FRONTEND_PATH));




app.use('/uploads', (req, res, next) => {
  console.log('📁 Solicitud de archivo:', req.url);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// RUTAS FRONTEND (HTML)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'index.html')));
app.get('/Login', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'Login.html')));
app.get('/Home', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'Home.html')));
app.get('/HomeAdministrador', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'HomeAdministrador.html')));
app.get('/chatbot', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'chatbot.html')));

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================
const startServer = async () => {
  try {
    const { initModels } = require('./models/index.js');
    const { sequelize, models } = await initModels();

    console.log('✅ PostgreSQL Conectado Exitosamente.');
    console.log('✅ Modelos y asociaciones inicializados correctamente.');

    app.use('/auth',          require('./routes/authRoutes.js'));
    app.use('/categories',    require('./routes/categoryRoutes.js'));
    app.use('/locations',     require('./routes/locationRoutes.js'));
    app.use('/users',         require('./routes/userRoutes.js'));
    app.use('/eventos',       require('./routes/eventos.js'));
    app.use('/proyectos',     require('./routes/proyectosRoutes.js'));
    app.use('/recursos',      require('./routes/recursosRoutes.js'));
    app.use('/notificaciones',require('./routes/notificacionesRoutes.js'));
    app.use('/facultades',    require('./routes/facultadRoutes.js'));
    app.use('/dashboard',     require('./routes/dashboardRoutes.js'));
    app.use('/croquis',       require('./routes/croquisRoutes.js'));
    app.use('/profile',       require('./routes/profileRoutes.js'));
    app.use('/layouts',       require('./routes/layoutsRoutes.js'));
    app.use('/estudiantes',   require('./routes/estudiantesRoutes.js'));
    app.use('/bot',           require('./routes/botRoutes.js'));

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: '✅ API Funcionando!', timestamp: new Date().toISOString() });
    });

    app.get('/test-api', (req, res) => {
      res.json({ ok: true, message: '✅ Rutas funcionando!' });
    });
    

    app.use((err, req, res, next) => {
      console.error('❌ Error no manejado:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        original: err.original?.message,
        parent: err.parent?.message
      });
      res.status(500).json({
        message: 'Error interno del servidor',
        error: err.message,
        details: process.env.NODE_ENV === 'development'
          ? (err.original?.message || err.parent?.message)
          : undefined
      });
    });

    // ← app.listen llama al bot UNA sola vez, sin re-importar
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log('🤖 Telegram Bot iniciado');
    });

  } catch (err) {
    console.error('❌ Error crítico al iniciar:', err);
    if (err.name === 'SequelizeConnectionError') {
      console.error('💡 Verifica DB_HOST, DB_NAME, DB_USER, DB_PASSWORD en .env');
    }
    process.exit(1);
  }
};

startServer();