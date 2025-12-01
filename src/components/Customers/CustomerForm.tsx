import {
  Dialog,
  Button,
  Field,
  Input,
  Textarea,
  VStack,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
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
        const { error } = await supabase.from("customers").insert([dataToSubmit]);
        
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
        <Dialog.Content bg="gray.900">
          <Dialog.Header>
            {existingCustomer ? "Edit Customer" : "Add New Customer"}
          </Dialog.Header>
          <Dialog.CloseTrigger />

          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root required invalid={errors.full_name}>
                <Field.Label>Name *</Field.Label>
                <Input
                  bg="gray.800"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                />
                {errors.full_name && (
                  <Field.ErrorText color="red.400">Name is required</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={errors.phone}>
                <Field.Label>Phone *</Field.Label>
                <Input
                  bg="gray.800"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                {errors.phone && (
                  <Field.ErrorText color="red.400">Phone is required</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Input
                  bg="gray.800"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Street Address</Field.Label>
                <Input
                  bg="gray.800"
                  placeholder="123 Main St"
                  value={form.street_address}
                  onChange={(e) => updateField("street_address", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>City</Field.Label>
                <Input
                  bg="gray.800"
                  placeholder="Miami"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>State</Field.Label>
                <Input
                  bg="gray.800"
                  placeholder="FL"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Zip Code</Field.Label>
                <Input
                  bg="gray.800"
                  placeholder="33101"
                  value={form.zip_code}
                  onChange={(e) => updateField("zip_code", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Job Type</Field.Label>
                <Input
                  bg="gray.800"
                  placeholder="e.g., Painting, Roofing, Remodeling"
                  value={form.job_type}
                  onChange={(e) => updateField("job_type", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Estimated Price</Field.Label>
                <Input
                  bg="gray.800"
                  type="number"
                  placeholder="0.00"
                  value={form.estimated_price}
                  onChange={(e) => updateField("estimated_price", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Notes</Field.Label>
                <Textarea
                  bg="gray.800"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Lead Source</Field.Label>
                <NativeSelectRoot>
                  <NativeSelectField
                    bg="gray.800"
                    color="white"
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
              variant="ghost" 
              mr={3} 
              onClick={onClose}
              color="white"
              _hover={{ color: "black", bg: "gray.200" }}
            >
              Cancel
            </Button>
            <Button colorScheme="yellow" onClick={handleSubmit}>
              Save Customer
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
