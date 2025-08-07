// Emergency notification component to force show notifications
// Add this temporarily to header.tsx to force debug production visibility

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

export function EmergencyNotificationDebug() {
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Force check notifications
    const checkNotifications = async () => {
      try {
        const unreadResponse = await fetch('/api/notifications/unread-count');
        const unreadData = await unreadResponse.json();
        
        const userResponse = await fetch('/api/auth/user');
        const userData = await userResponse.json();
        
        setDebugInfo({
          unreadCount: unreadData,
          user: userData,
          timestamp: new Date().toISOString(),
          location: window.location.href
        });
      } catch (error) {
        setDebugInfo({ error: error.message });
      }
    };
    
    checkNotifications();
  }, []);

  if (process.env.NODE_ENV !== 'production') {
    return null; // Only show in production for debugging
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999, 
      background: '#ff0000', 
      color: 'white', 
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <button 
        onClick={() => setShowDebug(!showDebug)}
        style={{ background: 'white', color: 'black', border: 'none', padding: '5px' }}
      >
        🔬 DEBUG NOTIFICATIONS
      </button>
      
      {showDebug && (
        <div style={{ marginTop: '10px', background: '#333', padding: '10px' }}>
          <h4>Debug Info:</h4>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          
          <div style={{ marginTop: '10px' }}>
            <h5>Normal Notification:</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bell size={20} />
              {debugInfo.unreadCount?.count > 0 && (
                <span style={{
                  background: '#ff0000',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px'
                }}>
                  {debugInfo.unreadCount.count}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 
USAGE: Add this to header.tsx temporarily:

import { EmergencyNotificationDebug } from './emergency-notification-fix';

// Add this line inside Header component JSX:
<EmergencyNotificationDebug />

This will show a red debug panel on production that will help us understand:
1. If the user is authenticated
2. If the notification count API is working
3. What the actual user data looks like
4. If there are any API errors

After debugging, remove this component.
*/