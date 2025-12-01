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
  NativeSelectRoot,
  NativeSelectField,
  createToaster,
  Dialog,
  Button,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    loadPipelineData();
  }, []);

  async function loadPipelineData() {
    setLoading(true);

    console.log('Loading pipeline data...');

    const { data: appointmentsData, error: apptError } = await supabase
      .from("appointments")
      .select(
        `
        id,
        title,
        description,
        start_time,
        pipeline_stage,
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

    console.log('Appointments data:', appointmentsData, 'Error:', apptError);

    const { data: customersData, error: custError } = await supabase
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

    console.log('Customers data:', customersData, 'Error:', custError);

    const customerAppointmentMap = new Map<string, any>();
    (appointmentsData || []).forEach((appt) => {
      if (!customerAppointmentMap.has(appt.customer_id)) {
        customerAppointmentMap.set(appt.customer_id, appt);
      }
    });

    const customerItems: PipelineItem[] = (customersData || []).map((customer) => {
      const appointment = customerAppointmentMap.get(customer.id);

      return {
        id: `cust-${customer.id}`,
        type: "customer",
        pipeline_stage: appointment ? "Appointment Scheduled" : customer.pipeline_stage,
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
    });

    console.log('Customer items:', customerItems);
    setItems(customerItems);
    setLoading(false);
  }

  async function updateStage(id: string, type: "appointment" | "customer", newStage: PipelineStage) {
    const previous = [...items];

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, pipeline_stage: newStage } : item
      )
    );

    const dbId = id.replace(/^(appt-|cust-)/, "");
    const table = type === "appointment" ? "appointments" : "customers";

    const { error } = await supabase.from(table).update({ pipeline_stage: newStage }).eq("id", dbId);

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const itemId = active.id as string;
    const newStage = over.id as PipelineStage;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.pipeline_stage !== newStage) {
      updateStage(itemId, item.type, newStage);
    }
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  if (loading) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner color="gold.300" size="xl" />
      </Flex>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box>
        <Heading mb={2} color="gold.300" letterSpacing="wide">
          Pipeline
        </Heading>

        <Text color="gray.400" mb={8}>
          Track leads and appointments as they move through your sales process.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 3, lg: 6 }} gap={4}>
          {STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              title={stage}
              stage={stage}
              items={getItemsByStage(stage)}
              onChangeStage={updateStage}
              onItemClick={setSelectedItem}
            />
          ))}
        </SimpleGrid>
      </Box>

      <DragOverlay>
        {activeItem ? (
          <Box
            bg="#0D0D0D"
            border="2px solid #D4AF37"
            rounded="md"
            p={3}
            opacity={0.9}
            minW="200px"
            shadow="lg"
          >
            <Text fontWeight="semibold">{activeItem.title}</Text>
          </Box>
        ) : null}
      </DragOverlay>

      <Dialog.Root open={!!selectedItem} onOpenChange={(e) => !e.open && setSelectedItem(null)} size="lg">
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="gray.900" border="1px solid #333">
            <Dialog.Header>
              <Heading size="md" color="gold.300">
                {selectedItem?.title}
              </Heading>
            </Dialog.Header>
            <Dialog.CloseTrigger />

            <Dialog.Body>
              <VStack align="stretch" gap={4}>
                {selectedItem?.customerName && (
                  <Info label="Customer Name" value={selectedItem.customerName} />
                )}
                {selectedItem?.phone && <Info label="Phone" value={selectedItem.phone} />}
                {selectedItem?.email && <Info label="Email" value={selectedItem.email} />}
                {selectedItem?.address && <Info label="Address" value={selectedItem.address} />}
                {selectedItem?.job_type && <Info label="Job Type" value={selectedItem.job_type} />}
                {selectedItem?.estimated_price !== null && selectedItem?.estimated_price !== undefined && (
                  <Info label="Estimated Price" value={`$${selectedItem.estimated_price}`} />
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
                  <Info label="Appointment Title" value={selectedItem.appointmentTitle} />
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

                {selectedItem?.type === "customer" && !selectedItem?.appointmentId && (
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
      </Dialog.Root>
    </DndContext>
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
  onChangeStage,
  onItemClick,
}: {
  title: PipelineStage;
  stage: PipelineStage;
  items: PipelineItem[];
  onChangeStage: (id: string, type: "appointment" | "customer", newStage: PipelineStage) => void;
  onItemClick: (item: PipelineItem) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage });

  return (
    <Box
      ref={setNodeRef}
      bg="#0F0F0F"
      border="1px solid #2A2A2A"
      rounded="lg"
      p={3}
      minH="240px"
      shadow="md"
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontWeight="bold" color="gold.300">
          {title}
        </Text>

        <Badge
          bg="gold.300"
          color="black"
          fontSize="0.75rem"
          px={2}
          py={0.5}
          rounded="md"
        >
          {items.length}
        </Badge>
      </Flex>

      <VStack align="stretch" gap={3}>
        {items.length === 0 && (
          <Text fontSize="xs" color="gray.500">
            No items yet.
          </Text>
        )}

        {items.map((item) => (
          <DraggableCard
            key={item.id}
            item={item}
            onChangeStage={onChangeStage}
            onClick={onItemClick}
          />
        ))}
      </VStack>
    </Box>
  );
}

function DraggableCard({
  item,
  onChangeStage,
  onClick,
}: {
  item: PipelineItem;
  onChangeStage: (id: string, type: "appointment" | "customer", newStage: PipelineStage) => void;
  onClick: (item: PipelineItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      bg="#111"
      border="1px solid #2A2A2A"
      rounded="lg"
      p={3}
      transition="0.2s"
      cursor="grab"
      _hover={{
        borderColor: "gold.300",
        transform: "translateY(-2px)",
      }}
      onClick={(e) => {
        if (!isDragging && e.currentTarget === e.target) onClick(item);
      }}
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

      <Box mt={3}>
        <Text fontSize="xs" color="gray.500" mb={1}>
          Change stage
        </Text>

        <NativeSelectRoot size="xs">
          <NativeSelectField
            value={item.pipeline_stage}
            onChange={(e) => {
              e.stopPropagation();
              onChangeStage(item.id, item.type, e.target.value as PipelineStage);
            }}
            bg="black"
            color="gold"
            border="1px solid #3A3A3A"
          >
            {STAGES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </NativeSelectField>
        </NativeSelectRoot>
      </Box>
    </Box>
  );
}
