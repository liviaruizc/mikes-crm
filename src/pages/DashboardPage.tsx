import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  SimpleGrid,
  VStack,
  Text,
  Badge,
  Spinner,
  Flex,
  createToaster,
  Dialog,
  Button,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";

const toaster = createToaster({
  placement: "top",
  duration: 2500,
});

type PipelineStage =
  | "New"
  | "Contacted"
  | "Appointment Scheduled"
  | "Negotiation"
  | "Won"
  | "Lost";

const STAGES: PipelineStage[] = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Negotiation",
  "Won",
  "Lost",
];

type PipelineItem = {
  id: string;
  type: "appointment" | "customer";
  pipeline_stage: PipelineStage;
  title: string;
  customerName: string | null;
  job_type?: string | null;
  estimated_price?: number | null;
  date?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  appointmentId?: string | null;
  appointmentTitle?: string | null;
  appointmentDescription?: string | null;
};

export default function DashboardPage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPipelineData();
  }, []);

  async function loadPipelineData() {
    setLoading(true);

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(
        `
        id,
        title,
        description,
        start_time,
        customer_id,
        customers (
          full_name,
          phone,
          email,
          address,
          notes,
          job_type,
          estimated_price
        )
      `
      )
      .order("start_time");

    const { data: customersData } = await supabase
      .from("customers")
      .select(
        `
        id,
        full_name,
        phone,
        email,
        address,
        notes,
        job_type,
        estimated_price,
        pipeline_stage,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    const customerAppointmentMap = new Map<string, any>();
    (appointmentsData || []).forEach((appt) => {
      if (!customerAppointmentMap.has(appt.customer_id)) {
        customerAppointmentMap.set(appt.customer_id, appt);
      }
    });

    const customerItems: PipelineItem[] = (customersData || []).map(
      (customer) => {
        const appointment = customerAppointmentMap.get(customer.id);

        return {
          id: `cust-${customer.id}`,
          type: "customer",
          pipeline_stage: customer.pipeline_stage,
          title: customer.full_name || "Unnamed customer",
          customerName: customer.full_name,
          phone: customer.phone,
          email: customer.email,
          address: (customer as any).address,
          notes: (customer as any).notes,
          job_type: customer.job_type,
          estimated_price: customer.estimated_price,
          date: appointment ? appointment.start_time : customer.created_at,
          appointmentId: appointment?.id || null,
          appointmentTitle: appointment?.title || null,
          appointmentDescription: appointment?.description || null,
        };
      }
    );

    setItems(customerItems);
    setLoading(false);
  }

  async function updateStage(
    id: string,
    type: "appointment" | "customer",
    newStage: PipelineStage
  ) {
    const previous = [...items];

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, pipeline_stage: newStage } : item
      )
    );

    setSelectedCardId(null);

    const dbId = id.replace(/^(appt-|cust-)/, "");
    const table = type === "appointment" ? "appointments" : "customers";

    const { error } = await supabase
      .from(table)
      .update({ pipeline_stage: newStage })
      .eq("id", dbId);

    if (error) {
      setItems(previous);
      toaster.create({
        title: "Update failed",
        description: "Could not move item.",
        type: "error",
      });
    } else {
      toaster.create({
        title: "Stage updated",
        description: `Moved to "${newStage}".`,
        type: "success",
      });
    }
  }

  async function handleCancelAppointment() {
    if (!selectedItem?.appointmentId) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", selectedItem.appointmentId);

    if (error) {
      toaster.create({
        title: "Error",
        description: "Failed to cancel appointment",
        type: "error",
      });
      return;
    }

    toaster.create({
      title: "Success",
      description: "Appointment cancelled",
      type: "success",
    });

    await loadPipelineData();
    setSelectedItem(null);
  }

  function getItemsByStage(stage: PipelineStage) {
    return items.filter((item) => item.pipeline_stage === stage);
  }

  function handleCardClick(item: PipelineItem) {
    if (selectedCardId === item.id) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(item.id);
    }
  }

  function handleStageClick(targetStage: PipelineStage) {
    if (!selectedCardId) return;

    const card = items.find((item) => item.id === selectedCardId);
    if (!card) return;

    if (card.pipeline_stage === targetStage) {
      setSelectedCardId(null);
      return;
    }

    updateStage(selectedCardId, card.type, targetStage);
  }

  if (loading) {
    return (
      <Box bg="bg" minH="100vh" display="flex" justifyContent="center" alignItems="center">
        <Spinner size="xl" color="gold.400" />
      </Box>
    );
  }

  return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="1400px" mx="auto">
        <Heading mb={2} color="fg" letterSpacing="wide">
          Pipeline
        </Heading>

        <Text color="fg-muted" mb={8}>
          Click a card to select it, then click a stage column to move it.
        </Text>

      <SimpleGrid columns={{ base: 1, md: 3, lg: 6 }} gap={4}>
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            title={stage}
            stage={stage}
            items={getItemsByStage(stage)}
            onCardClick={handleCardClick}
            onStageClick={handleStageClick}
            selectedCardId={selectedCardId}
            hasSelectedCard={!!selectedCardId}
          />
        ))}
      </SimpleGrid>

      <Dialog.Root
        open={!!selectedItem}
        onOpenChange={(e) => !e.open && setSelectedItem(null)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.900" color="white" maxW="lg">
            <Dialog.Header>
              <Dialog.Title>{selectedItem?.title}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.400" mb={2}>
                    Move to Stage:
                  </Text>
                  <select
                    value={selectedItem?.pipeline_stage}
                    onChange={(e: any) => {
                      if (selectedItem) {
                        updateStage(
                          selectedItem.id,
                          selectedItem.type,
                          e.target.value as PipelineStage
                        );
                      }
                    }}
                    style={{
                      backgroundColor: "#1A202C",
                      color: "#D69E2E",
                      border: "1px solid #D69E2E",
                      borderRadius: "0.375rem",
                      fontSize: "1rem",
                      padding: "0.5rem",
                      width: "100%",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </Box>

                {selectedItem?.phone && (
                  <Info label="Phone" value={selectedItem.phone} />
                )}
                {selectedItem?.email && (
                  <Info label="Email" value={selectedItem.email} />
                )}
                {selectedItem?.address && (
                  <Info label="Address" value={selectedItem.address} />
                )}
                {selectedItem?.notes && (
                  <Info label="Notes" value={selectedItem.notes} />
                )}
                {selectedItem?.job_type && (
                  <Info label="Job Type" value={selectedItem.job_type} />
                )}
                {typeof selectedItem?.estimated_price === "number" && (
                  <Info
                    label="Estimated Price"
                    value={`$${selectedItem.estimated_price}`}
                  />
                )}
                {selectedItem?.date && (
                  <Info
                    label={
                      selectedItem.appointmentId
                        ? "Appointment Date"
                        : "Customer Created"
                    }
                    value={new Date(selectedItem.date).toLocaleString()}
                  />
                )}
                {selectedItem?.appointmentTitle && (
                  <Info
                    label="Appointment Title"
                    value={selectedItem.appointmentTitle}
                  />
                )}
                {selectedItem?.appointmentDescription && (
                  <Info
                    label="Description"
                    value={selectedItem.appointmentDescription}
                  />
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Flex gap={2} justify="flex-end" w="full">
                <Button onClick={() => setSelectedItem(null)} variant="outline">
                  Close
                </Button>

                {selectedItem?.type === "customer" &&
                  !selectedItem?.appointmentId && (
                    <Button
                      colorScheme="yellow"
                      onClick={() => {
                        const id = selectedItem.id.replace("cust-", "");
                        navigate(`/appointments/new?customerId=${id}`);
                      }}
                    >
                      Create Appointment
                    </Button>
                  )}

                {selectedItem?.appointmentId && (
                  <Button colorScheme="red" onClick={handleCancelAppointment}>
                    Cancel Appointment
                  </Button>
                )}
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>      </Box>    </Box>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fontSize="sm" color="gray.500">
        {label}
      </Text>
      <Text fontWeight="medium">{value}</Text>
    </Box>
  );
}

function PipelineColumn({
  title,
  stage,
  items,
  onCardClick,
  onStageClick,
  selectedCardId,
  hasSelectedCard,
}: {
  title: PipelineStage;
  stage: PipelineStage;
  items: PipelineItem[];
  onCardClick: (item: PipelineItem) => void;
  onStageClick: (stage: PipelineStage) => void;
  selectedCardId: string | null;
  hasSelectedCard: boolean;
}) {
  return (
    <Box
      bg="#0F0F0F"
      border="1px solid"
      borderColor={hasSelectedCard ? "gold.500" : "#2A2A2A"}
      rounded="lg"
      p={3}
      minH="240px"
      shadow="md"
      transition="all 0.2s ease"
      cursor={hasSelectedCard ? "pointer" : "default"}
      onClick={() => hasSelectedCard && onStageClick(stage)}
      _hover={
        hasSelectedCard
          ? {
              borderColor: "gold.300",
              shadow: "xl",
              bg: "#1A1A1A",
            }
          : undefined
      }
    >
      <Flex
        justify="space-between"
        align="center"
        mb={3}
        cursor={hasSelectedCard ? "pointer" : "default"}
      >
        <Text fontSize="sm" fontWeight="semibold" color="gold.300">
          {title}
        </Text>

        <Badge
          bg="gold.300"
          color="black"
          fontSize="0.75rem"
          px={2}
          py={0.5}
          rounded="full"
        >
          {items.length}
        </Badge>
      </Flex>

      <VStack gap={2} align="stretch">
        {items.map((item) => (
          <PipelineCard
            key={item.id}
            item={item}
            onClick={(e, item) => {
              e.stopPropagation();
              onCardClick(item);
            }}
            isSelected={item.id === selectedCardId}
          />
        ))}
      </VStack>
    </Box>
  );
}

function PipelineCard({
  item,
  onClick,
  isSelected,
}: {
  item: PipelineItem;
  onClick: (e: React.MouseEvent, item: PipelineItem) => void;
  isSelected: boolean;
}) {
  return (
    <Box
      bg={isSelected ? "#2A2A2A" : "#111"}
      border="2px solid"
      borderColor={isSelected ? "gold.300" : "#2A2A2A"}
      rounded="lg"
      p={3}
      transition="all 0.2s ease"
      cursor="pointer"
      _hover={{
        borderColor: isSelected ? "gold.400" : "gold.300",
        transform: "translateY(-2px)",
        shadow: "lg",
        bg: isSelected ? "#333" : "#1A1A1A",
      }}
      onClick={(e) => onClick(e, item)}
      boxShadow={isSelected ? "0 0 0 2px rgba(212, 175, 55, 0.3)" : undefined}
    >
      <Flex justify="space-between" align="start" mb={1}>
        <Text fontWeight="semibold" color="white">
          {item.title}
        </Text>
      </Flex>

      {item.job_type && (
        <Text fontSize="xs" color="gray.400">
          Job: {item.job_type}
        </Text>
      )}

      {typeof item.estimated_price === "number" && (
        <Text fontSize="xs" color="gray.400">
          Est: ${item.estimated_price.toFixed(2)}
        </Text>
      )}

      {item.date && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {new Date(item.date).toLocaleString()}
        </Text>
      )}
    </Box>
  );
}
