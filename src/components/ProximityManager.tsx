// components/ProximityManager.tsx
import React, { useEffect } from 'react';

interface Props {
  proximityMeters?: number;
}

const ProximityManager: React.FC<Props> = ({ proximityMeters = Number(process.env.NEXT_PUBLIC_DEFAULT_PROXIMITY_METERS || 100) }) => {
  
  useEffect(() => {
    function onProximity(e: any) {
      const { distance, taskId } = e?.detail || {};
      showNotification(`Nearby: You're ${distance}m away`, { body: 'You are near a location for one of your tasks.', tag: `${taskId}_proximity` });
    }

    async function handleExitProximity(e: any) {
      const payload = e?.detail || {};
      const taskId = payload.taskId;
      const actions = [{ action: 'yes', title: 'Yes' }, { action: 'no', title: 'Not Yet' }];
      showNotification('Did you complete the task?', { body: `Tap "Yes" if you completed it.`, actions, tag: taskId, requireInteraction: true, data: { taskId } });
    }

    window.addEventListener('gremind:proximity', onProximity);
    window.addEventListener('gremind:exit-proximity', handleExitProximity);

    return () => {
      window.removeEventListener('gremind:proximity', onProximity);
      window.removeEventListener('gremind:exit-proximity', handleExitProximity);
    };
  }, []);

  function showNotification(title: string, options: any = {}) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'showNotification', payload: { title, options } });
      } else {
         try {
           new Notification(title, options);
         } catch (err) {
            console.warn('Notification error from page:', err);
         }
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  return null;
};

export default ProximityManager;
