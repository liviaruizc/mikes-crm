import {
  Dialog,
  Button,
  Field,
  Input,
  Textarea,
  VStack,
  NativeSelectRoot,
  NativeSelectField,
  Box,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { supabase, getCurrentUserId } from "../../lib/supabaseClient";
import type { Customer } from "../../lib/types";

export default function CustomerForm({ 
  open, 
  onClose, 
  existingCustomer 
}: { 
  open: boolean; 
  onClose: () => void;
  existingCustomer?: Customer | null;
}) {
  const [loadSources, setLeadSources] = useState<any[]>([]);
  const [errors, setErrors] = useState({ full_name: false, phone: false });
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    phone_country: "US",
    email: "",
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
    lead_source_id: "",
    job_type: "",
    estimated_price: "",
    pipeline_stage: "New",
  });

  async function loadLeadSources() {
    const { data } = await supabase.from("lead_sources").select("*");
    setLeadSources(data || []);
  }

  useEffect(() => {
    if (open) loadLeadSources();
  }, [open]);

  useEffect(() => {
    if (existingCustomer) {
      // Parse address into components
      const addressParts = (existingCustomer.address || "").split(",").map(s => s.trim());
      const street = addressParts[0] || "";
      const city = addressParts[1] || "";
      const stateZip = addressParts[2] || "";
      const [state = "", zip = ""] = stateZip.split(" ");

      setForm({
        full_name: existingCustomer.full_name || "",
        phone: existingCustomer.phone || "",
        phone_country: (existingCustomer as any).phone_country || "US",
        email: existingCustomer.email || "",
        street_address: street,
        city: city,
        state: state,
        zip_code: zip,
        notes: existingCustomer.notes || "",
        lead_source_id: existingCustomer.lead_source_id || "",
        job_type: existingCustomer.job_type || "",
        estimated_price: existingCustomer.estimated_price?.toString() || "",
        pipeline_stage: existingCustomer.pipeline_stage || "New",
      });
    } else {
      setForm({
        full_name: "",
        phone: "",
        phone_country: "US",
        email: "",
        street_address: "",
        city: "",
        state: "",
        zip_code: "",
        notes: "",
        lead_source_id: "",
        job_type: "",
        estimated_price: "",
        pipeline_stage: "New",
      });
    }
    setErrors({ full_name: false, phone: false });
  }, [existingCustomer, open]);

  async function handleSubmit() {
    const newErrors = {
      full_name: !form.full_name,
      phone: !form.phone,
    };
    setErrors(newErrors);
    
    if (newErrors.full_name || newErrors.phone) {
      return;
    }
    
    try {
      // Combine address components
      const fullAddress = [
        form.street_address,
        form.city,
        form.state && form.zip_code ? `${form.state} ${form.zip_code}` : form.state || form.zip_code
      ].filter(Boolean).join(", ");

      // Prepare data with proper types
      const dataToSubmit = {
        full_name: form.full_name,
        phone: form.phone,
        phone_country: form.phone_country,
        email: form.email || null,
        address: fullAddress || null,
        notes: form.notes || null,
        lead_source_id: form.lead_source_id || null,
        job_type: form.job_type || null,
        estimated_price: form.estimated_price ? parseFloat(form.estimated_price) : null,
        pipeline_stage: form.pipeline_stage,
      };

      if (existingCustomer?.id) {
        // Update existing customer
        const { error } = await supabase
          .from("customers")
          .update(dataToSubmit)
          .eq("id", existingCustomer.id);
        
        if (error) {
          console.error("Update error:", error);
          alert(`Failed to update customer: ${error.message}`);
          return;
        }
        console.log("Customer updated successfully");
      } else {
        // Insert new customer
        const userId = await getCurrentUserId();
        if (!userId) {
          alert("You must be logged in to create customers");
          return;
        }

        const { error } = await supabase.from("customers").insert([{
          ...dataToSubmit,
          user_id: userId
        }]);
        
        if (error) {
          console.error("Insert error:", error);
          alert(`Failed to create customer: ${error.message}`);
          return;
        }
        console.log("Customer created successfully");
      }
      
      setErrors({ full_name: false, phone: false });
      onClose();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "full_name" || field === "phone") {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => e.open ? undefined : onClose()} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="white" color="black" border="1px solid" borderColor="gray.200">
          <Dialog.Header fontWeight="500" fontSize="xl">
            {existingCustomer ? "Edit Customer" : "Add New Customer"}
          </Dialog.Header>
          <Dialog.CloseTrigger />

          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root required invalid={errors.full_name}>
                <Field.Label fontWeight="500" color="black">Name *</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                />
                {errors.full_name && (
                  <Field.ErrorText color="red.600">Name is required</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={errors.phone}>
                <Field.Label fontWeight="500" color="black">Phone *</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                {errors.phone && (
                  <Field.ErrorText color="red.600">Phone is required</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Phone Country/Region</Field.Label>
                <NativeSelectRoot>
                  <NativeSelectField
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    color="black"
                    _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                    value={form.phone_country}
                    onChange={(e) => updateField("phone_country", e.target.value)}
                  >
                    <option value="US">United States (+1)</option>
                    <option value="CA">Canada (+1)</option>
                    <option value="MX">Mexico (+52)</option>
                    <option value="GB">United Kingdom (+44)</option>
                    <option value="AU">Australia (+61)</option>
                    <option value="Other">Other</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Email</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Street Address</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  placeholder="123 Main St"
                  value={form.street_address}
                  onChange={(e) => updateField("street_address", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">City</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  placeholder="Miami"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">State</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  placeholder="FL"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Zip Code</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  placeholder="33101"
                  value={form.zip_code}
                  onChange={(e) => updateField("zip_code", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Job Type</Field.Label>
                <Box
                  as="select"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  borderRadius="md"
                  padding="8px"
                  fontSize="md"
                  w="full"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  value={form.job_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField("job_type", e.target.value)}
                >
                  <option value="">Select job type...</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bathroom">Bathroom</option>
                  <option value="Full Remodel">Full Remodel</option>
                  <option value="Painting">Painting</option>
                  <option value="Flooring">Flooring</option>
                  <option value="TV Wall">TV Wall</option>
                  <option value="Misc">Misc</option>
                </Box>
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Estimated Price</Field.Label>
                <Input
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  type="number"
                  placeholder="0.00"
                  value={form.estimated_price}
                  onChange={(e) => updateField("estimated_price", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Notes</Field.Label>
                <Textarea
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">Lead Source</Field.Label>
                <NativeSelectRoot>
                  <NativeSelectField
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    color="black"
                    value={form.lead_source_id}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField("lead_source_id", e.target.value)}
                    css={{
                      "& option": {
                        color: "black",
                      }
                    }}
                  >
                    <option value="">Select...</option>
                    {loadSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              </Field.Root>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button 
              variant="outline"
              border="1px solid"
              borderColor="gray.300"
              color="gray.600"
              fontWeight="500"
              mr={3}
              _hover={{ bg: "gray.100" }}
              transition="colors 0.15s"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              bg="#f59e0b"
              color="black"
              fontWeight="500"
              _hover={{ bg: "#d97706" }}
              transition="colors 0.15s"
              onClick={handleSubmit}
            >
              Save Customer
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
