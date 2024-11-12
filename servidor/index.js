const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = 4000;
const users = {};

function sendRandomNotification() {
  const userIds = Object.keys(users);
  if (userIds.length === 0) return;

  const randomIndex = Math.floor(Math.random() * userIds.length);
  const randomUser = userIds[randomIndex];
  const isGlobal = Math.random() > 0.5;

  const message = isGlobal
    ? 'Mensaje global para todos los usuarios.'
    : `Notificación privada para ${randomUser}.`;

  if (isGlobal) {
    io.emit('receiveNotification', { message });
    console.log(`receiveNotification_Global`);
  } else {
    io.to(users[randomUser]).emit(`receiveNotification_${randomUser}`, { message });
    console.log(`receiveNotification_${randomUser}`);
  }
}

io.on('connection', (socket) => {
  socket.on('connectUser', (userId) => {
    users[userId] = socket.id;
    console.log(`Usuario ${userId} conectado.`);
  });

  socket.on('disconnectUser', (userId) => {
    // delete users[userId];
    console.log(`Usuario ${userId} desconectado.`);
  });

  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find((key) => users[key] === socket.id);
    if (disconnectedUser) {
      delete users[disconnectedUser];
      console.log(`Usuario ${disconnectedUser} desconectado.`);
    }
  });
});

setInterval(sendRandomNotification, 5000);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
