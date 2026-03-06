require('dotenv').config();
const express = require('express');
const cors = require('cors');   
const { initModels } = require('./models');        // ← Agrega esta línea
const sequelize = require('./config/db'); // ← Ajusta la ruta si es necesario
const path = require('path');
const app = express();
const  {iniciarCronJobs}  = require('./utils/cronJobs.js'); // ← Agrega esta línea

(async () => {
  try {
    await initModels();
    console.log('🚀 Modelos y conexión DB inicializados OK');
    iniciarCronJobs(); 
   } catch (err) {
    console.error('❌ Fallo crítico al inicializar modelos/DB:', err.message);
    process.exit(1);
  }
})();

// === Configuración de CORS (¡esto resuelve tu error!) ===
app.use(cors({
  origin: [
    'https://unifrontend.onrender.com',     // tu frontend en Render (cambia el nombre si es diferente)
    'http://localhost:19006',               // Expo web local (para desarrollo)
    'http://localhost:3000',                // pruebas en browser
    '*'                                     // ← temporal para debug (quítalo después por seguridad)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,                        // si usas cookies o tokens con credentials
  optionsSuccessStatus: 204
}));

// Alternativa súper simple para probar YA (menos segura, pero útil ahora):
// app.use(cors());   // permite TODOS los orígenes

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// === Rutas de ejemplo ===
app.get('/', (req, res) => {
  res.json({ status: 'API funcionando ✅' });
});

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'BD conectada ✅' });
  } catch (error) {
    res.status(500).json({ status: 'BD error ❌', error: error.message });
  }
});

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});