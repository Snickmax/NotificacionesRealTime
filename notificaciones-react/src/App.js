import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './styles.css';

const socket = io('http://localhost:4000');
const USERS = ['user1', 'user2', 'user3', 'user4'];

function UserComponent({ userId }) {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewedNotifications, setViewedNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:4000/notifications/${userId}`);
        const data = await response.json();
        console.log("Notificaciones cargadas:", data);

        const unread = data.filter(notification => notification.status === "no visto");
        const read = data.filter(notification => notification.status === "visto");
        setViewedNotifications(read);
        setUnreadNotifications(unread);
        setUnreadCount(unread.length);
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
      }
    };
    fetchNotifications();
  }, [userId]);

  const toggleConnection = () => {
    if (isConnected) {
      socket.emit('disconnectUser', userId);
      setIsConnected(false);
      setUnreadCount(unreadNotifications.length);
    } else {
      socket.emit('connectUser', userId);
      setIsConnected(true);
      setUnreadCount(unreadNotifications.length);
    }
  };

  useEffect(() => {
    const handleNotification = (notification) => {
      if (isConnected) {
        setViewedNotifications((prev) => [...prev, notification]);
      } else {
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

  const handleBellClick = async () => {

    const updatedNotifications = unreadNotifications.map(notif => ({
      ...notif,
      status: "visto"
    }));

    console.log("Notificaciones actualizadas para marcar como vistas:", updatedNotifications, userId);

    setViewedNotifications(prev => [...prev, ...updatedNotifications]);
    setUnreadNotifications([]);
    setUnreadCount(0);

    try {
      const response = await fetch(`http://localhost:4000/notifications/markAsRead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: userId, notifications: updatedNotifications })
      });
      if (!response.ok) throw new Error("Error al marcar como visto en el backend");
      console.log("Notificaciones marcadas como vistas en el backend");
    } catch (error) {
      console.error("Error al marcar como visto:", error);
    }
  };

  const clearNotifications = async () => {
    if (viewedNotifications.length === 0) return;

    try {
      const response = await fetch(`http://localhost:4000/notifications/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          notifications: viewedNotifications // Aquí enviamos todas las notificaciones a eliminar
        })
      });

      if (!response.ok) throw new Error("Error al eliminar notificaciones en el backend");

      console.log("Notificaciones eliminadas en el backend");

      // Limpia las notificaciones en el frontend
      setViewedNotifications([]);
    } catch (error) {
      console.error("Error al eliminar notificaciones:", error);
    }
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
          <button className="clear-button" onClick={clearNotifications} disabled={!isConnected}>
            Limpiar
          </button>
        </div>
        <div className="notifications-list">
          {viewedNotifications.map((notif, index) => (
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
