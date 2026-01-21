/**
 * HomePage Component
 * 
 * Main dashboard that displays:
 * - Business statistics (revenue, contacts, deals, conversion rate)
 * - Today's appointments with map view
 * - Customer locations on interactive map
 * - Quick actions for appointments
 * 
 * Features:
 * - Google Maps integration for location visualization
 * - SMS reminders for appointments
 * - Push notifications for reminders
 * - Filter by pipeline stage
 * - Geocoding for customer addresses
 */

import { Box, Text, SimpleGrid, Button, VStack, HStack, Spinner, Dialog, Heading, useDisclosure, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase, getCurrentUserId } from "../lib/supabaseClient";
import moment from "moment-timezone";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Users, TrendingUp, Calendar, Plus } from "lucide-react";
import { cancelAppointmentNotification, sendImmediateReminderNotification } from "../lib/notificationService";
import { downloadAppointmentICS } from "../lib/calendarExport";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Format phone number to (XXX) XXX-XXXX format
 * @param phone - Raw phone number string
 * @returns Formatted phone number or "No phone" if invalid
 */
function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "No phone";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// TypeScript interfaces for type safety

/** Appointment object structure */
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

/** Customer object structure with optional geocoded coordinates */
interface Customer {
  id: string;
  full_name: string;
  address: string;
  pipeline_stage: string;
  phone?: string;
  email?: string;
  lat?: number;
  lng?: number;
  estimated_price?: number;
}

/** Dashboard statistics */
interface Stats {
  totalRevenue: number;
  activeContacts: number;
  dealsClosed: number;
  conversionRate: number;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure(); // Dialog state management
  
  // State management
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyToday, setShowOnlyToday] = useState(false); // Filter: show today's appointments only
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>("all"); // Filter by pipeline stage
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedMapCustomer, setSelectedMapCustomer] = useState<Customer | null>(null); // For map marker info window
  const [selectedMapAppointment, setSelectedMapAppointment] = useState<Appointment | null>(null); // For map marker info window
  const [selectedAddressForMaps, setSelectedAddressForMaps] = useState<string | null>(null); // For maps service selection
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    activeContacts: 0,
    dealsClosed: 0,
    conversionRate: 0,
  });
  const [userName, setUserName] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadTodayAppointments();
    loadCustomers();
    loadStats();
    loadUserName();
  }, []);

  /**
   * Load the logged-in user's name
   */
  async function loadUserName() {
    const userId = await getCurrentUserId();
    if (userId) {
      const { data, error } = await supabase
        .from('user')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      
      if (!error && data?.full_name) {
        setUserName(data.full_name);
      } else {
        // Fallback to 'Guest' if no name set
        setUserName('Guest');
      }
    }
  }

  /**
   * Load business statistics from database
   * Calculates total revenue, active contacts, deals closed, and conversion rate
   */
  async function loadStats() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, pipeline_stage, estimated_price");

    if (!error && data) {
      const totalRevenue = data.reduce((sum, c) => sum + (c.estimated_price || 0), 0);
      const activeContacts = data.length;
      const dealsClosed = data.filter(c => c.pipeline_stage === "Won").length;
      const conversionRate = activeContacts > 0 ? (dealsClosed / activeContacts) * 100 : 0;

      setStats({
        totalRevenue,
        activeContacts,
        dealsClosed,
        conversionRate,
      });
    }
  }

  /**
   * Load customers with addresses from database
   * Only loads customers that have valid addresses for map display
   */
  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, address, pipeline_stage, phone")
      .not("address", "is", null)
      .not("address", "eq", "");

    console.log(`Loading ${data?.length || 0} customers with addresses`);
    
    if (!error && data) {
      const withCoords = await geocodeCustomers(data);
      console.log(`Geocoded ${withCoords.filter(c => c.lat).length} customers successfully`);
      setCustomers(withCoords);
    } else if (error) {
      console.error("Error loading customers:", error);
    }
  }

  /**
   * Convert customer addresses to GPS coordinates using Google Maps Geocoding API
   * @param customers - Array of customers with address field
   * @returns Array of customers with lat/lng coordinates added
   */
  async function geocodeCustomers(customers: any[]): Promise<Customer[]> {
    const results: Customer[] = [];

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing!");
      return customers;
    }

    console.log(`Starting to geocode ${customers.length} addresses...`);

    for (const customer of customers) {
      try {
        // Use Google Geocoding API for accurate results
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customer.address)}&key=${GOOGLE_MAPS_API_KEY}`
        );

        const data = await response.json();
        
        if (data.status === "OK" && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          results.push({
            ...customer,
            lat: location.lat,
            lng: location.lng,
          });
          console.log(`Geocoded ${customer.full_name}: ${customer.address} -> ${data.results[0].formatted_address}`);
        } else {
          console.warn(`No results for ${customer.full_name}: ${customer.address} (Status: ${data.status})`);
          if (data.error_message) {
            console.error(`API Error: ${data.error_message}`);
          }
          results.push(customer);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to geocode address for ${customer.full_name}:`, error);
        results.push(customer);
      }
    }

    console.log(`Geocoding complete. ${results.filter(r => r.lat).length}/${results.length} addresses geocoded successfully`);
    return results;
  }

  /**
   * Load appointments for the current day
   * Fetches appointments with customer details and geocodes addresses for map view
   */
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

  /**
   * Send appointment reminder via SMS and push notification
   * Sends to both owner and customer (if customer has phone number)
   */
  async function handleSendReminder() {
    if (!selectedAppointment) return;

    const appointmentDate = moment(selectedAppointment.start_time).tz("America/New_York").format("MMMM D, YYYY");
    const appointmentTime = moment(selectedAppointment.start_time).tz("America/New_York").format("h:mm A");
    const customerName = selectedAppointment.customers?.full_name || "Customer";
    const customerPhone = selectedAppointment.customers?.phone;

    // Message to owner
    const ownerMessage = `Reminder: Appointment with ${customerName} on ${appointmentDate} at ${appointmentTime}. Location: ${selectedAppointment.customers?.address || 'No address'}`;
    
    // Message to customer - include address
    let customerMessage = `Hi ${customerName}! This is a reminder about your appointment on ${appointmentDate} at ${appointmentTime}.`;
    if (selectedAppointment.customers?.address) {
      customerMessage += ` Location: ${selectedAppointment.customers.address}`;
    }
    customerMessage += ' See you then!';

    try {
      // Get owner phone from settings
      const userId = await getCurrentUserId();
      const { data: settings } = await supabase
        .from('settings')
        .select('owner_phone')
        .eq('user_id', userId)
        .single();
      
      const ownerPhone = settings?.owner_phone || "+19417633317";
      
      // Send SMS to owner
      await sendSMS(ownerPhone, ownerMessage);

      // Send notification (for testing)
      await sendImmediateReminderNotification(
        customerName,
        appointmentDate,
        appointmentTime,
        selectedAppointment.customers?.address
      );

      // Send SMS to customer if they have a phone number
      if (customerPhone) {
        await sendSMS(customerPhone, customerMessage);
      }

      alert("Reminder sent successfully!");
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert("Failed to send reminder.");
    }
  }

  /**
   * Send SMS message via backend API
   * @param to - Phone number to send to
   * @param message - SMS message content
   */
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

  /**
   * Cancel/delete an appointment from database
   * Also cancels any scheduled push notifications for this appointment
   */
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

    // Cancel the notification
    await cancelAppointmentNotification(selectedAppointment.id);

    alert("Appointment canceled successfully");
    onClose();
    loadTodayAppointments();
  }

  function handleOpenMapsSelection(address: string) {
    setSelectedAddressForMaps(address);
  }

  function handleOpenAppleMaps(address: string) {
    window.location.href = `geo:0,0?q=${encodeURIComponent(address)}`;
    setSelectedAddressForMaps(null);
  }

  function handleOpenGoogleMaps(address: string) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    setSelectedAddressForMaps(null);
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
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="1400px" mx="auto">
        <VStack align="start" gap={1} mb={8}>
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="600" color="fg">
            Welcome, {userName || 'Guest'}
          </Text>
          <Text fontSize={{ base: "md", md: "lg" }} color="fg-muted">
            Manage appointments, customers, and your entire workflow.
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={6} mb={8}>
          {/* Customers */}
          <Box
            bg="white"
            borderRadius="12px"
            p={6}
            cursor="pointer"
            boxShadow="0 2px 8px rgba(0,0,0,0.08)"
            transition="all 0.3s"
            _hover={{ boxShadow: "0 8px 16px rgba(0,0,0,0.12)", transform: "translateY(-2px)" }}
            onClick={() => navigate("/customers")}
          >
          <Box
            bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            color="white"
            w="56px"
            h="56px"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
          >
            <Users size={28} strokeWidth={1.5} />
          </Box>
          <Text color="fg-muted" fontSize="sm" mb={1}>
            Customers
          </Text>
          <Text color="fg" fontSize="lg" fontWeight="600">
            {stats.activeContacts.toLocaleString()} contacts
          </Text>
        </Box>

        {/* Pipeline */}
        <Box
          bg="white"
          borderRadius="12px"
          p={6}
          cursor="pointer"
          boxShadow="0 2px 8px rgba(0,0,0,0.08)"
          transition="all 0.3s"
          _hover={{ boxShadow: "0 8px 16px rgba(0,0,0,0.12)", transform: "translateY(-2px)" }}
          onClick={() => navigate("/pipeline")}
        >
          <Box
            bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            color="white"
            w="56px"
            h="56px"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
          >
            <TrendingUp size={28} strokeWidth={1.5} />
          </Box>
          <Text color="fg-muted" fontSize="sm" mb={1}>
            Pipeline
          </Text>
          <Text color="fg" fontSize="lg" fontWeight="600">
            {stats.conversionRate.toFixed(1)}% conversion
          </Text>
        </Box>

        {/* Calendar */}
        <Box
          bg="white"
          borderRadius="12px"
          p={6}
          cursor="pointer"
          boxShadow="0 2px 8px rgba(0,0,0,0.08)"
          transition="all 0.3s"
          _hover={{ boxShadow: "0 8px 16px rgba(0,0,0,0.12)", transform: "translateY(-2px)" }}
          onClick={() => navigate("/calendar")}
        >
          <Box
            bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            color="white"
            w="56px"
            h="56px"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
          >
            <Calendar size={28} strokeWidth={1.5} />
          </Box>
          <Text color="fg-muted" fontSize="sm" mb={1}>
            Appointments
          </Text>
          <Text color="fg" fontSize="lg" fontWeight="600">
            {todayAppointments.length} today
          </Text>
        </Box>

        {/* New Appointment */}
        <Box
          bg="white"
          borderRadius="12px"
          p={6}
          cursor="pointer"
          boxShadow="0 2px 8px rgba(0,0,0,0.08)"
          transition="all 0.3s"
          _hover={{ boxShadow: "0 8px 16px rgba(0,0,0,0.12)", transform: "translateY(-2px)" }}
          onClick={() => navigate("/appointments/new")}
        >
          <Box
            bg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            color="white"
            w="56px"
            h="56px"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mb={4}
          >
            <Plus size={28} strokeWidth={1.5} />
          </Box>
          <Text color="fg-muted" fontSize="sm" mb={1}>
            New
          </Text>
          <Text color="fg" fontSize="lg" fontWeight="600">
            Quick add
          </Text>
        </Box>
        </SimpleGrid>

      {/* Today's Schedule */}
      <Box mt={{ base: 4, md: 8 }}>
        <Text fontSize="xl" fontWeight="500" color="black" mb={3}>
          Today&apos;s Schedule
        </Text>
        
        <Box
          bg="white"
          borderRadius="12px"
          boxShadow="0 2px 8px rgba(0,0,0,0.08)"
          p={{ base: 4, md: 5 }}
          minH={{ base: "120px", md: "150px" }}
        >
          {loading ? (
            <VStack justify="center" h={{ base: "120px", md: "150px" }}>
              <Spinner size="lg" color="gold.400" />
            </VStack>
          ) : todayAppointments.length === 0 ? (
            <VStack justify="center" h="120px">
              <Text color="fg-muted" fontSize="16px">
                No appointments scheduled for today
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" gap={2}>
              {todayAppointments.map((appt) => (
                <Box
                  key={appt.id}
                  p={{ base: 3, md: 4 }}
                  bg="#f8f9fa"
                  borderRadius="8px"
                  border="1px solid"
                  borderColor="bg-muted"
                  _hover={{ bg: "gray.100", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                  transition="all 0.2s"
                  onClick={() => handleAppointmentClick(appt)}
                >
                  <HStack justify="space-between" align="start" flexWrap={{ base: "wrap", sm: "nowrap" }} gap={{ base: 2, sm: 0 }}>
                    <VStack align="start" gap={0} flex={{ base: "1 1 100%", sm: "1" }}>
                      <Text fontWeight="500" color="fg" fontSize="16px">
                        {appt.customers?.full_name || "Unknown Customer"}
                      </Text>
                      <Text color="fg-muted" fontSize="0.75rem">
                        {formatPhoneNumber(appt.customers?.phone)}
                      </Text>
                    </VStack>
                    <Text color="#f59e0b" fontWeight="500" fontSize="0.75rem" whiteSpace="nowrap">
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
        <Box mt={{ base: 4, md: 8 }} maxW="700px">
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xl" fontWeight="500" color="fg">
              {showOnlyToday ? "Today's Appointments" : "Customer Locations"}
            </Text>
            <HStack gap={2}>
              <Button 
                size="sm"
                bg={showOnlyToday ? "gold.400" : "transparent"}
                color={showOnlyToday ? "black" : "fg-muted"}
                border={showOnlyToday ? "none" : "1px solid"}
                borderColor={showOnlyToday ? "transparent" : "bg-muted"}
                fontWeight="500"
                _hover={{
                  bg: showOnlyToday ? "gold.500" : "bg-muted",
                }}
                transition="colors 0.15s"
                onClick={() => setShowOnlyToday(!showOnlyToday)}
              >
                {showOnlyToday ? "Show All" : "Today Only"}
              </Button>
              {!showOnlyToday && (
                <select
                  style={{
                    width: '200px',
                    height: '32px',
                    fontSize: '14px',
                    padding: '0 8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  value={selectedPipelineStage}
                  onChange={(e) => setSelectedPipelineStage(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Appointment Scheduled">Appointment Scheduled</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              )}
              <Button 
                size="sm"
                onClick={() => navigate("/map")}
              >
                View Full Map
              </Button>
            </HStack>
          </HStack>
          
          <Box
            bg="white"
            borderRadius="12px"
            boxShadow="0 2px 8px rgba(0,0,0,0.08)"
            overflow="hidden"
            h="400px"
          >
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{
                  lat: customers.filter(c => c.lat).length > 0
                    ? customers.filter(c => c.lat).reduce((sum, c) => sum + (c.lat || 0), 0) / customers.filter(c => c.lat).length
                    : 27.9506,
                  lng: customers.filter(c => c.lng).length > 0
                    ? customers.filter(c => c.lng).reduce((sum, c) => sum + (c.lng || 0), 0) / customers.filter(c => c.lng).length
                    : -82.4572
                }}
                defaultZoom={10}
                mapId="boss-crm-map"
                style={{ width: "100%", height: "100%" }}
              >
                {showOnlyToday ? (
                  todayAppointments.map((appt) => {
                    if (!appt.lat || !appt.lng) return null;

                    return (
                      <AdvancedMarker
                        key={appt.id}
                        position={{ lat: appt.lat, lng: appt.lng }}
                        title={appt.customers?.full_name || "Unknown"}
                        onClick={() => setSelectedMapAppointment(appt)}
                      >
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                          <div style={{
                            background: 'white',
                            color: 'black',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            marginBottom: '4px'
                          }}>
                            {appt.customers?.full_name || "Unknown"}
                          </div>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#f59e0b',
                            border: '3px solid white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }} />
                        </div>
                      </AdvancedMarker>
                    );
                  })
                ) : (
                  customers
                    .filter(customer => selectedPipelineStage === "all" || customer.pipeline_stage === selectedPipelineStage)
                    .map((customer) => {
                    if (!customer.lat || !customer.lng) return null;

                    return (
                      <AdvancedMarker
                        key={customer.id}
                        position={{ lat: customer.lat, lng: customer.lng }}
                        title={customer.full_name}
                        onClick={() => setSelectedMapCustomer(customer)}
                      >
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                          <div style={{
                            background: 'white',
                            color: 'black',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            marginBottom: '4px'
                          }}>
                            {customer.full_name}
                          </div>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            border: '3px solid white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }} />
                        </div>
                      </AdvancedMarker>
                    );
                  })
                )}
                
                {/* InfoWindow for Appointment */}
                {selectedMapAppointment && selectedMapAppointment.lat && selectedMapAppointment.lng && (
                  <InfoWindow
                    position={{ lat: selectedMapAppointment.lat, lng: selectedMapAppointment.lng }}
                    onCloseClick={() => setSelectedMapAppointment(null)}
                  >
                    <div style={{ padding: '8px', minWidth: '200px' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        {selectedMapAppointment.customers?.full_name || "Unknown"}
                      </h3>
                      {selectedMapAppointment.customers?.phone && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          {selectedMapAppointment.customers.phone}
                        </p>
                      )}
                      {selectedMapAppointment.customers?.email && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          {selectedMapAppointment.customers.email}
                        </p>
                      )}
                      {selectedMapAppointment.customers?.address && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          <a 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenMapsSelection(selectedMapAppointment.customers!.address!);
                            }}
                            style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            {selectedMapAppointment.customers.address}
                          </a>
                        </p>
                      )}
                      <p style={{ margin: '8px 0 4px 0', fontSize: '12px', fontWeight: '500' }}>
                        {moment(selectedMapAppointment.start_time).format("MMM D, YYYY h:mm A")}
                      </p>
                      {selectedMapAppointment.description && (
                        <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>
                          {selectedMapAppointment.description}
                        </p>
                      )}
                    </div>
                  </InfoWindow>
                )}
                
                {/* InfoWindow for Customer */}
                {selectedMapCustomer && selectedMapCustomer.lat && selectedMapCustomer.lng && (
                  <InfoWindow
                    position={{ lat: selectedMapCustomer.lat, lng: selectedMapCustomer.lng }}
                    onCloseClick={() => setSelectedMapCustomer(null)}
                  >
                    <div style={{ padding: '8px', minWidth: '200px' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                        {selectedMapCustomer.full_name}
                      </h3>
                      {selectedMapCustomer.phone && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          {selectedMapCustomer.phone}
                        </p>
                      )}
                      {selectedMapCustomer.email && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          {selectedMapCustomer.email}
                        </p>
                      )}
                      {selectedMapCustomer.address && (
                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                          <a 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenMapsSelection(selectedMapCustomer.address);
                            }}
                            style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            {selectedMapCustomer.address}
                          </a>
                        </p>
                      )}
                      {selectedMapCustomer.pipeline_stage && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: 
                              selectedMapCustomer.pipeline_stage === 'Won' ? '#22C55E' :
                              selectedMapCustomer.pipeline_stage === 'Negotiation' ? '#10B981' :
                              selectedMapCustomer.pipeline_stage === 'Appointment Scheduled' ? '#F59E0B' :
                              selectedMapCustomer.pipeline_stage === 'Contacted' ? '#A78BFA' :
                              selectedMapCustomer.pipeline_stage === 'Lost' ? '#EF4444' :
                              '#60A5FA',
                            color: 'white'
                          }}>
                            {selectedMapCustomer.pipeline_stage}
                          </span>
                        </div>
                      )}
                      {selectedMapCustomer.estimated_price && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: '500' }}>
                          ${Number(selectedMapCustomer.estimated_price).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </Box>
        </Box>
      )}

      {/* Appointment Details Dialog */}
      <Dialog.Root open={open} onOpenChange={onClose} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="white" color="fg" border="1px solid" borderColor="bg-muted">
            <Dialog.Header>
              <Heading size="md" color="fg" fontWeight="500">
                Appointment Details
              </Heading>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              {selectedAppointment && (
                <VStack align="start" gap={4}>
                  <Box>
                    <Text fontWeight="500" color="fg">
                      Customer:
                    </Text>
                    <Text color="fg-muted">{selectedAppointment.customers?.full_name}</Text>
                  </Box>

                  {selectedAppointment.customers?.phone && (
                    <Box>
                      <Text fontWeight="500" color="fg">
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
                      <Text fontWeight="500" color="fg">
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
                      <Text fontWeight="500" color="fg">
                        Address:
                      </Text>
                      <a
                        href={`geo:0,0?q=${encodeURIComponent(selectedAppointment.customers.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#63B3ED", textDecoration: "none" }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        {selectedAppointment.customers.address}
                      </a>
                    </Box>
                  )}

                  <Box>
                    <Text fontWeight="500" color="fg">
                      Date:
                    </Text>
                    <Text color="fg-muted">
                      {moment(selectedAppointment.start_time).format("MMMM D, YYYY")}
                    </Text>
                    <Text color="fg-muted" fontSize="0.875rem">
                      {moment(selectedAppointment.start_time).tz("America/New_York").format("h:mm A")} -{" "}
                      {moment(selectedAppointment.end_time).tz("America/New_York").format("h:mm A")}
                    </Text>
                  </Box>

                  {selectedAppointment.description && (
                    <Box>
                      <Text fontWeight="500" color="fg">
                        Description:
                      </Text>
                      <Text color="fg-muted">{selectedAppointment.description}</Text>
                    </Box>
                  )}

                  {selectedAppointment.customers?.notes && (
                    <Box>
                      <Text fontWeight="500" color="fg">
                        Customer Notes:
                      </Text>
                      <Text color="fg-muted">{selectedAppointment.customers.notes}</Text>
                    </Box>
                  )}
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Flex gap={2} justify="space-between" w="full">
                <Button 
                  variant="ghost"
                  color="fg-muted"
                  size="sm"
                  _hover={{ bg: "bg-muted" }}
                  onClick={onClose}
                >
                  Close
                </Button>
                <Flex gap={2} flexWrap="wrap">
                  <Button 
                    variant="ghost"
                    color="orange.600"
                    size="sm"
                    _hover={{ bg: "orange.50" }}
                    onClick={() => {
                      if (selectedAppointment) {
                        downloadAppointmentICS({
                          id: selectedAppointment.id,
                          title: selectedAppointment.title || selectedAppointment.customers?.full_name || 'Appointment',
                          description: selectedAppointment.description,
                          startTime: new Date(selectedAppointment.start_time),
                          endTime: new Date(selectedAppointment.end_time),
                          location: selectedAppointment.customers?.address,
                          customerName: selectedAppointment.customers?.full_name
                        });
                      }
                    }}
                  >
                    Add to Calendar
                  </Button>
                  <Button 
                    variant="ghost"
                    color="blue.600"
                    size="sm"
                    _hover={{ bg: "blue.50" }}
                    onClick={handleSendReminder}
                  >
                    Send Reminder
                  </Button>
                  <Button 
                    variant="ghost"
                    color="orange.600"
                    size="sm"
                    _hover={{ bg: "orange.50" }}
                    onClick={() => {
                      onClose();
                      navigate("/calendar");
                    }}
                  >
                    View in Calendar
                  </Button>
                  <Button 
                    variant="ghost"
                    color="red.600"
                    size="sm"
                    _hover={{ bg: "red.50" }}
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

      {/* Maps Selection Dialog */}
      <Dialog.Root
        open={!!selectedAddressForMaps}
        onOpenChange={(e) => !e.open && setSelectedAddressForMaps(null)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.900" color="white" maxW="md">
            <Dialog.Header>
              <Dialog.Title>Choose Maps Service</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Text mb={4}>Select which maps app to open:</Text>
              <Text fontSize="sm" color="gray.400" mb={4} wordBreak="break-word">
                {selectedAddressForMaps}
              </Text>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button
                  variant="outline"
                  color="white"
                  onClick={() => setSelectedAddressForMaps(null)}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => selectedAddressForMaps && handleOpenAppleMaps(selectedAddressForMaps)}
                >
                  Apple Maps
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => selectedAddressForMaps && handleOpenGoogleMaps(selectedAddressForMaps)}
                >
                  Google Maps
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  </Box>
  );
}
