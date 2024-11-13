const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors()); // Permitir CORS para todas las rutas y todos los orígenes
app.use(express.json()); // Esto permite que el backend reciba JSON


const PORT = 4000;
const users = {};

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/realtime_notifications', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// Esquema de Notificaciones
const notificationSchema = new mongoose.Schema({
  userId: String,
  message: String,
  status: { type: String, enum: ['visto', 'no visto'], default: 'no visto' },
  timestamp: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Lista de usuarios conectados con su estado
const userStatus = {};

// Función para enviar notificación aleatoria
async function sendRandomNotification() {
  const userIds = Object.keys(users);
  if (userIds.length === 0) return;

  const randomIndex = Math.floor(Math.random() * userIds.length);
  const randomUser = userIds[randomIndex];
  const isGlobal = Math.random() > 0.5;

  const message = isGlobal
    ? 'Mensaje global para todos los usuarios.'
    : `Notificación privada para ${randomUser}.`;

  if (isGlobal) {
    for (const userId of userIds) {
      const status = userStatus[userId] ? 'visto' : 'no visto';

      // Guardar notificación en la BD
      await new Notification({
        userId,
        message,
        status,
      }).save();
    }

    io.emit('receiveNotification', { message });
    console.log(`receiveNotification_Global`);
  } else {
    // Notificación privada
    const status = userStatus[randomUser] ? 'visto' : 'no visto';

    // Guardar notificación en la BD
    await new Notification({
      userId: randomUser,
      message,
      status,
    }).save();

    io.to(users[randomUser]).emit(`receiveNotification_${randomUser}`, { message });
    console.log(`receiveNotification_${randomUser}`);
  }
}

app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = await Notification.find({ userId }).sort({ timestamp: -1 }).limit(20);
    res.json(notifications);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

// backend/server.js o el archivo de tu servidor
app.post('/notifications/markAsRead', async (req, res) => {
  const { userId, notifications } = req.body;
  try {
    await Notification.updateMany(
      { userId, _id: { $in: notifications.map(n => n._id) } },
      { $set: { status: "visto" } }
    );
    res.sendStatus(200);
  } catch (error) {
    console.error("Error al marcar notificaciones como vistas:", error);
    res.status(500).json({ error: "Error al actualizar estado de notificaciones" });
  }
});

app.post('/notifications/delete', async (req, res) => {
  const { userId, notifications } = req.body;

  if (!userId || !notifications || !Array.isArray(notifications)) {
    return res.status(400).json({ error: 'Datos incompletos o incorrectos.' });
  }

  try {
    // Elimina las notificaciones especificadas de la base de datos
    await Notification.deleteMany({
      _id: { $in: notifications.map(n => n._id) },
      userId: userId
    });

    res.json({ message: 'Notificaciones eliminadas correctamente.' });
  } catch (error) {
    console.error('Error al eliminar notificaciones:', error);
    res.status(500).json({ error: 'Error al eliminar notificaciones' });
  }
});


// Manejo de eventos de conexión de socket
io.on('connection', (socket) => {
  socket.on('connectUser', (userId) => {
    users[userId] = socket.id;
    userStatus[userId] = true; // Usuario conectado
    console.log(`Usuario ${userId} conectado.`);
  });

  socket.on('disconnectUser', (userId) => {
    userStatus[userId] = false
    // delete users[userId];
    console.log(`Usuario ${userId} desconectado.`);
  });

  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find((key) => users[key] === socket.id);
    if (disconnectedUser) {
      userStatus[disconnectedUser] = false;
      delete users[disconnectedUser];
      console.log(`Usuario ${disconnectedUser} desconectado.`);
    }
  });
});

setInterval(sendRandomNotification, 5000);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
