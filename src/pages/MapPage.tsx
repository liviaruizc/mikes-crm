import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Box, Heading, Text, Spinner, VStack, HStack, Badge } from "@chakra-ui/react";
import { Checkbox } from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";
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

    for (const customer of customers) {
      try {
        // Use Nominatim (free OpenStreetMap geocoding service)
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

        // Rate limiting: wait 1 second between requests (Nominatim requirement)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to geocode address for ${customer.full_name}:`, error);
      }
    }

    setGeocoding(false);
    return results;
  }

  function createCustomIcon(stage: PipelineStage, customerName: string) {
    const color = STAGE_COLORS[stage];
    const svgIcon = `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" 
              fill="${color}" stroke="#000" stroke-width="1"/>
        <circle cx="16" cy="16" r="6" fill="#fff"/>
      </svg>
    `;

    const labelHtml = `
      <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); white-space: nowrap;">
        <div style="
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 1px solid ${color};
        ">
          ${customerName}
        </div>
      </div>
    `;

    return L.divIcon({
      html: labelHtml + svgIcon,
      className: "custom-marker-with-label",
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });
  }

  if (loading || geocoding) {
    return (
      <Box>
        <Heading mb={6} color="gold.300">
          Customer Map
        </Heading>
        <VStack h="400px" justify="center">
          <Spinner size="xl" color="gold.400" />
          <Text color="gray.400">
            {geocoding ? "Geocoding addresses... This may take a moment." : "Loading customers..."}
          </Text>
        </VStack>
      </Box>
    );
  }

  if (customers.length === 0) {
    return (
      <Box>
        <Heading mb={6} color="gold.300">
          Customer Map
        </Heading>
        <Box
          bg="gray.800"
          border="1px solid #2A2A2A"
          borderRadius="lg"
          p={8}
          textAlign="center"
        >
          <Text color="gray.400" fontSize="lg">
            No customers with valid addresses found.
          </Text>
          <Text color="gray.500" fontSize="sm" mt={2}>
            Add addresses to your customers to see them on the map.
          </Text>
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
    <Box>
      <Heading mb={4} color="gold.300">
        Customer Map
      </Heading>

      <Text color="gray.400" mb={4}>
        Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? "s" : ""}
      </Text>

      {/* Filter Controls */}
      <Box mb={4} p={4} bg="gray.800" borderRadius="md" border="1px solid #2A2A2A">
        <Text fontWeight="semibold" color="white" mb={3}>
          Filter by Pipeline Stage:
        </Text>
        <HStack gap={4} flexWrap="wrap">
          {Object.entries(STAGE_COLORS).map(([stage, color]) => (
            <Checkbox.Root
              key={stage}
              checked={selectedStages.has(stage as PipelineStage)}
              onCheckedChange={() => toggleStage(stage as PipelineStage)}
              colorPalette="yellow"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <HStack gap={2}>
                  <Box w="12px" h="12px" borderRadius="full" bg={color} />
                  <Text color="gray.300" fontSize="sm">
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
        border="1px solid #2A2A2A"
        borderRadius="lg"
        overflow="hidden"
      >
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredCustomers.map((customer) => {
            if (!customer.lat || !customer.lng) return null;

            return (
              <Marker
                key={customer.id}
                position={[customer.lat, customer.lng]}
                icon={createCustomIcon(customer.pipeline_stage, customer.full_name)}
              >
                <Popup>
                  <Box p={2} minW="200px">
                    <Text fontWeight="bold" fontSize="md" mb={1}>
                      {customer.full_name}
                    </Text>
                    <Badge
                      colorScheme={
                        customer.pipeline_stage === "Won" ? "green" :
                        customer.pipeline_stage === "Lost" ? "red" :
                        customer.pipeline_stage === "Negotiation" ? "yellow" :
                        "blue"
                      }
                      mb={2}
                    >
                      {customer.pipeline_stage}
                    </Badge>
                    <VStack align="start" gap={1} fontSize="sm">
                      {customer.phone && (
                        <Text>📞 {customer.phone}</Text>
                      )}
                      {customer.email && (
                        <Text>📧 {customer.email}</Text>
                      )}
                      {customer.job_type && (
                        <Text>🔨 {customer.job_type}</Text>
                      )}
                      {customer.estimated_price && (
                        <Text>💰 ${customer.estimated_price.toLocaleString()}</Text>
                      )}
                      <Text color="gray.600" fontSize="xs" mt={1}>
                        📍 {customer.address}
                      </Text>
                    </VStack>
                  </Box>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Box>
    </Box>
  );
}
