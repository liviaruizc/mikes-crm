import { Box, Text, SimpleGrid, Button, VStack, HStack, Spinner, Dialog, Heading, useDisclosure, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import moment from "moment-timezone";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with Webpack
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Format phone number to (XXX) XXX-XXXX
function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "No phone";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

interface Appointment {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  customers?: {
    id: string;
    full_name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  } | null;
  lat?: number;
  lng?: number;
}

interface Customer {
  id: string;
  full_name: string;
  address: string;
  pipeline_stage: string;
  phone?: string;
  lat?: number;
  lng?: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadTodayAppointments();
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, address, pipeline_stage, phone")
      .not("address", "is", null)
      .not("address", "eq", "");

    if (!error && data) {
      const withCoords = await geocodeCustomers(data);
      setCustomers(withCoords);
    }
  }

  async function geocodeCustomers(customers: any[]): Promise<Customer[]> {
    const results: Customer[] = [];

    for (const customer of customers) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customer.address)}&limit=1`,
          {
            headers: {
              "User-Agent": "Boss-CRM/1.0",
            },
          }
        );

        const data = await response.json();
        
        if (data && data.length > 0) {
          results.push({
            ...customer,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to geocode address for ${customer.full_name}:`, error);
      }
    }

    return results;
  }

  async function loadTodayAppointments() {
    const startOfDay = moment().tz("America/New_York").startOf("day").toISOString();
    const endOfDay = moment().tz("America/New_York").endOf("day").toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .select(`
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
      `)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .order("start_time");

    if (!error && data) {
      const formatted = data.map((appt: any) => ({
        ...appt,
        customers: Array.isArray(appt.customers) ? appt.customers[0] : appt.customers
      }));
      
      // Geocode appointments with addresses
      const withCoords = await geocodeAppointments(formatted);
      setTodayAppointments(withCoords);
    }
    setLoading(false);
  }

  function handleAppointmentClick(appt: Appointment) {
    setSelectedAppointment(appt);
    onOpen();
  }

  async function handleCancelAppointment() {
    if (!selectedAppointment?.id) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", selectedAppointment.id);

    if (error) {
      console.error("Failed to cancel appointment:", error);
      alert("Failed to cancel appointment");
      return;
    }

    alert("Appointment canceled successfully");
    onClose();
    loadTodayAppointments();
  }

  async function geocodeAppointments(appointments: any[]): Promise<Appointment[]> {
    const results: Appointment[] = [];

    for (const appt of appointments) {
      if (appt.customers?.address) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(appt.customers.address)}&limit=1`,
            {
              headers: {
                "User-Agent": "Boss-CRM/1.0",
              },
            }
          );

          const data = await response.json();
          
          if (data && data.length > 0) {
            results.push({
              ...appt,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
          } else {
            results.push(appt);
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to geocode address for ${appt.customers.full_name}:`, error);
          results.push(appt);
        }
      } else {
        results.push(appt);
      }
    }

    return results;
  }

  return (
    <Box maxW="1400px" mx="auto">
      <VStack align="start" gap={1} mb={8}>
        <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="gold.400">
          Welcome to Mike&apos;s CRM
        </Text>
        <Text fontSize={{ base: "md", md: "lg" }} color="gray.400">
          Manage appointments, customers, and your entire workflow.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={3}>
        <Button
          w="full"
          h={{ base: "80px", md: "100px" }}
          bg="gray.800"
          border="1px solid #2A2A2A"
          color="gold.300"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="semibold"
          borderRadius="lg"
          _hover={{
            bg: "gray.700",
            borderColor: "gold.500",
            color: "gold.400",
          }}
          onClick={() => navigate("/calendar")}
        >
          Calendar
        </Button>

        <Button
          w="full"
          h={{ base: "80px", md: "100px" }}
          bg="gray.800"
          border="1px solid #2A2A2A"
          color="gold.300"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="semibold"
          borderRadius="lg"
          _hover={{
            bg: "gray.700",
            borderColor: "gold.500",
            color: "gold.400",
          }}
          onClick={() => navigate("/appointments/new")}
        >
          New Appointment
        </Button>

        <Button
          w="full"
          h={{ base: "80px", md: "100px" }}
          bg="gray.800"
          border="1px solid #2A2A2A"
          color="gold.300"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="semibold"
          borderRadius="lg"
          _hover={{
            bg: "gray.700",
            borderColor: "gold.500",
            color: "gold.400",
          }}
          onClick={() => navigate("/customers")}
        >
          Customers
        </Button>

        <Button
          w="full"
          h={{ base: "80px", md: "100px" }}
          bg="gray.800"
          border="1px solid #2A2A2A"
          color="gold.300"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="semibold"
          borderRadius="lg"
          _hover={{
            bg: "gray.700",
            borderColor: "gold.500",
            color: "gold.400",
          }}
          onClick={() => navigate("/pipeline")}
        >
          Pipeline
        </Button>
      </SimpleGrid>

      {/* Today's Schedule */}
      <Box mt={{ base: 4, md: 6 }} maxW="700px">
        <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="gold.400" mb={3}>
          Today&apos;s Schedule
        </Text>
        
        <Box
          bg="gray.800"
          border="1px solid #2A2A2A"
          borderRadius="lg"
          p={{ base: 3, md: 4 }}
          minH={{ base: "120px", md: "150px" }}
        >
          {loading ? (
            <VStack justify="center" h={{ base: "120px", md: "150px" }}>
              <Spinner size="lg" color="gold.400" />
            </VStack>
          ) : todayAppointments.length === 0 ? (
            <VStack justify="center" h="120px">
              <Text color="gray.500" fontSize={{ base: "sm", md: "md" }}>
                No appointments scheduled for today
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" gap={2}>
              {todayAppointments.map((appt) => (
                <Box
                  key={appt.id}
                  p={{ base: 2, md: 3 }}
                  bg="gray.900"
                  borderRadius="md"
                  border="1px solid #3A3A3A"
                  _hover={{ borderColor: "gold.500", cursor: "pointer" }}
                  onClick={() => handleAppointmentClick(appt)}
                >
                  <HStack justify="space-between" align="start" flexWrap={{ base: "wrap", sm: "nowrap" }} gap={{ base: 2, sm: 0 }}>
                    <VStack align="start" gap={0} flex={{ base: "1 1 100%", sm: "1" }}>
                      <Text fontWeight="semibold" color="white" fontSize={{ base: "sm", md: "md" }}>
                        {appt.customers?.full_name || "Unknown Customer"}
                      </Text>
                      <Text color="gray.400" fontSize="xs">
                        {formatPhoneNumber(appt.customers?.phone)}
                      </Text>
                    </VStack>
                    <Text color="gold.400" fontWeight="medium" fontSize="xs" whiteSpace="nowrap">
                      {moment(appt.start_time).tz("America/New_York").format("h:mm A")} - {moment(appt.end_time).tz("America/New_York").format("h:mm A")}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Box>

      {/* Customer Map */}
      {customers.length > 0 && (
        <Box mt={{ base: 4, md: 6 }} maxW="700px">
          <HStack justify="space-between" mb={3}>
            <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="gold.400">
              {showOnlyToday ? "Today's Appointments" : "Customer Locations"}
            </Text>
            <HStack gap={2}>
              <Button 
                size="sm" 
                colorScheme={showOnlyToday ? "yellow" : "gray"}
                variant={showOnlyToday ? "solid" : "outline"}
                onClick={() => setShowOnlyToday(!showOnlyToday)}
              >
                {showOnlyToday ? "Show All" : "Today Only"}
              </Button>
              <Button 
                size="sm" 
                colorScheme="yellow"
                onClick={() => navigate("/map")}
              >
                View Full Map
              </Button>
            </HStack>
          </HStack>
          
          <Box
            bg="gray.800"
            border="1px solid #2A2A2A"
            borderRadius="lg"
            overflow="hidden"
            h="400px"
          >
            <MapContainer
              center={[
                customers.filter(c => c.lat).reduce((sum, c) => sum + (c.lat || 0), 0) / customers.filter(c => c.lat).length,
                customers.filter(c => c.lng).reduce((sum, c) => sum + (c.lng || 0), 0) / customers.filter(c => c.lng).length
              ]}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {showOnlyToday ? (
                todayAppointments.map((appt) => {
                  if (!appt.lat || !appt.lng) return null;

                  return (
                    <Marker
                      key={appt.id}
                      position={[appt.lat, appt.lng]}
                    >
                      <Popup>
                        <Box p={2} minW="180px">
                          <Text fontWeight="bold" fontSize="sm" mb={1}>
                            {appt.customers?.full_name || "Unknown"}
                          </Text>
                          <Text fontSize="xs" color="blue.600" mb={1}>
                            🕒 {moment(appt.start_time).tz("America/New_York").format("h:mm A")}
                          </Text>
                          {appt.customers?.phone && (
                            <Text fontSize="xs">📞 {appt.customers.phone}</Text>
                          )}
                          {appt.customers?.address && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.customers.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#63B3ED", fontSize: "12px", marginTop: "4px", display: "block" }}
                            >
                              📍 {appt.customers.address}
                            </a>
                          )}
                        </Box>
                      </Popup>
                    </Marker>
                  );
                })
              ) : (
                customers.map((customer) => {
                  if (!customer.lat || !customer.lng) return null;

                  return (
                    <Marker
                      key={customer.id}
                      position={[customer.lat, customer.lng]}
                    >
                      <Popup>
                        <Box p={2} minW="180px">
                          <Text fontWeight="bold" fontSize="sm" mb={1}>
                            {customer.full_name}
                          </Text>
                          <Text fontSize="xs" color="blue.600" mb={1}>
                            📍 {customer.pipeline_stage}
                          </Text>
                          {customer.phone && (
                            <Text fontSize="xs">📞 {customer.phone}</Text>
                          )}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#63B3ED", fontSize: "12px", marginTop: "4px", display: "block" }}
                          >
                            📍 {customer.address}
                          </a>
                        </Box>
                      </Popup>
                    </Marker>
                  );
                })
              )}
            </MapContainer>
          </Box>
        </Box>
      )}

      {/* Appointment Details Dialog */}
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
              {selectedAppointment && (
                <VStack align="start" gap={4}>
                  <Box>
                    <Text fontWeight="bold" color="gold.300">
                      Customer:
                    </Text>
                    <Text>{selectedAppointment.customers?.full_name}</Text>
                  </Box>

                  {selectedAppointment.customers?.phone && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Phone:
                      </Text>
                      <a
                        href={`tel:${selectedAppointment.customers.phone}`}
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        {formatPhoneNumber(selectedAppointment.customers.phone)}
                      </a>
                    </Box>
                  )}

                  {selectedAppointment.customers?.email && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Email:
                      </Text>
                      <a
                        href={`mailto:${selectedAppointment.customers.email}`}
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        {selectedAppointment.customers.email}
                      </a>
                    </Box>
                  )}

                  {selectedAppointment.customers?.address && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Address:
                      </Text>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAppointment.customers.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        📍 {selectedAppointment.customers.address}
                      </a>
                    </Box>
                  )}

                  <Box>
                    <Text fontWeight="bold" color="gold.300">
                      Date:
                    </Text>
                    <Text>
                      {moment(selectedAppointment.start_time).format("MMMM D, YYYY")}
                    </Text>
                    <Text color="gray.400" fontSize="sm">
                      {moment(selectedAppointment.start_time).tz("America/New_York").format("h:mm A")} -{" "}
                      {moment(selectedAppointment.end_time).tz("America/New_York").format("h:mm A")}
                    </Text>
                  </Box>

                  {selectedAppointment.description && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Description:
                      </Text>
                      <Text>{selectedAppointment.description}</Text>
                    </Box>
                  )}

                  {selectedAppointment.customers?.notes && (
                    <Box>
                      <Text fontWeight="bold" color="gold.300">
                        Customer Notes:
                      </Text>
                      <Text>{selectedAppointment.customers.notes}</Text>
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
                    onClick={() => {
                      onClose();
                      navigate("/calendar");
                    }}
                  >
                    Go to Calendar
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
