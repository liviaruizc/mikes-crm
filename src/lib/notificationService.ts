import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function requestNotificationPermissions(): Promise<boolean> {
  // Only request on native platforms
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

export async function scheduleAppointmentNotification(
  appointmentId: string,
  customerName: string,
  appointmentTime: Date,
  appointmentTitle?: string
) {
  // Only schedule on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Notifications only work on native platforms');
    return;
  }

  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return;
    }

    // Schedule notification 24 hours before appointment
    const notificationTime = new Date(appointmentTime);
    notificationTime.setHours(notificationTime.getHours() - 24);

    // Only schedule if notification time is in the future
    if (notificationTime <= new Date()) {
      console.log('Appointment is too soon to schedule a 24-hour reminder');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(appointmentId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000),
          title: 'Appointment Reminder',
          body: `${customerName} - ${appointmentTitle || 'Appointment'} tomorrow at ${appointmentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          schedule: { at: notificationTime },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#f59e0b',
        },
      ],
    });

    console.log('Notification scheduled for:', notificationTime);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

export async function cancelAppointmentNotification(appointmentId: string) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const notificationId = parseInt(appointmentId.replace(/\D/g, '').slice(0, 9)) || 0;
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    console.log('Notification cancelled for appointment:', appointmentId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}
