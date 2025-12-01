import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Table,
  Spinner,
  useDisclosure,
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

  return (
    <Box padding={6}>

      <Box mb={6}>
        <Heading size="lg">Customers</Heading>
        <Text color="gray.500">Manage your customer list and lead sources.</Text>
      </Box>

      <Button onClick={() => { setSelectedCustomer(null); onOpen(); }} colorScheme="yellow" mb={4}>
        + New Customer
      </Button>

      {loading ? (
        <Spinner size="xl" />
      ) : (
        <Table.Root variant="outline" bg="gray.800" borderRadius="lg">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader color="yellow.400">Name</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Phone</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Email</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Address</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Job Type</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Estimated Price</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Pipeline Stage</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Notes</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Lead Source</Table.ColumnHeader>
              <Table.ColumnHeader color="yellow.400">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {customers.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>{c.full_name}</Table.Cell>
                <Table.Cell>{c.phone}</Table.Cell>
                <Table.Cell>{c.email || "—"}</Table.Cell>
                <Table.Cell>{c.address || "—"}</Table.Cell>
                <Table.Cell>{c.job_type || "—"}</Table.Cell>
                <Table.Cell>{c.estimated_price ? `$${c.estimated_price}` : "—"}</Table.Cell>
                <Table.Cell>{c.pipeline_stage || "New"}</Table.Cell>
                <Table.Cell maxW="200px" textOverflow="ellipsis" overflow="hidden" whiteSpace="nowrap">
                  {c.notes || "—"}
                </Table.Cell>
                <Table.Cell>
                  {c.lead_sources ? (
                    <Box
                      padding="4px 8px"
                      borderRadius="md"
                      bg={c.lead_sources.color}
                      display="inline-block"
                      color="black"
                      fontWeight="bold"
                    >
                      {c.lead_sources.name}
                    </Box>
                  ) : (
                    "—"
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Button 
                    size="sm" 
                    colorScheme="blue"
                    onClick={() => handleEditCustomer(c)}
                  >
                    Edit
                  </Button>
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
  );
}
