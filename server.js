// server.js
require('express');
const express = require('express');
const sequelize = require('./config/db'); // ← Ajusta la ruta si es necesario

const app = express();
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

// === PUERTO - CRÍTICO PARA RENDER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});