require('dotenv').config();
const express = require('express');
const cors = require('cors');           // ← Agrega esta línea
const sequelize = require('./config/db'); // ← Ajusta la ruta si es necesario

const app = express();

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

// Tus otras rutas (login, etc.) van aquí...
// Ejemplo: app.post('/auth/login', tuControladorLogin);

// === PUERTO - CRÍTICO PARA RENDER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});