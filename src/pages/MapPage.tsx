import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Box, Heading, Text, Spinner, VStack, HStack } from "@chakra-ui/react";
import { Checkbox } from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type PipelineStage = "New" | "Contacted" | "Appointment Scheduled" | "Negotiation" | "Won" | "Lost";

interface Customer {
  id: string;
  full_name: string;
  address: string;
  pipeline_stage: PipelineStage;
  phone?: string;
  email?: string;
  job_type?: string;
  estimated_price?: number;
  lat?: number;
  lng?: number;
}

const STAGE_COLORS: Record<PipelineStage, string> = {
  "New": "#60A5FA",
  "Contacted": "#A78BFA",
  "Appointment Scheduled": "#F59E0B",
  "Negotiation": "#10B981",
  "Won": "#22C55E",
  "Lost": "#EF4444",
};

export default function MapPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedStages, setSelectedStages] = useState<Set<PipelineStage>>(
    new Set(["New", "Contacted", "Appointment Scheduled", "Negotiation", "Won", "Lost"])
  );

  useEffect(() => {
    loadCustomers();
  }, []);

  function toggleStage(stage: PipelineStage) {
    const newSelected = new Set(selectedStages);
    if (newSelected.has(stage)) {
      newSelected.delete(stage);
    } else {
      newSelected.add(stage);
    }
    setSelectedStages(newSelected);
  }

  async function loadCustomers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, address, pipeline_stage, phone, email, job_type, estimated_price")
      .not("address", "is", null)
      .not("address", "eq", "");

    if (!error && data) {
      const customersWithCoords = await geocodeCustomers(data);
      setCustomers(customersWithCoords);
    }
    setLoading(false);
  }

  async function geocodeCustomers(customers: any[]): Promise<Customer[]> {
    setGeocoding(true);
    const results: Customer[] = [];

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing!");
      setGeocoding(false);
      return customers;
    }

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
          console.warn(`No geocoding results for ${customer.full_name}: ${customer.address} (Status: ${data.status})`);
          if (data.error_message) {
            console.error(`API Error: ${data.error_message}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to geocode address for ${customer.full_name}:`, error);
      }
    }

    setGeocoding(false);
    return results;
  }

  if (loading || geocoding) {
    return (
      <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
        <Box maxW="1400px" mx="auto">
          <Heading mb={6} color="fg" fontWeight="500" fontSize="xl">
            Customer Map
          </Heading>
          <VStack h="400px" justify="center">
            <Spinner size="xl" color="gold.400" />
            <Text color="fg-muted" fontSize="16px">
              {geocoding ? "Geocoding addresses... This may take a moment." : "Loading customers..."}
            </Text>
          </VStack>
        </Box>
      </Box>
    );
  }

  if (customers.length === 0) {
    return (
      <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
        <Box maxW="1400px" mx="auto">
          <Heading mb={6} color="fg" fontWeight="500" fontSize="xl">
            Customer Map
          </Heading>
          <Box
            bg="white"
            border="none"
            borderRadius="12px"
            boxShadow="0 2px 8px rgba(0,0,0,0.08)"
            p={8}
            textAlign="center"
          >
            <Text color="fg" fontSize="18px">
              No customers with valid addresses found.
            </Text>
            <Text color="fg-muted" fontSize="0.875rem" mt={2}>
              Add addresses to your customers to see them on the map.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Filter customers based on selected stages
  const filteredCustomers = customers.filter(c => selectedStages.has(c.pipeline_stage));

  // Calculate center point (average of all coordinates)
  const centerLat = filteredCustomers.length > 0
    ? filteredCustomers.reduce((sum, c) => sum + (c.lat || 0), 0) / filteredCustomers.length
    : customers.reduce((sum, c) => sum + (c.lat || 0), 0) / customers.length;
  const centerLng = filteredCustomers.length > 0
    ? filteredCustomers.reduce((sum, c) => sum + (c.lng || 0), 0) / filteredCustomers.length
      : customers.reduce((sum, c) => sum + (c.lng || 0), 0) / customers.length;
  
    return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="1400px" mx="auto">
        <Heading mb={4} color="fg" fontWeight="500" fontSize="xl">
          Customer Map
        </Heading>

        <Text color="fg-muted" mb={4} fontSize="16px">
          Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? "s" : ""}
        </Text>

        {/* Filter Controls */}
        <Box 
          mb={4} 
          p={4} 
          bg="white" 
          borderRadius="12px" 
          border="none" 
          boxShadow="0 2px 8px rgba(0,0,0,0.08)"
          _hover={{ boxShadow: "0 8px 16px rgba(0,0,0,0.12)" }}
          transition="shadow 0.15s"
        >
          <Text fontWeight="500" color="fg" mb={3} fontSize="16px">
            Filter by Pipeline Stage:
          </Text>
          <HStack gap={4} flexWrap="wrap">
            {Object.entries(STAGE_COLORS).map(([stage, color]) => (
              <Checkbox.Root
                key={stage}
                checked={selectedStages.has(stage as PipelineStage)}
                onCheckedChange={() => toggleStage(stage as PipelineStage)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control borderColor="gray.300" />
              <Checkbox.Label>
                <HStack gap={2}>
                  <Box w="12px" h="12px" borderRadius="full" bg={color} />
                  <Text color="gray.600" fontSize="0.875rem" fontWeight="400">
                    {stage}
                  </Text>
                </HStack>
              </Checkbox.Label>
            </Checkbox.Root>
          ))}
        </HStack>
      </Box>

      {/* Map */}
      <Box
        h="600px"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        overflow="hidden"
        bg="white"
      >
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{
              lat: centerLat,
              lng: centerLng
            }}
            defaultZoom={10}
            mapId="boss-crm-map"
            style={{ width: "100%", height: "100%" }}
          >
            {filteredCustomers.map((customer) => {
              if (!customer.lat || !customer.lng) return null;

              const stageColor = STAGE_COLORS[customer.pipeline_stage];

              return (
                <AdvancedMarker
                  key={customer.id}
                  position={{ lat: customer.lat, lng: customer.lng }}
                  title={`${customer.full_name} - ${customer.pipeline_stage}`}
                  onClick={() => setSelectedCustomer(customer)}
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
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: stageColor,
                        border: "3px solid white",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                      }}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}
            
            {/* InfoWindow for Customer */}
            {selectedCustomer && selectedCustomer.lat && selectedCustomer.lng && (
              <InfoWindow
                position={{ lat: selectedCustomer.lat, lng: selectedCustomer.lng }}
                onCloseClick={() => setSelectedCustomer(null)}
              >
                <div style={{ padding: '8px', minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                    {selectedCustomer.full_name}
                  </h3>
                  {selectedCustomer.phone && (
                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                      {selectedCustomer.phone}
                    </p>
                  )}
                  {selectedCustomer.email && (
                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                      {selectedCustomer.email}
                    </p>
                  )}
                  {selectedCustomer.address && (
                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(selectedCustomer.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {selectedCustomer.address}
                      </a>
                    </p>
                  )}
                  {selectedCustomer.pipeline_stage && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        backgroundColor: STAGE_COLORS[selectedCustomer.pipeline_stage],
                        color: 'white'
                      }}>
                        {selectedCustomer.pipeline_stage}
                      </span>
                    </div>
                  )}
                  {selectedCustomer.estimated_price && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: '500' }}>
                      ${Number(selectedCustomer.estimated_price).toLocaleString()}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
        </Box>
      </Box>
    </Box>
  );
}
