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
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../calendar-fix.css";


const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  useEffect(() => {
    loadAppointments();
  }, []);

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
      // Send SMS to owner (you'll need to configure your phone number)
      const ownerPhone = "+19417633317"; // Replace with your phone number
      await sendSMS(ownerPhone, ownerMessage);

      // Temporarily disabled - only send to owner for testing
      // if (customerPhone) {
      //   await sendSMS(customerPhone, customerMessage);
      // }

      alert("Reminder sent successfully!");
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert("Failed to send reminder. Please check your Twilio configuration.");
    }
  }

  async function sendSMS(to: string, message: string) {
    // Call local Express API endpoint
    const response = await fetch('http://localhost:3001/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    <Box p={8}>
      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading color="gold.300">Calendar</Heading>

        <Button
          colorScheme="yellow"
          size="md"
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
            bg={currentView === v ? "gold.300" : "gray.700"}
            color={currentView === v ? "black" : "white"}
            _hover={{ bg: "gold.400", color: "black" }}
            size="sm"
          >
            {v.toUpperCase()}
          </Button>
        ))}
      </HStack>

      {/* CALENDAR */}
      {loading ? (
        <Flex justify="center" mt={10}>
          <Spinner size="xl" color="yellow.300" />
        </Flex>
      ) : (
        <Box
          bg="#0F0F0F"
          p={5}
          borderRadius="lg"
          border="1px solid #2A2A2A"
          boxShadow="0 0 15px rgba(212, 175, 55, 0.1)"
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
            style={{ height: 650 }}
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
                    fontSize={currentView === "month" ? "xs" : "sm"}
                    fontWeight="semibold"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {currentView === "month" 
                      ? event.customer?.full_name || "Unknown Customer"
                      : (
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" fontWeight="bold">{event.customer?.full_name || "Unknown"}</Text>
                          <Text fontSize="xs">{event.rawData?.title || ""}</Text>
                        </VStack>
                      )
                    }
                  </Box>
                );
              },
            }}
            eventPropGetter={() => ({
              style: {
                backgroundColor: "#D4AF37",
                color: "#000",
                borderRadius: "6px",
                padding: "4px 6px",
                border: "1px solid #00000033",
              },
            })}
          />
        </Box>
      )}

      {/* MODAL */}
      <Dialog.Root open={open} onOpenChange={onClose} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="#111" color="white" border="1px solid #333">
            <Dialog.Header>
              <Heading size="md" color="gold.300">
                Appointment Details
              </Heading>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              {selectedEvent && (
                <VStack align="start" gap={4}>
                  <Box>
                    <Text fontWeight="bold" color="gold.300">
                      Customer:
                    </Text>
                    <Text>{selectedEvent.customer?.full_name}</Text>
                  </Box>
                  {selectedEvent.customer?.phone && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
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
                      <Text fontWeight="bold" color="gold.300">
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
                      <Text fontWeight="bold" color="gold.300">
                        Address:
                      </Text>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.customer.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        📍 {selectedEvent.customer.address}
                      </a>
                    </Box>
                  )}

                  <Box>
                    <Text fontWeight="bold" color="gold.300">
                      Date:
                    </Text>
                    <Text>
                      {moment(selectedEvent.start).format("MMMM D, YYYY")}
                    </Text>
                    <Text color="gray.400" fontSize="sm">
                      {moment(selectedEvent.start).tz("America/New_York").format("h:mm A")} -{" "}
                      {moment(selectedEvent.end).tz("America/New_York").format("h:mm A")}
                    </Text>
                  </Box>

                  {selectedEvent.description && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Description:
                      </Text>
                      <Text>{selectedEvent.description}</Text>
                    </Box>
                  )}

                  {selectedEvent.customer?.notes && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Customer Notes:
                      </Text>
                      <Text>{selectedEvent.customer.notes}</Text>
                    </Box>
                  )}
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Flex gap={2} justify="space-between" w="full">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Flex gap={2}>
                  <Button 
                    colorScheme="blue" 
                    onClick={handleSendReminder}
                  >
                    Send Reminder
                  </Button>
                  <Button 
                    colorScheme="red" 
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
