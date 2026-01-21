import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  SimpleGrid,
  VStack,
  HStack,
  Spinner,
  Badge,
  useDisclosure,
  Dialog,
  Flex,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import CustomerForm from "../components/Customers/CustomerForm";

type DealStage = "New" | "Contacted" | "Appointment Scheduled" | "Negotiation" | "Won" | "Lost";

interface Deal {
  id: string;
  full_name: string;
  job_type?: string;
  estimated_price?: number;
  pipeline_stage: DealStage;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Stage badge colors
const STAGE_COLORS: Record<DealStage, { bg: string; color: string; label: string }> = {
  "New": { bg: "#DBEAFE", color: "#1E40AF", label: "New" },
  "Contacted": { bg: "#E0E7FF", color: "#4338CA", label: "Contacted" },
  "Appointment Scheduled": { bg: "#FEF3C7", color: "#D97706", label: "Appointment Scheduled" },
  "Negotiation": { bg: "#D1FAE5", color: "#047857", label: "Negotiation" },
  "Won": { bg: "#D1FAE5", color: "#15803D", label: "Won" },
  "Lost": { bg: "#FEE2E2", color: "#DC2626", label: "Lost" },
};

// Progress bar calculation
const calculateProbability = (stage: DealStage): number => {
  const probabilities: Record<DealStage, number> = {
    "New": 10,
    "Contacted": 25,
    "Appointment Scheduled": 60,
    "Negotiation": 80,
    "Won": 100,
    "Lost": 0,
  };
  return probabilities[stage];
};

export default function DealsPage() {
  const navigate = useNavigate();
  const { open, onOpen, onClose } = useDisclosure();
  const { open: editOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDeals(data as Deal[]);
    }
    setLoading(false);
  }

  function handleDealClick(deal: Deal) {
    setSelectedDeal(deal);
    onOpen();
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }

  function formatCurrency(amount?: number): string {
    if (!amount) return "$0";
    return `$${amount.toLocaleString()}`;
  }

  function formatPhoneNumber(phone?: string): string {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  async function handleDeleteDeal(dealId: string, dealName: string) {
    if (!confirm(`Are you sure you want to delete ${dealName}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", dealId);

    if (error) {
      console.error("Failed to delete deal:", error);
      alert("Failed to delete deal. Please try again.");
    } else {
      onClose();
      onEditClose();
      setSelectedDeal(null);
      loadDeals();
    }
  }

  return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="1400px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <VStack align="start" gap={1}>
            <Heading color="fg" fontWeight="500" fontSize="xl">
              Deals
            </Heading>
            <Text color="fg-muted" fontSize="16px">
              Track your sales pipeline
            </Text>
          </VStack>
          <Button
            bg="gold.400"
            color="black"
            fontWeight="500"
            _hover={{ bg: "gold.500" }}
            transition="colors 0.15s"
            onClick={() => navigate("/customers")}
          >
            + New Deal
          </Button>
        </Flex>

      {/* Filter */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack gap={2}>
          <Text color="gray.600" fontSize="0.875rem" fontWeight="500">
            Filter by stage:
          </Text>
          <NativeSelectRoot size="sm" w="200px">
            <NativeSelectField
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              color="black"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
            >
              <option value="all">All Deals</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Appointment Scheduled">Appointment Scheduled</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </NativeSelectField>
          </NativeSelectRoot>
        </HStack>
        <Text color="gray.600" fontSize="0.875rem">
          {filterStage === "all" 
            ? `${deals.length} total deals` 
            : `${deals.filter(d => d.pipeline_stage === filterStage).length} ${filterStage} deals`
          }
        </Text>
      </Flex>

      {/* Loading State */}
      {loading ? (
        <VStack justify="center" h="400px">
          <Spinner size="xl" color="#f59e0b" />
        </VStack>
      ) : deals.length === 0 ? (
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p={8}
          textAlign="center"
        >
          <Text color="gray.600" fontSize="18px">
            No deals found.
          </Text>
          <Text color="gray.400" fontSize="0.875rem" mt={2}>
            Create your first deal to get started.
          </Text>
        </Box>
      ) : (
        /* Deals Grid */
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap={4}>
          {deals
            .filter(deal => filterStage === "all" || deal.pipeline_stage === filterStage)
            .map((deal) => {
            const stageInfo = STAGE_COLORS[deal.pipeline_stage as DealStage] || STAGE_COLORS["New"];
            const probability = calculateProbability(deal.pipeline_stage as DealStage);

            return (
              <Box
                key={deal.id}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="lg"
                p={4}
                _hover={{ boxShadow: "lg", cursor: "pointer" }}
                transition="shadow 0.15s"
                onClick={() => handleDealClick(deal)}
              >
                <VStack align="start" gap={3} w="full">
                  {/* Header with title and badge */}
                  <Flex justify="space-between" align="start" w="full">
                    <Text
                      fontSize="16px"
                      fontWeight="500"
                      color="black"
                      lineClamp={1}
                      flex="1"
                    >
                      {deal.full_name}
                    </Text>
                    <Badge
                      bg={stageInfo.bg}
                      color={stageInfo.color}
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="0.75rem"
                      fontWeight="500"
                      ml={2}
                      flexShrink={0}
                    >
                      {stageInfo.label}
                    </Badge>
                  </Flex>

                  {/* Company/Customer Name */}
                  <Text color="gray.600" fontSize="0.875rem">
                    {deal.full_name}
                  </Text>

                  {/* Price */}
                  <HStack gap={1}>
                    <Text color="#f59e0b" fontSize="16px" fontWeight="500">
                      $
                    </Text>
                    <Text color="#f59e0b" fontSize="16px" fontWeight="500">
                      {formatCurrency(deal.estimated_price)}
                    </Text>
                  </HStack>

                  {/* Date */}
                  <HStack gap={1}>
                    <Text color="#f59e0b" fontSize="0.875rem">
                      ◷
                    </Text>
                    <Text color="gray.600" fontSize="0.875rem">
                      {formatDate(deal.updated_at || deal.created_at)}
                    </Text>
                  </HStack>

                  {/* Contact Person */}
                  {deal.phone && (
                    <HStack gap={1}>
                      <Text color="#f59e0b" fontSize="0.875rem">
Phone
                      </Text>
                      <Text color="gray.600" fontSize="0.875rem" lineClamp={1}>
                        {formatPhoneNumber(deal.phone)}
                      </Text>
                    </HStack>
                  )}

                  {/* Probability Progress Bar */}
                  <Box w="full" mt={1}>
                    <Flex justify="space-between" mb={1}>
                      <Text color="gray.600" fontSize="0.75rem" fontWeight="500">
                        Probability
                      </Text>
                      <Text color="black" fontSize="0.75rem" fontWeight="500">
                        {probability}%
                      </Text>
                    </Flex>
                    <Box w="full" h="6px" bg="gray.200" borderRadius="full" overflow="hidden">
                      <Box
                        h="full"
                        bg="#f59e0b"
                        w={`${probability}%`}
                        transition="width 0.3s"
                      />
                    </Box>
                  </Box>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {/* Deal Details Dialog */}
      <Dialog.Root open={open} onOpenChange={onClose} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="white" color="black" border="1px solid" borderColor="gray.200">
            <Dialog.Header fontWeight="500" fontSize="xl">
              Deal Details
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              {selectedDeal && (
                <VStack align="start" gap={4}>
                  <Box>
                    <Text fontWeight="500" color="black">
                      Deal:
                    </Text>
                    <Text color="gray.600">{selectedDeal.job_type || "Untitled"}</Text>
                  </Box>

                  <Box>
                    <Text fontWeight="500" color="black">
                      Customer:
                    </Text>
                    <Text color="gray.600">{selectedDeal.full_name}</Text>
                  </Box>

                  <Box>
                    <Text fontWeight="500" color="black">
                      Stage:
                    </Text>
                    <Badge
                      bg={STAGE_COLORS[selectedDeal.pipeline_stage as DealStage]?.bg}
                      color={STAGE_COLORS[selectedDeal.pipeline_stage as DealStage]?.color}
                      px={3}
                      py={1}
                      borderRadius="md"
                      fontSize="0.875rem"
                      fontWeight="500"
                      mt={1}
                    >
                      {STAGE_COLORS[selectedDeal.pipeline_stage as DealStage]?.label}
                    </Badge>
                  </Box>

                  <Box>
                    <Text fontWeight="500" color="black">
                      Estimated Value:
                    </Text>
                    <Text color="#f59e0b" fontSize="18px" fontWeight="500">
                      {formatCurrency(selectedDeal.estimated_price)}
                    </Text>
                  </Box>

                  {selectedDeal.phone && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Phone:
                      </Text>
                      <Text color="gray.600">{formatPhoneNumber(selectedDeal.phone)}</Text>
                    </Box>
                  )}

                  {selectedDeal.email && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Email:
                      </Text>
                      <Text color="gray.600">{selectedDeal.email}</Text>
                    </Box>
                  )}

                  {selectedDeal.address && (
                    <Box>
                      <Text fontWeight="500" color="black" mb={1}>
                        Address:
                      </Text>
                      <a
                        href={`https://maps.apple.com/?daddr=${encodeURIComponent(selectedDeal.address || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: "#f59e0b",
                          cursor: "pointer",
                          textDecoration: "none"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        {selectedDeal.address}
                      </a>
                    </Box>
                  )}

                  {selectedDeal.notes && (
                    <Box>
                      <Text fontWeight="500" color="black">
                        Notes:
                      </Text>
                      <Text color="gray.600">{selectedDeal.notes}</Text>
                    </Box>
                  )}

                  <Box w="full">
                    <Text fontWeight="500" color="black" mb={2}>
                      Probability: {calculateProbability(selectedDeal.pipeline_stage as DealStage)}%
                    </Text>
                    <Box w="full" h="8px" bg="gray.200" borderRadius="full" overflow="hidden">
                      <Box
                        h="full"
                        bg="#f59e0b"
                        w={`${calculateProbability(selectedDeal.pipeline_stage as DealStage)}%`}
                        transition="width 0.3s"
                      />
                    </Box>
                  </Box>
                </VStack>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Flex justify="space-between" w="full">
                <Button
                  size="sm"
                  bg="transparent"
                  color="red.600"
                  fontWeight="500"
                  px={3}
                  _hover={{ bg: "red.50" }}
                  transition="colors 0.15s"
                  onClick={() => selectedDeal && handleDeleteDeal(selectedDeal.id, selectedDeal.full_name)}
                >
                  Delete
                </Button>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    border="1px solid"
                    borderColor="gray.300"
                    color="gray.600"
                    fontWeight="500"
                    px={3}
                    _hover={{ bg: "gray.100" }}
                    transition="colors 0.15s"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    bg="#f59e0b"
                    color="black"
                    fontWeight="500"
                    px={3}
                    _hover={{ bg: "#d97706" }}
                    transition="colors 0.15s"
                    onClick={() => {
                      onClose();
                      onEditOpen();
                    }}
                  >
                    Edit
                  </Button>
                </Flex>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Customer Form */}
      <CustomerForm
        open={editOpen}
        onClose={() => {
          onEditClose();
          loadDeals();
          setSelectedDeal(null);
        }}
        existingCustomer={selectedDeal as any}
      />
      </Box>
    </Box>
  );
}
