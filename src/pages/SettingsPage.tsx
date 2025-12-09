import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  Field,
  Input,
  Button,
  createToaster,
  Text,
} from "@chakra-ui/react";
import { supabase, getCurrentUserId } from "../lib/supabaseClient";
import { sendTestNotification } from "../lib/notificationService";

const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

export default function SettingsPage() {
  const [ownerPhone, setOwnerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("settings")
        .select("owner_phone")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error loading settings:", error);
      } else if (data) {
        setOwnerPhone(data.owner_phone || "");
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setInitialLoad(false);
    }
  }

  async function handleSave() {
    setLoading(true);

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        toaster.create({
          title: "Error",
          description: "You must be logged in to save settings.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      // First check if settings row exists for this user
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", userId)
        .single();

      let error;

      if (existing) {
        // Update existing row
        ({ error } = await supabase
          .from("settings")
          .update({ owner_phone: ownerPhone })
          .eq("id", existing.id));
      } else {
        // Insert new row
        ({ error } = await supabase
          .from("settings")
          .insert([{ owner_phone: ownerPhone, user_id: userId }]));
      }

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Owner phone number updated successfully.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to save settings.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <Box p={8}>
        <Text color="gray.600">Loading settings...</Text>
      </Box>
    );
  }

  return (
    <Box p={8}>
      <Heading color="black" fontWeight="500" fontSize="xl" mb={6}>
        Settings
      </Heading>

      <VStack gap={5} maxW="600px" mx="auto" align="stretch">
        <Field.Root w="full">
          <Field.Label fontWeight="500" color="black">
            Owner Phone Number
          </Field.Label>
          <Field.HelperText color="gray.600" mb={2}>
            This phone number will receive appointment reminders. Format: 10 digits (e.g., 2392005772)
          </Field.HelperText>
          <Input
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="2392005772"
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            color="black"
            _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
          />
        </Field.Root>

        <Button
          bg="#f59e0b"
          color="black"
          fontWeight="500"
          _hover={{ bg: "#d97706" }}
          transition="colors 0.15s"
          onClick={handleSave}
          loading={loading}
          w="full"
        >
          Save Settings
        </Button>

        {/* Test Notification Button */}
        <Box w="full" pt={6} borderTop="1px solid" borderColor="gray.200">
          <Text fontSize="lg" fontWeight="500" color="black" mb={2}>
            Test Notifications
          </Text>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Send a test notification to verify that notifications are working on your device.
          </Text>
          <Button
            bg="transparent"
            color="#f59e0b"
            border="1px solid"
            borderColor="#f59e0b"
            fontWeight="500"
            _hover={{ bg: "#f59e0b", color: "black" }}
            transition="colors 0.15s"
            onClick={sendTestNotification}
            w="full"
          >
            Send Test Notification
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}
