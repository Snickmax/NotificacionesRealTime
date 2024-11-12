import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

const socket = io('http://localhost:4000');
const USERS = ['user1', 'user2', 'user3', 'user4'];

function UserComponent({ userId }) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewedNotifications, setViewedNotifications] = useState([]);

  // Función para conectar/desconectar usuario
  const toggleConnection = () => {
    if (isConnected) {
      socket.emit('disconnectUser', userId);
      setIsConnected(false);
      setUnreadCount(unreadNotifications.length); // Mantener conteo si se desconecta
    } else {
      socket.emit('connectUser', userId);
      setIsConnected(true);
      setUnreadCount(unreadNotifications.length); // Restaurar conteo al reconectar
    }
  };

  // Escuchar notificaciones en tiempo real solo si está conectado
  useEffect(() => {
    const handleNotification = (notification) => {
      if (isConnected) {
        // Mostrar notificación si está conectado
        setNotifications((prev) => [...prev, notification]);
      } else {
        // Almacenar en no vistas si está desconectado
        setUnreadNotifications((prev) => [...prev, notification]);
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on(`receiveNotification_${userId}`, handleNotification);
    socket.on('receiveNotification', handleNotification);

    return () => {
      socket.off(`receiveNotification_${userId}`, handleNotification);
      socket.off('receiveNotification', handleNotification);
    };
  }, [isConnected, userId]);

  // Mostrar mensajes no vistos al pulsar la campana
  const handleBellClick = () => {
    if (!isConnected) return; // Evitar pulsar cuando está desconectado
    setNotifications((prev) => [...prev, ...unreadNotifications]);
    setViewedNotifications((prev) => [...prev, ...unreadNotifications].slice(-20));
    setUnreadNotifications([]);
    setUnreadCount(0);
  };

  // Limpiar las notificaciones vistas
  const clearNotifications = () => {
    setNotifications([]);
    setViewedNotifications([]);
  };

  return (
    <div className="user-box">
      <div className="user-info">
        <div className="user-avatar"></div>
        <div className="status-indicator" style={{ backgroundColor: isConnected ? 'green' : 'red' }}></div>
        <button className="connect-button" onClick={toggleConnection}>
          {isConnected ? 'Desconectar' : 'Conectar'}
        </button>
      </div>
      <div className="notifications-box">
        <div className="notifications-header">
          <span>Notificaciones</span>
          <button
            className="clear-button"
            onClick={handleBellClick}
            disabled={!isConnected}
          >
            <i className="bell-icon">🔔</i>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          <button className="clear-button" onClick={clearNotifications}>
            Limpiar
          </button>
        </div>
        <div className="notifications-list">
          {/* Historial de notificaciones vistas */}
          {viewedNotifications.map((notif, index) => (
            <div key={index} className="notification-item">
              {notif.message}
            </div>
          ))}
          {/* Mostrar las últimas 20 notificaciones */}
          {notifications.slice(-20).map((notif, index) => (
            <div key={index} className="notification-item">
              {notif.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="container">
      <h2>Usuarios</h2>
      <div className="user-grid">
        {USERS.map((user) => (
          <UserComponent key={user} userId={user} />
        ))}
      </div>
    </div>
  );
}

export default App;
