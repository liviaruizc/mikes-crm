/**
 * NotificationsPage Component
 * 
 * View all scheduled and delivered push notifications
 * 
 * Features:
 * - List of all pending (scheduled) notifications
 * - List of delivered notifications (platform dependent)
 * - Click notification to navigate to appointment details
 * - Shows notification time, customer name, location
 * - Color-coded status badges (Scheduled vs Sent)
 * - Mobile-only feature (shows info message on web)
 * 
 * Note: Only works on native mobile platforms (iOS/Android)
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Heading, Text, Stack, Card, Badge, HStack, VStack, Spinner } from "@chakra-ui/react";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Bell, Calendar, MapPin, Clock } from "lucide-react";

/** Notification record structure from Capacitor */
interface NotificationRecord {
  id: number;
  title: string;
  body: string;
  schedule?: {
    at: Date;
  };
  extra?: {
    appointmentId?: string;
    route?: string;
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    if (!Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }

    try {
      // Get all pending notifications
      const { notifications: pendingNotifications } = await LocalNotifications.getPending();
      
      // Get delivered notifications (only available on some platforms)
      let deliveredNotifications: any[] = [];
      try {
        const result = await LocalNotifications.getDeliveredNotifications();
        deliveredNotifications = result.notifications || [];
      } catch (error) {
        console.log('Delivered notifications not available on this platform');
      }

      // Combine and sort by schedule time
      const allNotifications = [
        ...pendingNotifications.map(n => ({ ...n, status: 'pending' })),
        ...deliveredNotifications.map(n => ({ ...n, status: 'delivered' }))
      ].sort((a, b) => {
        const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0;
        const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0;
        return timeB - timeA; // Most recent first
      });

      setNotifications(allNotifications as NotificationRecord[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatNotificationTime(scheduleTime?: { at: Date }) {
    if (!scheduleTime?.at) return 'No schedule';
    
    const date = new Date(scheduleTime.at);
    const now = new Date();
    const isPast = date < now;
    
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    
    return { dateStr, timeStr, isPast };
  }

  function extractLocationFromBody(body: string): string | null {
    const match = body.match(/📍\s*(.+)/);
    return match ? match[1] : null;
  }

  function handleNotificationClick(notification: NotificationRecord) {
    if (notification.extra?.route) {
      navigate(notification.extra.route);
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return (
      <Box p={{ base: 4, md: 8 }}>
        <Heading size="xl" mb={6}>Notifications</Heading>
        <Card.Root>
          <Card.Body>
            <VStack py={8} gap={4}>
              <Box color="gray.400">
                <Bell size={48} />
              </Box>
              <Heading size="lg">Mobile Only Feature</Heading>
              <Text color="gray.600" textAlign="center" maxW="md">
                Notifications are only available on mobile devices. Install the app on your phone to receive appointment reminders.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="orange.500" />
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }}>
      <HStack mb={6} justifyContent="space-between">
        <Heading size="xl">Notifications</Heading>
        {notifications.length > 0 && (
          <Badge colorScheme="orange" variant="solid" fontSize="md" px={3} py={1}>
            {notifications.length}
          </Badge>
        )}
      </HStack>

      {notifications.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack py={8} gap={4}>
              <Box color="gray.400">
                <Bell size={48} />
              </Box>
              <Heading size="lg">No Notifications</Heading>
              <Text color="gray.600" textAlign="center" maxW="md">
                You don't have any scheduled notifications yet. Create an appointment to receive a reminder 24 hours before.
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Stack gap={4}>
          {notifications.map((notification) => {
            const timeInfo = formatNotificationTime(notification.schedule);
            const location = extractLocationFromBody(notification.body);
            const bodyWithoutLocation = notification.body.replace(/📍.*/, '').trim();
            
            return (
              <Card.Root
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                cursor={notification.extra?.route ? "pointer" : "default"}
                _hover={notification.extra?.route ? { 
                  borderColor: "orange.500",
                  boxShadow: "md"
                } : undefined}
                transition="all 0.2s"
              >
                <Card.Body>
                  <HStack alignItems="flex-start" gap={4}>
                    <Box
                      p={3}
                      bg={typeof timeInfo === 'object' && timeInfo.isPast ? "gray.100" : "orange.100"}
                      borderRadius="md"
                    >
                      <Bell 
                        size={24} 
                        color={typeof timeInfo === 'object' && timeInfo.isPast ? "#718096" : "#f59e0b"}
                      />
                    </Box>
                    
                    <VStack alignItems="flex-start" gap={2} flex={1}>
                      <HStack justifyContent="space-between" width="100%">
                        <Text fontWeight="bold" fontSize="lg">
                          {notification.title}
                        </Text>
                        {typeof timeInfo === 'object' && (
                          <Badge 
                            colorScheme={timeInfo.isPast ? "gray" : "green"}
                            variant="subtle"
                          >
                            {timeInfo.isPast ? "Sent" : "Scheduled"}
                          </Badge>
                        )}
                      </HStack>
                      
                      <Text color="gray.700">
                        {bodyWithoutLocation}
                      </Text>
                      
                      {location && (
                        <HStack color="gray.600" fontSize="sm">
                          <MapPin size={16} />
                          <Text>{location}</Text>
                        </HStack>
                      )}
                      
                      {typeof timeInfo === 'object' && (
                        <HStack 
                          color="gray.500" 
                          fontSize="sm"
                          mt={2}
                          gap={4}
                        >
                          <HStack>
                            <Calendar size={16} />
                            <Text>{timeInfo.dateStr}</Text>
                          </HStack>
                          <HStack>
                            <Clock size={16} />
                            <Text>{timeInfo.timeStr}</Text>
                          </HStack>
                        </HStack>
                      )}
                    </VStack>
                  </HStack>
                </Card.Body>
              </Card.Root>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
