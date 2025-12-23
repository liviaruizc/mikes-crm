/**
 * Notification Service
 * 
 * Handles all push notification functionality using Capacitor Local Notifications
 * 
 * Features:
 * - Schedule appointment reminders 24 hours in advance
 * - Cancel notifications when appointments are deleted
 * - Send immediate test notifications
 * - Deep linking to appointment details on notification tap
 * - Request and check notification permissions
 * 
 * Platform: Native mobile only (iOS/Android)
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Initialize notification action listener
 * Handles navigation when user taps on a notification
 * @param navigate - React Router navigate function for deep linking
 */
export function initializeNotificationListener(navigate: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Listen for notification actions (when user taps a notification)
  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('Notification clicked:', notification);
    
    // Get the route from the notification data
    const route = notification.notification.extra?.route;
    if (route) {
      navigate(route);
    }
  });
}

/**
 * Request permission to send push notifications
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
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

/**
 * Schedule a push notification 24 hours before an appointment
 * @param appointmentId - Unique appointment identifier
 * @param customerName - Name of customer for notification
 * @param appointmentTime - Date/time of appointment
 * @param appointmentTitle - Optional title for appointment
 * @param location - Optional customer address to display in notification
 */
export async function scheduleAppointmentNotification(
  appointmentId: string,
  customerName: string,
  appointmentTime: Date,
  appointmentTitle?: string,
  location?: string
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

    // Build notification body with location if available
    let notificationBody = `${customerName} - ${appointmentTitle || 'Appointment'} tomorrow at ${appointmentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    if (location) {
      notificationBody += `\n📍 ${location}`;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(appointmentId.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 1000000),
          title: 'Appointment Reminder',
          body: notificationBody,
          schedule: { at: notificationTime },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#f59e0b',
          // Deep link data - clicking notification opens appointment details
          extra: {
            appointmentId: appointmentId,
            route: `/appointment/${appointmentId}`,
          },
        },
      ],
    });

    console.log('Notification scheduled for:', notificationTime);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

/**
 * Cancel a scheduled notification for an appointment
 * Called when an appointment is deleted
 * @param appointmentId - ID of appointment to cancel notification for
 */
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

/**
 * Send a test notification (5 second delay)
 * Used for testing notification permissions and display
 */
export async function sendTestNotification() {
  if (!Capacitor.isNativePlatform()) {
    alert('Notifications only work on mobile devices');
    return;
  }

  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      alert('Please enable notifications in your device settings');
      return;
    }

    // Send notification in 5 seconds
    const notificationTime = new Date();
    notificationTime.setSeconds(notificationTime.getSeconds() + 5);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1000000),
          title: 'Test Notification',
          body: 'This is a test notification from Contractor\'s CRM! You should receive appointment reminders 24 hours in advance.',
          schedule: { at: notificationTime },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#f59e0b',
        },
      ],
    });

    alert('Test notification scheduled! You should receive it in 5 seconds.');
  } catch (error) {
    console.error('Error sending test notification:', error);
    alert('Failed to send test notification');
  }
}

/**
 * Send immediate appointment reminder notification (for testing "Send Reminder" button)
 * Delivers notification in 3 seconds to demonstrate what customers will see
 * @param customerName - Customer name for notification
 * @param appointmentDate - Formatted date string
 * @param appointmentTime - Formatted time string
 * @param location - Optional customer address
 */
export async function sendImmediateReminderNotification(
  customerName: string,
  appointmentDate: string,
  appointmentTime: string,
  location?: string
) {
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

    // Send notification in 3 seconds (immediate but slight delay for UX)
    const notificationTime = new Date();
    notificationTime.setSeconds(notificationTime.getSeconds() + 3);

    // Build notification body
    let notificationBody = `Appointment with ${customerName} on ${appointmentDate} at ${appointmentTime}`;
    if (location) {
      notificationBody += `\n📍 ${location}`;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1000000),
          title: 'Appointment Reminder',
          body: notificationBody,
          schedule: { at: notificationTime },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#f59e0b',
        },
      ],
    });

    console.log('Reminder notification scheduled');
  } catch (error) {
    console.error('Error sending reminder notification:', error);
  }
}
