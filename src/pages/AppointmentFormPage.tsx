/**
 * AppointmentFormPage Component
 * 
 * Create new appointments with customer selection and scheduling
 * 
 * Features:
 * - Select existing customer or create new one inline
 * - Set appointment date, time, and duration
 * - Add appointment title and description
 * - Automatically schedules push notification 24 hours before appointment
 * - Time conflict detection
 * - Form validation
 * - Pre-fill with URL parameters (customerId, date, time)
 */

import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  Field,
  Input,
  Textarea,
  Button,
  createToaster,
  useDisclosure,
  Flex
} from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, getCurrentUserId } from "../lib/supabaseClient";
import CustomerForm from "../components/Customers/CustomerForm";
import { scheduleAppointmentNotification } from "../lib/notificationService";

const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

export default function AppointmentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // URL parameters for pre-filling form
  const { open, onOpen, onClose } = useDisclosure(); // Customer creation modal
  
  // State management
  const [customers, setCustomers] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]); // For time conflict checking
  const [loading, setLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Form validation errors
  const [errors, setErrors] = useState({
    customer_id: false,
    date: false,
    time: false,
  });

  // Form data
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    job_type: "",
    estimated_price: "",
    title: "",
    description: "",
    start_time: "",
    date: "",
    time: "",
  });

  // Load customers on mount and pre-select if customerId in URL
  useEffect(() => {
    loadCustomers();
    loadAppointments();
  }, []);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (customerId && customers.length > 0) {
      setForm(prev => ({ ...prev, customer_id: customerId }));
    }
  }, [searchParams, customers]);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, address, job_type, estimated_price")
      .order("full_name");

    if (error) console.error(error);
    else setCustomers(data);
  }

  async function loadAppointments() {
    const { data, error } = await supabase
      .from("appointments")
      .select("start_time, end_time");

    if (error) console.error(error);
    else setExistingAppointments(data || []);
  }

  // Generate 30-minute time slots from 7 AM to 7 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 19 && minute > 0) break; // Stop at 7:00 PM
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? "PM" : "AM";
        const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        const valueStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ display: timeStr, value: valueStr });
      }
    }
    return slots;
  };

  // Check if a time slot conflicts with existing appointments
  const isTimeSlotAvailable = (date: string, timeValue: string) => {
    if (!date || !timeValue) return true;

    const [hourStr, minuteStr] = timeValue.split(":");
    const hour = parseInt(hourStr);
    
    const selectedStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minuteStr}:00`);
    const selectedEnd = new Date(selectedStart.getTime() + 60 * 60 * 1000); // +1 hour

    // Check for conflicts
    return !existingAppointments.some((appt) => {
      const apptStart = new Date(appt.start_time);
      const apptEnd = new Date(appt.end_time);
      
      // Check if times overlap
      return (
        (selectedStart >= apptStart && selectedStart < apptEnd) ||
        (selectedEnd > apptStart && selectedEnd <= apptEnd) ||
        (selectedStart <= apptStart && selectedEnd >= apptEnd)
      );
    });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    setForm((prev) => {
      // Auto-fill customer fields when customer is selected
      if (name === "customer_id" && value) {
        const selectedCustomer = customers.find(c => c.id === value);
        if (selectedCustomer) {
          return {
            ...prev,
            customer_id: value,
            customer_name: selectedCustomer.full_name || "",
            customer_phone: selectedCustomer.phone || "",
            customer_email: selectedCustomer.email || "",
            customer_address: selectedCustomer.address || "",
            job_type: selectedCustomer.job_type || "",
            estimated_price: selectedCustomer.estimated_price?.toString() || "",
          };
        }
      }

      let nextForm = { ...prev, [name]: value };

      // Update start_time when date or time changes
      if (name === "date" || name === "time") {
        const dateValue = name === "date" ? value : nextForm.date;
        const timeValue = name === "time" ? value : nextForm.time;
        
        if (dateValue && timeValue) {
          const [hourStr, minuteStr] = timeValue.split(":");
          const hour = parseInt(hourStr);
          
          const hour24 = hour.toString().padStart(2, "0");
          const minute = minuteStr.padStart(2, "0");

          // Build a local Date and store UTC ISO (no hardcoded offset)
          const localDate = new Date(`${dateValue}T${hour24}:${minute}:00`);
          const utcIso = localDate.toISOString();
          nextForm = {
            ...nextForm,
            start_time: utcIso,
          };
        }
      }

      return nextForm;
    });

    // Clear error for this field when user starts typing
    if (name === "customer_id" || name === "date" || name === "time") {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }

    // Reload appointments when date changes
    if (name === "date") {
      loadAppointments();
    }
  };

  async function handleSubmit() {
    console.log('=== handleSubmit called ===');
    console.log('Form data:', form);
    
    const newErrors = {
      customer_id: !form.customer_id,
      date: !form.date,
      time: !form.time,
    };
    setErrors(newErrors);
    console.log('Validation errors:', newErrors);

    if (newErrors.customer_id || newErrors.date || newErrors.time) {
      console.log('Validation failed - missing required fields');
      return;
    }

    console.log('Checking time slot availability');
    if (!isTimeSlotAvailable(form.date, form.time)) {
      console.log('Time slot conflict detected');
      setLoading(false);
      alert('This time slot is already taken. Please choose a different time.');
      toaster.create({
        title: "Time conflict",
        description: "Selected time overlaps an existing appointment.",
        type: "error",
      });
      return;
    }

    console.log('All validations passed, creating appointment...');
    setLoading(true);

    // Calculate end time as 1 hour after start time
    const [hourStr, minuteStr] = form.time.split(":");
    const startHour = parseInt(hourStr);

    const startHourPadded = startHour.toString().padStart(2, '0');
    const startMinute = minuteStr.padStart(2, '0');
    // Build local Date from input and store as UTC ISO (handles DST)
    const startLocal = new Date(`${form.date}T${startHourPadded}:${startMinute}:00`);
    const startTimeIso = startLocal.toISOString();

    const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
    const endTime = endLocal.toISOString();

    const userId = await getCurrentUserId();
    if (!userId) {
      toaster.create({
        title: "Error",
        description: "You must be logged in to create appointments.",
        type: "error",
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("appointments").insert([
      {
        customer_id: form.customer_id,
        title: form.title || "Appointment",
        description: form.description,
        start_time: startTimeIso,
        end_time: endTime,
        user_id: userId,
      },
    ]).select('id').single();

    setLoading(false);

    if (error) {
      console.error("Supabase error:", error);
      toaster.create({
        title: "Error",
        description: "Could not create appointment.",
        type: "error",
      });
    } else {
      // Schedule notification for 24 hours before appointment
      const selectedCustomer = customers.find(c => c.id === form.customer_id);
      if (data && selectedCustomer) {
        await scheduleAppointmentNotification(
          data.id,
          selectedCustomer.full_name,
          new Date(startTimeIso),
          form.title || "Appointment",
          selectedCustomer.address || undefined
        );
      }

      toaster.create({
        title: "Success",
        description: "Appointment created successfully.",
        type: "success",
      });

      navigate("/"); // redirect after saving
    }
  }

  return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="800px" mx="auto">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading color="fg" fontWeight="500" fontSize="xl">
            New Appointment
          </Heading>
          <Button 
            size="sm" 
            bg="gold.400"
            color="black"
            fontWeight="500"
            _hover={{ bg: "gold.500" }}
            transition="colors 0.15s"
            onClick={onOpen}
          >
            + New Customer
          </Button>
        </Flex>

      <VStack gap={5} maxW="600px" mx="auto">

        {/* CUSTOMER AUTOCOMPLETE */}
        <Field.Root required w="full" invalid={errors.customer_id}>
          <Field.Label fontWeight="500" color="black">Customer *</Field.Label>
          <Box position="relative">
            <Input
              placeholder="Type to search customers"
              value={form.customer_name}
              onChange={e => {
                setForm({ ...form, customer_name: e.target.value, customer_id: "" });
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => {
                // Delay closing to allow click on dropdown item
                setTimeout(() => setShowCustomerDropdown(false), 200);
              }}
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              color="black"
              _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
              autoComplete="off"
            />
            {showCustomerDropdown && (
              <Box
                position="absolute"
                top="100%"
                left={0}
                right={0}
                mt={1}
                bg="white"
                border="1px solid"
                borderColor="gray.300"
                borderRadius="md"
                maxH="200px"
                overflowY="auto"
                zIndex={10}
                boxShadow="md"
              >
                {customers.filter(c =>
                  c.full_name.toLowerCase().includes(form.customer_name.toLowerCase())
                ).length > 0 ? (
                  customers.filter(c =>
                    c.full_name.toLowerCase().includes(form.customer_name.toLowerCase())
                  ).map(c => (
                    <Box
                      key={c.id}
                      px={4}
                      py={2}
                      cursor="pointer"
                      color="black"
                      _hover={{ bg: "gray.100" }}
                      onClick={() => {
                        setForm({
                          ...form,
                          customer_id: c.id,
                          customer_name: c.full_name,
                          customer_phone: c.phone || "",
                          customer_email: c.email || "",
                          customer_address: c.address || "",
                          job_type: c.job_type || "",
                          estimated_price: c.estimated_price?.toString() || "",
                        });
                        setShowCustomerDropdown(false);
                      }}
                    >
                      {c.full_name}
                    </Box>
                  ))
                ) : (
                  <Box px={4} py={2} color="gray.500">
                    No customers found
                  </Box>
                )}
              </Box>
            )}
          </Box>
          {errors.customer_id && (
            <Field.ErrorText color="red.600">Customer is required</Field.ErrorText>
          )}
        </Field.Root>

        {/* CUSTOMER NAME */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Customer Name</Field.Label>
          <Input
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* CUSTOMER PHONE */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Phone</Field.Label>
          <Input
            name="customer_phone"
            value={form.customer_phone}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* CUSTOMER EMAIL */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Email</Field.Label>
          <Input
            name="customer_email"
            type="email"
            value={form.customer_email}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* CUSTOMER ADDRESS */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Address</Field.Label>
          <Input
            name="customer_address"
            value={form.customer_address}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* JOB TYPE */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Job Type</Field.Label>
          <Input
            name="job_type"
            placeholder="e.g., Roof Repair, Kitchen Remodel"
            value={form.job_type}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* ESTIMATED PRICE */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Estimated Price</Field.Label>
          <Input
            name="estimated_price"
            type="number"
            placeholder="0.00"
            value={form.estimated_price}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* TITLE */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Appointment Title</Field.Label>
          <Input
            name="title"
            placeholder="Estimate, consultation, meeting..."
            value={form.title}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* DESCRIPTION */}
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">Description</Field.Label>
          <Textarea
            name="description"
            placeholder="Optional description"
            value={form.description}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        {/* DATE */}
        <Field.Root required w="full" invalid={errors.date}>
          <Field.Label fontWeight="500" color="black">Date *</Field.Label>
          <Input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
            css={{
              colorScheme: 'light',
              '&::-webkit-calendar-picker-indicator': {
                cursor: 'pointer',
                opacity: '1 !important'
              }
            }}
          />
          {errors.date && (
            <Field.ErrorText color="red.600">Date is required</Field.ErrorText>
          )}
        </Field.Root>

        {/* START TIME */}
        <Field.Root required w="full" invalid={errors.time}>
          <Field.Label fontWeight="500" color="black">Start Time *</Field.Label>
          <select
            name="time"
            value={form.time}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'white',
              border: '1px solid',
              borderColor: errors.time ? '#e53e3e' : '#D1D5DB',
              borderRadius: '0.375rem',
              color: 'black',
              fontSize: '1rem'
            }}
          >
            <option value="">Select a time</option>
            {generateTimeSlots().map((slot) => {
              const available = isTimeSlotAvailable(form.date, slot.value);
              return (
                <option 
                  key={slot.value} 
                  value={slot.value}
                  disabled={!available}
                  style={{ 
                    color: available ? 'black' : '#999',
                    fontWeight: available ? 'normal' : 'normal'
                  }}
                >
                  {slot.display} {!available ? '(Not Available)' : ''}
                </option>
              );
            })}
          </select>
          {errors.time && (
            <Field.ErrorText color="red.600">Time is required</Field.ErrorText>
          )}
        </Field.Root>

        <Flex gap={3} w="full">
          <Button
            variant="outline"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            fontWeight="500"
            flex={1}
            size="lg"
            _hover={{ bg: "gray.100" }}
            transition="colors 0.15s"
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
          <Button
            bg="#f59e0b"
            color="black"
            fontWeight="500"
            flex={1}
            size="lg"
            _hover={{ bg: "#d97706" }}
            transition="colors 0.15s"
            onClick={handleSubmit}
            loading={loading}
          >
            Create Appointment
          </Button>
        </Flex>
      </VStack>

      {/* Customer Form Modal */}
      <CustomerForm
        open={open}
        onClose={() => {
          onClose();
          loadCustomers();
        }}
      />
      </Box>
    </Box>
  );
}
