
'use client';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }
   if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return true;
    }
  }

  return false;
};

// This function now uses the service worker to show notifications
export const showNotification = async (title: string, options: NotificationOptions) => {
    if (Notification.permission !== 'granted' || !('serviceWorker' in navigator)) {
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, options);
    } catch (e) {
        console.error('Error showing notification', e);
    }
}
