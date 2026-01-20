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
    period: "AM",
  });

  // Generate time slots every 30 minutes in 12-hour format
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString();
        const m = minute.toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

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

  // Check if a time slot conflicts with existing appointments
  const isTimeSlotAvailable = (date: string, time: string, period: string) => {
    if (!date || !time || !period) return true;

    // Convert selected time to 24-hour format
    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr);
    
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }
    
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
    
    // Auto-fill customer fields when customer is selected
    if (name === "customer_id" && value) {
      const selectedCustomer = customers.find(c => c.id === value);
      if (selectedCustomer) {
        setForm({
          ...form,
          customer_id: value,
          customer_name: selectedCustomer.full_name || "",
          customer_phone: selectedCustomer.phone || "",
          customer_email: selectedCustomer.email || "",
          customer_address: selectedCustomer.address || "",
          job_type: selectedCustomer.job_type || "",
          estimated_price: selectedCustomer.estimated_price?.toString() || "",
        });
      }
    } else {
      setForm({ ...form, [name]: value });
    }

    // Clear error for this field when user starts typing
    if (name === "customer_id" || name === "date" || name === "time") {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }

    // Reload appointments when date changes
    if (name === "date") {
      loadAppointments();
    }

    // Update start_time when date, time, or period changes
    if (name === "date" || name === "time" || name === "period") {
      const dateValue = name === "date" ? value : form.date;
      const timeValue = name === "time" ? value : form.time;
      const periodValue = name === "period" ? value : form.period;
      
      if (dateValue && timeValue && periodValue) {
        // Convert 12-hour time to 24-hour format
        const [hourStr, minuteStr] = timeValue.split(":");
        let hour = parseInt(hourStr);
        
        if (periodValue === "PM" && hour !== 12) {
          hour += 12;
        } else if (periodValue === "AM" && hour === 12) {
          hour = 0;
        }
        
        const hour24 = hour.toString().padStart(2, "0");
        const minute = minuteStr.padStart(2, "0");
        
        // Store as ISO string with explicit timezone offset for NY (EST/EDT)
        const localDateTime = `${dateValue}T${hour24}:${minute}:00-05:00`;
        
        setForm((prev) => ({
          ...prev,
          [name]: value,
          start_time: localDateTime,
        }));
      }
    }
  };

  async function handleSubmit() {
    const newErrors = {
      customer_id: !form.customer_id,
      date: !form.date,
      time: !form.time,
    };
    setErrors(newErrors);

    if (newErrors.customer_id || newErrors.date || newErrors.time) {
      return;
    }

    setLoading(true);

    // Calculate end time as 1 hour after start time (keep same format with timezone)
    const [datePart, timeWithTz] = form.start_time.split('T');
    const [timePart] = timeWithTz.split('-'); // Remove timezone part
    const [hourStr, minuteStr] = timePart.split(':');
    let endHour = parseInt(hourStr) + 1;
    
    // Handle day overflow
    if (endHour >= 24) {
      endHour = endHour - 24;
    }
    
    const endTime = `${datePart}T${endHour.toString().padStart(2, '0')}:${minuteStr}:00-05:00`;

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
        start_time: form.start_time,
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
          new Date(form.start_time),
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
    <Box p={8}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading color="black" fontWeight="500" fontSize="xl">
          New Appointment
        </Heading>
        <Button 
          size="sm" 
          bg="#f59e0b"
          color="black"
          fontWeight="500"
          _hover={{ bg: "#d97706" }}
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
          <Flex gap={3}>
            <Box flex={2}>
              <select
                name="time"
                value={form.time}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid',
                  borderColor: '#D1D5DB',
                  borderRadius: '0.375rem',
                  color: 'black'
                }}
              >
                <option value="">Select time</option>
                {timeSlots.map((slot) => {
                  const isAvailable = isTimeSlotAvailable(form.date, slot, form.period);
                  return (
                    <option key={slot} value={slot} disabled={!isAvailable}>
                      {slot} {!isAvailable ? '(Booked)' : ''}
                    </option>
                  );
                })}
              </select>
            </Box>
            <Box flex={1}>
              <select
                name="period"
                value={form.period}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid',
                  borderColor: '#D1D5DB',
                  borderRadius: '0.375rem',
                  color: 'black'
                }}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </Box>
          </Flex>
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
  );
}
