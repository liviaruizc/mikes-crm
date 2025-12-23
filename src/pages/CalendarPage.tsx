/**
 * CalendarPage Component
 * 
 * Full calendar view of all appointments using react-big-calendar
 * 
 * Features:
 * - Month/week/day/agenda views
 * - View appointment details by clicking on events
 * - Cancel appointments
 * - Send SMS and push notification reminders
 * - Navigate to create new appointments
 * - Real-time data from Supabase
 */

import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Spinner,
  Button,
  Flex,
  Dialog,
  Text,
  VStack,
  HStack,
  useDisclosure,
  Link,
} from "@chakra-ui/react";
import { Calendar, momentLocalizer, Views, type View } from "react-big-calendar";
import moment from "moment-timezone";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase, getCurrentUserId } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../calendar-fix.css";
import { cancelAppointmentNotification, sendImmediateReminderNotification } from "../lib/notificationService";

// Initialize moment localizer for calendar date/time formatting
const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure(); // Dialog state for appointment details
  
  // State management
  const [events, setEvents] = useState<any[]>([]); // Calendar events
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null); // Currently selected appointment
  const [currentDate, setCurrentDate] = useState(new Date()); // Calendar navigation date
  const [currentView, setCurrentView] = useState<View>(Views.MONTH); // Calendar view mode

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, []);

  /**
   * Load all appointments from database and format for calendar display
   * Transforms database appointments into calendar event format
   */
  async function loadAppointments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
          id,
          title,
          description,
          start_time,
          end_time,
          customers (
            id,
            full_name,
            phone,
            email,
            address,
            notes
          )
        `
      )
      .order("start_time");

    if (error) {
      console.error("Failed to load appointments:", error);
      setLoading(false);
      return;
    }

    const formatted = data?.map((appt: any) => ({
      id: appt.id,
      title: appt.customers?.full_name ?? "Unknown Customer",
      start: new Date(appt.start_time),
      end: new Date(appt.end_time),
      description: appt.description,
      customer: appt.customers,
      rawData: appt,
    }));

    setEvents(formatted || []);
    setLoading(false);
  }

  function handleEventClick(event: any) {
    setSelectedEvent(event);
    onOpen();
  }

  async function handleCancelAppointment() {
    if (!selectedEvent?.id) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", selectedEvent.id);

    if (error) {
      console.error("Failed to cancel appointment:", error);
      alert("Failed to cancel appointment");
      return;
    }

    // Cancel the notification
    await cancelAppointmentNotification(selectedEvent.id);

    // Reload appointments and close dialog
    await loadAppointments();
    onClose();
  }

  async function handleSendReminder() {
    if (!selectedEvent) return;

    const appointmentDate = moment(selectedEvent.start).tz("America/New_York").format("MMMM D, YYYY");
    const appointmentTime = moment(selectedEvent.start).tz("America/New_York").format("h:mm A");
    const customerName = selectedEvent.customer?.full_name || "Customer";
    //const customerPhone = selectedEvent.customer?.phone;

    // Message to yourself
    const ownerMessage = `Reminder: Appointment with ${customerName} on ${appointmentDate} at ${appointmentTime}`;
    
    // Message to customer
    //const customerMessage = `Hi ${customerName}, this is a reminder about your appointment on ${appointmentDate} at ${appointmentTime}. See you then!`;

    try {
      // Get owner phone from settings
      const userId = await getCurrentUserId();
      const { data: settings } = await supabase
        .from('settings')
        .select('owner_phone')
        .eq('user_id', userId)
        .single();
      
      const ownerPhone = settings?.owner_phone || "19417633317";
      
      // Send SMS to owner
      await sendSMS(ownerPhone, ownerMessage);

      // Send notification (for testing)
      await sendImmediateReminderNotification(
        customerName,
        appointmentDate,
        appointmentTime,
        selectedEvent.customer?.address
      );

      // Temporarily disabled - only send to owner for testing
      // if (customerPhone) {
      //   await sendSMS(customerPhone, customerMessage);
      // }

      alert("Reminder sent successfully!");
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert("Failed to send reminder. Please check your Vonage configuration.");
    }
  }

  async function sendSMS(to: string, message: string) {
    // Get the current user's session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    
    // Use environment variable for API URL (falls back to localhost for development)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/send-sms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('SMS Error:', errorData);
      throw new Error(errorData.error || 'Failed to send SMS');
    }

    return response.json();
  }

  return (
    <Box p={{ base: 4, md: 8 }}>
      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <Heading color="black" fontWeight="500" fontSize="xl">Calendar</Heading>

        <Button
          bg="#f59e0b"
          color="black"
          fontWeight="500"
          size={{ base: "sm", md: "md" }}
          _hover={{ bg: "#d97706" }}
          transition="colors 0.15s"
          onClick={() => navigate("/appointments/new")}
        >
          + New Appointment
        </Button>
      </Flex>

      {/* CUSTOM VIEW SWITCHER */}
      <HStack gap={3} mb={4}>
        {["month", "week", "day"].map((v) => (
          <Button
            key={v}
            onClick={() => setCurrentView(v as View)}
            bg={currentView === v ? "#f59e0b" : "white"}
            color={currentView === v ? "black" : "gray.600"}
            border="1px solid"
            borderColor={currentView === v ? "transparent" : "gray.300"}
            fontWeight="500"
            _hover={{ bg: currentView === v ? "#d97706" : "gray.100" }}
            transition="colors 0.15s"
            size="sm"
          >
            {v.toUpperCase()}
          </Button>
        ))}
      </HStack>

      {/* CALENDAR */}
      {loading ? (
        <Flex justify="center" mt={10}>
          <Spinner size="xl" color="#f59e0b" />
        </Flex>
      ) : (
        <Box
          bg="white"
          p={{ base: 2, md: 5 }}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          overflowX={{ base: "auto", md: "visible" }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            date={currentDate}
            onNavigate={(d) => setCurrentDate(d)}
            view={currentView}
            onView={(v) => setCurrentView(v)}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%", minHeight: 500 }}
            views={["month", "week", "day"]}
            step={30}
            min={new Date(1970, 1, 1, 7, 0)}
            max={new Date(1970, 1, 1, 22, 0)}
            onSelectEvent={handleEventClick}
            components={{
              event: (props: any) => {
                const { event } = props;
                return (
                  <Box
                    p={1}
                    fontSize={currentView === "month" ? "0.75rem" : "0.875rem"}
                    fontWeight="500"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {currentView === "month" 
                      ? event.customer?.full_name || "Unknown Customer"
                      : (
                        <VStack align="start" gap={0}>
                          <Text fontSize="0.875rem" fontWeight="500">{event.customer?.full_name || "Unknown"}</Text>
                          <Text fontSize="0.75rem">{event.rawData?.title || ""}</Text>
                        </VStack>
                      )
                    }
                  </Box>
                );
              },
            }}
            eventPropGetter={() => ({
              style: {
                backgroundColor: "#f59e0b",
                color: "#000000",
                borderRadius: "6px",
                padding: "4px 6px",
                border: "none",
              },
            })}
          />
        </Box>
      )}

      {/* MODAL */}
      <Dialog.Root open={open} onOpenChange={onClose} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="white" color="black" border="1px solid" borderColor="gray.200">
            <Dialog.Header>
              <Heading size="md" color="black" fontWeight="500">
                Appointment Details
              </Heading>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              {selectedEvent && (
                <VStack align="start" gap={4}>
                  <Box>
                    <Text fontWeight="500" color="black">
                      Customer:
                    </Text>
                    <Text color="gray.600">{selectedEvent.customer?.full_name}</Text>
                  </Box>
                  {selectedEvent.customer?.phone && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Phone:
                      </Text>
                      <Link
                        href={`tel:${selectedEvent.customer.phone}`}
                        color="blue.400"
                        _hover={{ textDecoration: "underline", cursor: "pointer" }}
                      >
                        {selectedEvent.customer.phone}
                      </Link>
                    </Box>
                  )}

                  {selectedEvent.customer?.email && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Email:
                      </Text>
                      <Link
                        href={`mailto:${selectedEvent.customer.email}`}
                        color="blue.400"
                        _hover={{ textDecoration: "underline", cursor: "pointer" }}
                      >
                        {selectedEvent.customer.email}
                      </Link>
                    </Box>
                  )}

                  {selectedEvent.customer?.address && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Address:
                      </Text>
                      <a
                        href={`geo:0,0?q=${encodeURIComponent(selectedEvent.customer.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e: any) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e: any) => e.currentTarget.style.textDecoration = "none"}
                      >
                        📍 {selectedEvent.customer.address}
                      </a>
                    </Box>
                  )}

                  <Box>
                    <Text fontWeight="500" color="black">
                      Date:
                    </Text>
                    <Text color="gray.600">
                      {moment(selectedEvent.start).format("MMMM D, YYYY")}
                    </Text>
                    <Text color="gray.400" fontSize="0.875rem">
                      {moment(selectedEvent.start).tz("America/New_York").format("h:mm A")} -{" "}
                      {moment(selectedEvent.end).tz("America/New_York").format("h:mm A")}
                    </Text>
                  </Box>

                  {selectedEvent.description && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Description:
                      </Text>
                      <Text color="gray.600">{selectedEvent.description}</Text>
                    </Box>
                  )}

                  {selectedEvent.customer?.notes && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Customer Notes:
                      </Text>
                      <Text color="gray.600">{selectedEvent.customer.notes}</Text>
                    </Box>
                  )}
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Flex gap={2} justify="space-between" w="full">
                <Button 
                  variant="outline"
                  border="1px solid"
                  borderColor="gray.300"
                  color="gray.600"
                  fontWeight="500"
                  _hover={{ bg: "gray.100" }}
                  transition="colors 0.15s"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Flex gap={2}>
                  <Button 
                    bg="#f59e0b"
                    color="black"
                    fontWeight="500"
                    _hover={{ bg: "#d97706" }}
                    transition="colors 0.15s"
                    onClick={handleSendReminder}
                  >
                    Send Reminder
                  </Button>
                  <Button 
                    bg="red.600"
                    color="white"
                    fontWeight="500"
                    _hover={{ bg: "red.700" }}
                    transition="colors 0.15s"
                    onClick={handleCancelAppointment}
                  >
                    Cancel Appointment
                  </Button>
                </Flex>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
