/**
 * SettingsPage Component
 * 
 * User profile and account settings management
 * 
 * Features:
 * - Profile information (display name, phone number)
 * - Email change with verification
 * - Password change with validation
 * - Test push notifications
 * 
 * Security:
 * - All changes use Supabase Auth for secure updates
 * - Email changes require verification
 * - Password validation (min 8 characters, matching confirmation)
 */

import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Field,
  Input,
  Button,
  createToaster,
  Text,
  Card,
  Stack,
  HStack,
  Separator,
  Flex,
} from "@chakra-ui/react";
import { supabase, getCurrentUserId } from "../lib/supabaseClient";
import { sendTestNotification } from "../lib/notificationService";
import { User, Mail, Lock } from "lucide-react";

const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

export default function SettingsPage() {
  // State for form inputs
  const [ownerPhone, setOwnerPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  // Loading states for async operations
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load user data on component mount
  useEffect(() => {
    loadSettings();
    loadUserProfile();
  }, []);

  /**
   * Load user profile information from Supabase Auth
   * Gets email and display name from user metadata
   */
  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setDisplayName(user.user_metadata?.display_name || "");
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    }
  }

  async function loadSettings() {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("user")
        .select("full_name, phone")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error loading settings:", error);
      } else if (data) {
        setDisplayName(data.full_name || "");
        setOwnerPhone(data.phone || "");
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

      // First check if user row exists for this user
      const { data: existing } = await supabase
        .from("user")
        .select("id")
        .eq("user_id", userId)
        .single();

      let error;

      if (existing) {
        // Update existing row
        ({ error } = await supabase
          .from("user")
          .update({ full_name: displayName, phone: ownerPhone })
          .eq("id", existing.id));
      } else {
        // Insert new row
        ({ error } = await supabase
          .from("user")
          .insert([{ full_name: displayName, phone: ownerPhone, user_id: userId }]));
      }

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Profile updated successfully.",
        type: "success",
      });
      setIsEditing(false);
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

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      toaster.create({
        title: "Error",
        description: "Please enter both password fields.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toaster.create({
        title: "Error",
        description: "Passwords do not match.",
        type: "error",
      });
      return;
    }

    if (newPassword.length < 8) {
      toaster.create({
        title: "Error",
        description: "Password must be at least 8 characters.",
        type: "error",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Password updated successfully.",
        type: "success",
      });

      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to change password.",
        type: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail) {
      toaster.create({
        title: "Error",
        description: "Please enter a new email address.",
        type: "error",
      });
      return;
    }

    if (newEmail === email) {
      toaster.create({
        title: "Error",
        description: "New email is the same as current email.",
        type: "error",
      });
      return;
    }

    setEmailLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Confirmation email sent. Please check your inbox to verify your new email address.",
        type: "success",
      });

      setNewEmail("");
    } catch (error: any) {
      console.error("Error changing email:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to change email.",
        type: "error",
      });
    } finally {
      setEmailLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <Box bg="bg" minH="100vh" p={8}>
        <Box maxW="800px" mx="auto">
          <Text color="fg-muted">Loading settings...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="bg" minH="100vh" p={{ base: 4, md: 8 }}>
      <Box maxW="800px" mx="auto">
        <Heading color="fg" fontWeight="500" fontSize="2xl" mb={6}>
          Settings
        </Heading>

      <Stack gap={6} maxW="800px" mx="auto">
        {/* Profile Information */}
        <Card.Root>
          <Card.Header>
            <Flex justify="space-between" align="center">
              <HStack>
                <User size={20} />
                <Heading size="md">Profile Information</Heading>
              </HStack>
              {!isEditing && (
                <Button
                  size="sm"
                  bg="transparent"
                  color="#f59e0b"
                  border="1px solid"
                  borderColor="#f59e0b"
                  fontWeight="500"
                  _hover={{ bg: "#f59e0b", color: "black" }}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </Flex>
          </Card.Header>
          <Card.Body>
            {!isEditing ? (
              <Stack gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Display Name
                  </Text>
                  <Text fontSize="md" fontWeight="500" color="black">
                    {displayName || "Not set"}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Phone Number
                  </Text>
                  <Text fontSize="md" fontWeight="500" color="black">
                    {ownerPhone || "Not set"}
                  </Text>
                </Box>
              </Stack>
            ) : (
              <Stack gap={4}>
                <Field.Root>
                  <Field.Label fontWeight="500" color="black">
                    Display Name
                  </Field.Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    color="black"
                    _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label fontWeight="500" color="black">
                    Phone Number
                  </Field.Label>
                  <Field.HelperText color="gray.600" mb={2}>
                    This phone number will receive appointment reminders
                  </Field.HelperText>
                  <Input
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="(239) 200-5772"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.300"
                    color="black"
                    _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                  />
                </Field.Root>

                <HStack>
                  <Button
                    bg="#f59e0b"
                    color="black"
                    fontWeight="500"
                    _hover={{ bg: "#d97706" }}
                    onClick={handleSave}
                    loading={loading}
                    flex="1"
                  >
                    Save
                  </Button>
                  <Button
                    bg="transparent"
                    color="gray.600"
                    border="1px solid"
                    borderColor="gray.300"
                    fontWeight="500"
                    _hover={{ bg: "gray.100" }}
                    onClick={() => {
                      setIsEditing(false);
                      loadSettings();
                    }}
                    flex="1"
                  >
                    Cancel
                  </Button>
                </HStack>
              </Stack>
            )}
          </Card.Body>
        </Card.Root>

        {/* Email Settings */}
        <Card.Root>
          <Card.Header>
            <HStack>
              <Mail size={20} />
              <Heading size="md">Email Settings</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Field.Root>
                <Field.Label fontWeight="500" color="black">
                  Current Email
                </Field.Label>
                <Input
                  value={email}
                  disabled
                  bg="gray.100"
                  border="1px solid"
                  borderColor="gray.300"
                  color="gray.600"
                />
              </Field.Root>

              <Separator />

              <Field.Root>
                <Field.Label fontWeight="500" color="black">
                  New Email Address
                </Field.Label>
                <Field.HelperText color="gray.600" mb={2}>
                  You'll receive a confirmation email at your new address
                </Field.HelperText>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newemail@example.com"
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
                onClick={handleChangeEmail}
                loading={emailLoading}
                w="full"
              >
                Change Email
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Password Settings */}
        <Card.Root>
          <Card.Header>
            <HStack>
              <Lock size={20} />
              <Heading size="md">Change Password</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Field.Root>
                <Field.Label fontWeight="500" color="black">
                  New Password
                </Field.Label>
                <Field.HelperText color="gray.600" mb={2}>
                  Must be at least 8 characters
                </Field.HelperText>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.300"
                  color="black"
                  _focus={{ borderColor: "#f59e0b", boxShadow: "0 0 0 1px #f59e0b" }}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="500" color="black">
                  Confirm New Password
                </Field.Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
                onClick={handleChangePassword}
                loading={passwordLoading}
                w="full"
              >
                Update Password
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Test Notifications */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Test Notifications</Heading>
          </Card.Header>
          <Card.Body>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Send a test notification to verify that notifications are working on your device.
            </Text>
            <Button
              bg="transparent"
              color="#f59e0b"
              border="1px solid"
              borderColor="gold.400"
              fontWeight="500"
              _hover={{ bg: "gold.400", color: "black" }}
              onClick={sendTestNotification}
              w="full"
            >
              Send Test Notification
            </Button>
          </Card.Body>
        </Card.Root>
      </Stack>
      </Box>
    </Box>
  );
}
