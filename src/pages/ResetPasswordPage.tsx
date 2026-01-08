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
  Flex,
} from "@chakra-ui/react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    // Check if user came from password reset link
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is ready to reset password
        console.log("Password recovery event detected");
      }
    });
  }, []);

  function validatePassword(password: string): boolean {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }

    if (password.length < 8 || password.length > 14) {
      setPasswordError("Password must be 8-14 characters long");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setPasswordError("Password must contain at least one symbol");
      return false;
    }

    setPasswordError("");
    return true;
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    // Validate password
    if (!validatePassword(password)) {
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }
    setConfirmError("");

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Password updated successfully!",
        type: "success",
      });

      // Redirect to login page
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to reset password.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box
        w="full"
        maxW="400px"
        bg="white"
        p={8}
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="lg"
      >
        <VStack gap={6} align="stretch">
          <Box textAlign="center">
            <Heading color="#f59e0b" fontWeight="600" fontSize="2xl" mb={2}>
              Set New Password
            </Heading>
            <Text color="gray.600" fontSize="sm">
              Enter your new password below
            </Text>
          </Box>

          <form onSubmit={handleResetPassword}>
            <VStack gap={4} align="stretch">
              <Field.Root required invalid={!!passwordError}>
                <Field.Label fontWeight="500" color="black">
                  New Password
                </Field.Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="••••••••"
                  bg="white"
                  border="1px solid"
                  borderColor={passwordError ? "red.500" : "gray.300"}
                  color="black"
                  _focus={{
                    borderColor: passwordError ? "red.500" : "#f59e0b",
                    boxShadow: passwordError ? "0 0 0 1px red" : "0 0 0 1px #f59e0b",
                  }}
                />
                {!passwordError && (
                  <Field.HelperText color="gray.600" fontSize="xs" mt={1}>
                    8-14 characters with uppercase, lowercase, numbers, and symbols
                  </Field.HelperText>
                )}
                {passwordError && (
                  <Field.ErrorText color="red.500" fontSize="sm" mt={1}>
                    {passwordError}
                  </Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!confirmError}>
                <Field.Label fontWeight="500" color="black">
                  Confirm Password
                </Field.Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError("");
                  }}
                  placeholder="••••••••"
                  bg="white"
                  border="1px solid"
                  borderColor={confirmError ? "red.500" : "gray.300"}
                  color="black"
                  _focus={{
                    borderColor: confirmError ? "red.500" : "#f59e0b",
                    boxShadow: confirmError ? "0 0 0 1px red" : "0 0 0 1px #f59e0b",
                  }}
                />
                {confirmError && (
                  <Field.ErrorText color="red.500" fontSize="sm" mt={1}>
                    {confirmError}
                  </Field.ErrorText>
                )}
              </Field.Root>

              <Button
                type="submit"
                bg="#f59e0b"
                color="black"
                fontWeight="500"
                _hover={{ bg: "#d97706" }}
                transition="colors 0.15s"
                loading={loading}
                w="full"
                mt={2}
              >
                Reset Password
              </Button>
            </VStack>
          </form>

          <Box textAlign="center">
            <Text color="gray.600" fontSize="sm">
              Remember your password?{" "}
              <Text
                as="span"
                color="#f59e0b"
                fontWeight="500"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                onClick={() => navigate("/login")}
              >
                Sign In
              </Text>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
}
