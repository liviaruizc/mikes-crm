import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Table,
  Spinner,
  useDisclosure,
  HStack,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";
import CustomerForm from "../components/Customers/CustomerForm";
import type { Customer } from "../lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { open, onOpen, onClose } = useDisclosure();

  // Fetch customers
  async function loadCustomers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select(`
        id,
        full_name,
        phone,
        email,
        address,
        notes,
        job_type,
        estimated_price,
        pipeline_stage,
        lead_source_id,
        lead_sources(name, color)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) setCustomers(data as any);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function handleEditCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    onOpen();
  }

  function handleCloseDialog() {
    setSelectedCustomer(null);
    onClose();
    loadCustomers();
  }

  async function handleDeleteCustomer(customerId: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
    } else {
      loadCustomers();
    }
  }

  return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="1400px" mx="auto">
        <Box mb={6}>
          <Heading size="lg" fontWeight="500" color="fg">Customers</Heading>
          <Text color="fg-muted">Manage your customer list and lead sources.</Text>
        </Box>

        <Button 
          onClick={() => { setSelectedCustomer(null); onOpen(); }}
          bg="gold.400"
          color="black"
          fontWeight="500"
          _hover={{ bg: "gold.500" }}
          transition="colors 0.15s"
          mb={4}
        >
          + New Customer
        </Button>

        {loading ? (
          <Spinner size="xl" color="gold.400" />
        ) : (
          <Table.Root variant="outline" bg="white" borderRadius="12px" border="none" boxShadow="0 2px 8px rgba(0,0,0,0.08)">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader color="black" fontWeight="500">Name</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Phone</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Email</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Address</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Job Type</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Estimated Price</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Pipeline Stage</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Notes</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Lead Source</Table.ColumnHeader>
              <Table.ColumnHeader color="black" fontWeight="500">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {customers.map((c) => (
              <Table.Row key={c.id} _hover={{ bg: "gray.50" }} transition="colors 0.15s">
                <Table.Cell color="black">{c.full_name}</Table.Cell>
                <Table.Cell color="gray.600">{c.phone}</Table.Cell>
                <Table.Cell color="gray.600">{c.email || "—"}</Table.Cell>
                <Table.Cell>
                  {c.address ? (
                    <a
                      href={`https://maps.apple.com/?daddr=${encodeURIComponent(c.address || "")}`}
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
                      {c.address}
                    </a>
                  ) : (
                    <Text color="gray.600">—</Text>
                  )}
                </Table.Cell>
                <Table.Cell color="gray.600">{c.job_type || "—"}</Table.Cell>
                <Table.Cell color="#f59e0b" fontWeight="500">{c.estimated_price ? `$${c.estimated_price}` : "—"}</Table.Cell>
                <Table.Cell color="gray.600">{c.pipeline_stage || "New"}</Table.Cell>
                <Table.Cell maxW="200px" textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap" color="gray.600">
                  {c.notes || "—"}
                </Table.Cell>
                <Table.Cell>
                  {c.lead_sources ? (
                    <Box
                      padding="4px 8px"
                      borderRadius="md"
                      bg="transparent"
                      display="inline-block"
                      color="black"
                      fontWeight="500"
                      fontSize="0.875rem"
                    >
                      {c.lead_sources.name}
                    </Box>
                  ) : (
                    "—"
                  )}
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Button 
                      size="xs"
                      bg="transparent"
                      color="#f59e0b"
                      fontWeight="500"
                      px={2}
                      _hover={{ bg: "gray.100" }}
                      transition="colors 0.15s"
                      onClick={() => handleEditCustomer(c)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="xs"
                      bg="transparent"
                      color="red.600"
                      fontWeight="500"
                      px={2}
                      _hover={{ bg: "red.50" }}
                      transition="colors 0.15s"
                      onClick={() => handleDeleteCustomer(c.id, c.full_name)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {/* MODAL FORM */}
      <CustomerForm
        open={open}
        onClose={handleCloseDialog}
        existingCustomer={selectedCustomer}
      />
      </Box>
    </Box>
  );
}
