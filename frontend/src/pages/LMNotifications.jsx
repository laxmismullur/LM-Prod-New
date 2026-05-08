import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  FileText,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useLMAuth } from '../context/LMAuthContext';
import { useNavigate } from 'react-router-dom';

export default function LMNotifications() {
  const { logout } = useLMAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleAuthError = (err) => {
    if (err.response?.status === 401) {
      setError('Your session has expired. Please login again.');
      logout();
      setTimeout(() => navigate('/login'), 2000);
      return true;
    }
    if (err.response?.status === 403) {
      setError('Notifications are available only for patient accounts.');
      return true;
    }
    return false;
  };

  const loadNotifications = async () => {
    try {
      setError(null);
      setLoading(true);

      const [notificationsRes, countRes] = await Promise.all([
        LMApi.getMyNotifications(),
        LMApi.getUnreadNotificationCount()
      ]);

      setNotifications(notificationsRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);

      if (!handleAuthError(err)) {
        setError('Failed to load notifications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await LMApi.markNotificationAsRead(id);
      loadNotifications();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError('Failed to mark notification as read');
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      await LMApi.markAllNotificationsAsRead();
      loadNotifications();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError('Failed to mark all as read');
      }
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await LMApi.deleteNotification(id);
      loadNotifications();
    } catch (err) {
      if (!handleAuthError(err)) {
        setError('Failed to delete notification');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 18 };
    switch (type) {
      case 'APPOINTMENT_BOOKED':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_REMINDER':
        return <CalendarDays {...iconProps} />;
      case 'APPOINTMENT_RESCHEDULED':
        return <RefreshCw {...iconProps} />;
      case 'MEDICAL_RECORD_UPDATE':
        return <FileText {...iconProps} />;
      case 'BILLING_UPDATE':
        return <CreditCard {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading notifications...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          background: '#7f1d1d',
          border: '1px solid #dc2626',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <AlertCircle size={24} color="#ef4444" />
          <div>
            <h3 style={{ color: '#fca5a5', marginBottom: '4px' }}>Error</h3>
            <p style={{ color: '#f87171' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            <Bell size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Notifications
          </h1>
          <p>{notifications.length} notifications - {unreadCount} unread</p>
        </div>

        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllAsRead}>
            <Check size={14} /> Mark All as Read
          </button>
        )}
      </div>

      <div className="notifications-container">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} color="#94a3b8" />
            <h3>No notifications yet</h3>
            <p>You'll receive notifications about your appointments, medical records, billing, and profile updates here.</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="notification-content">
                <div className="notification-header">
                  <h4>{notification.title}</h4>
                  <span className="notification-time">
                    <Clock size={12} />
                    {formatDate(notification.createdAt)}
                  </span>
                </div>

                <p className="notification-message">{notification.message}</p>

                <div className="notification-meta">
                  <span className="sender">From: {notification.senderName}</span>
                  <span className={`type-badge type-${notification.type.toLowerCase()}`}>
                    {notification.type.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="notification-actions">
                {!notification.read && (
                  <button
                    className="btn btn-sm"
                    onClick={() => markAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => deleteNotification(notification.id)}
                  title="Delete notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
