// app.js (o como se llame tu archivo principal)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path'; 
import { fileURLToPath } from 'url'; 

import { connectDB,Recurso } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import eventosRouter from './routes/eventos.js'; // CORRECCIÓN: Importamos el router de eventos
import categoryRoutes from './routes/categoryRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import recursosRouter from './routes/recursosRoutes.js';
import notificacionesRoutes from './routes/notificacionesRoutes.js'
import proyectosRoutes from './routes/proyectosRoutes.js';
import { startTelegramBot } from './bot.js';

const app = express();
app.set('models',{Recurso});

// --- CORRECCIÓN: Configuración para obtener __dirname con ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors()); // Habilitar CORS para todas las peticiones
app.use(express.json()); // Para parsear cuerpos de petición JSON
app.use(express.urlencoded({ extended: true }));


connectDB()
.then(async () => { // Mueve la lógica aquí
  console.log('Conexión a la base de datos exitosa.');
  const count = await Recurso.count();
  if (count === 0) {
    await Recurso.create({
      nombre_recurso: 'Proyector',
      recurso_tipo: 'Tecnología'
    });
    console.log('Recurso de prueba creado');
  }
})
.catch(err => {
  console.error('Falló la conexión a la base de datos:', err);
  process.exit(1);
});

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/eventos', eventosRouter)
app.use('/api/proyectos',proyectosRoutes);
app.use('/api/recursos', recursosRouter);
app.use('/api/notificaciones', notificacionesRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'API de Gestión de Eventos Universitarios Funcionando!' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Algo salió mal en el servidor!', error: err.message });
});

// --- Iniciar el Servidor ---
const PORT = process.env.PORT || 3001;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  startTelegramBot();
});
