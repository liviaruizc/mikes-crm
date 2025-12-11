/**
 * AppointmentDetailsPage Component
 * 
 * Full details view for a specific appointment
 * Accessed when tapping on a notification or viewing from calendar
 * 
 * Features:
 * - Shows appointment title, date, time, description
 * - Displays customer information (name, phone, email, address, notes)
 * - Clickable phone/email links
 * - "Open in Maps" button for location
 * - Navigation back to calendar
 * 
 * Route: /appointment/:id
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Heading, Text, Button, Stack, Card, Spinner } from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";

/** Appointment with customer details */
interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  customers: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  };
}

export default function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAppointment();
    }
  }, [id]);

  async function loadAppointment() {
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
          customers!inner (
            id,
            full_name,
            phone,
            email,
            address,
            notes
          )
        `
      )
      .eq("id", id)
      .single();

    setLoading(false);

    if (error) {
      console.error("Error loading appointment:", error);
      alert("Could not load appointment details.");
      navigate("/calendar");
      return;
    }

    setAppointment(data as any);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="orange.500" />
      </Box>
    );
  }

  if (!appointment) {
    return (
      <Box p={8}>
        <Text>Appointment not found.</Text>
        <Button mt={4} onClick={() => navigate("/calendar")}>
          Back to Calendar
        </Button>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 8 }}>
      <Button 
        mb={4} 
        variant="ghost" 
        onClick={() => navigate("/calendar")}
      >
        ← Back to Calendar
      </Button>

      <Heading size="xl" mb={6}>
        {appointment.title}
      </Heading>

      <Stack gap={4}>
        <Card.Root>
          <Card.Header>
            <Heading size="md">Appointment Details</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Box>
                <Text fontWeight="bold" color="gray.600">Date</Text>
                <Text fontSize="lg">{formatDate(appointment.start_time)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="gray.600">Time</Text>
                <Text fontSize="lg">
                  {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                </Text>
              </Box>
              {appointment.description && (
                <Box>
                  <Text fontWeight="bold" color="gray.600">Description</Text>
                  <Text>{appointment.description}</Text>
                </Box>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">Customer Information</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Box>
                <Text fontWeight="bold" color="gray.600">Name</Text>
                <Text fontSize="lg">{appointment.customers.full_name}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="gray.600">Phone</Text>
                <Text>
                  <a href={`tel:${appointment.customers.phone}`} style={{ color: '#f59e0b' }}>
                    {appointment.customers.phone}
                  </a>
                </Text>
              </Box>
              {appointment.customers.email && (
                <Box>
                  <Text fontWeight="bold" color="gray.600">Email</Text>
                  <Text>
                    <a href={`mailto:${appointment.customers.email}`} style={{ color: '#f59e0b' }}>
                      {appointment.customers.email}
                    </a>
                  </Text>
                </Box>
              )}
              {appointment.customers.address && (
                <Box>
                  <Text fontWeight="bold" color="gray.600">Location</Text>
                  <Text>{appointment.customers.address}</Text>
                  <Button
                    mt={2}
                    colorScheme="orange"
                    size="sm"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(appointment.customers.address)}`, '_blank')}
                  >
                    Open in Maps
                  </Button>
                </Box>
              )}
              {appointment.customers.notes && (
                <Box>
                  <Text fontWeight="bold" color="gray.600">Notes</Text>
                  <Text whiteSpace="pre-wrap">{appointment.customers.notes}</Text>
                </Box>
              )}
            </Stack>
          </Card.Body>
        </Card.Root>

        <Button
          colorScheme="orange"
          size="lg"
          onClick={() => navigate("/calendar")}
          mt={4}
        >
          Back to Calendar
        </Button>
      </Stack>
    </Box>
  );
}
