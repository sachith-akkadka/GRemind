
'use client';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
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

export const scheduleNotification = (title: string, options: NotificationOptions, delay: number) => {
    if (delay < 0) return; // Don't schedule for past events

    setTimeout(() => {
        if (Notification.permission === 'granted') {
            new Notification(title, options);
        }
    }, delay);
};

export const showNotification = (title: string, options: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    }
}
