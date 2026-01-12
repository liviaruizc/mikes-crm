import { useState } from "react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePassword(password: string, forSignup: boolean): boolean {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }

    // Only enforce strict requirements for signup
    if (forSignup) {
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
    }

    setPasswordError("");
    return true;
  }

  async function handleLogin() {
    // Check if locked out
    if (isLocked) {
      toaster.create({
        title: "Account Locked",
        description: "Too many failed attempts. Please try again in 15 minutes or use 'Forgot Password'.",
        type: "error",
      });
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    // For login, just check password exists
    if (!validatePassword(password, false)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Reset attempts on successful login
      setLoginAttempts(0);
      setIsLocked(false);

      toaster.create({
        title: "Success",
        description: "Logged in successfully!",
        type: "success",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Increment failed attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      // Lock after 5 attempts
      if (newAttempts >= 5) {
        setIsLocked(true);
        toaster.create({
          title: "Account Locked",
          description: "Too many failed login attempts. Please wait 15 minutes or use 'Forgot Password'.",
          type: "error",
          duration: 5000,
        });
        
        // Auto-unlock after 15 minutes
        setTimeout(() => {
          setIsLocked(false);
          setLoginAttempts(0);
        }, 15 * 60 * 1000);
      } else {
        toaster.create({
          title: "Error",
          description: `${error.message || "Failed to log in."}${newAttempts < 5 ? ` (Attempt ${newAttempts}/5)` : ''}`,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    // For signup, enforce strict password requirements
    if (!validatePassword(password, true)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setSignupEmail(email);
      setShowEmailConfirmation(true);
      setEmail("");
      setPassword("");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to create account.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
      });

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Confirmation email resent! Please check your inbox.",
        type: "success",
      });
    } catch (error: any) {
      console.error("Resend error:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to resend email.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    // Validate email format
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://mikes-crm.onrender.com/reset-password`,
      });

      if (error) throw error;

      toaster.create({
        title: "Success",
        description: "Password reset link sent! Check your email.",
        type: "success",
      });

      setShowForgotPassword(false);
      setEmail("");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toaster.create({
        title: "Error",
        description: error.message || "Failed to send reset email.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleLogin();
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
        {showEmailConfirmation ? (
          <VStack gap={6} align="stretch">
            <Box textAlign="center">
              <Heading color="#f59e0b" fontWeight="600" fontSize="2xl" mb={2}>
                Check Your Email
              </Heading>
              <Text color="gray.600" fontSize="sm" mt={4}>
                We've sent a confirmation link to:
              </Text>
              <Text color="black" fontWeight="600" fontSize="md" mt={2}>
                {signupEmail}
              </Text>
              <Text color="gray.600" fontSize="sm" mt={4}>
                Please click the link in the email to verify your account.
              </Text>
            </Box>

            <Button
              onClick={handleResendEmail}
              bg="transparent"
              color="#f59e0b"
              border="1px solid"
              borderColor="#f59e0b"
              fontWeight="500"
              _hover={{ bg: "#f59e0b", color: "white" }}
              transition="colors 0.15s"
              loading={loading}
              w="full"
            >
              Resend Confirmation Email
            </Button>

            <Box textAlign="center">
              <Text color="gray.600" fontSize="sm">
                Already confirmed?{" "}
                <Text
                  as="span"
                  color="#f59e0b"
                  fontWeight="500"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setIsSignUp(false);
                  }}
                >
                  Sign In
                </Text>
              </Text>
            </Box>
          </VStack>
        ) : (
          <VStack gap={6} align="stretch">
          {showForgotPassword ? (
            // FORGOT PASSWORD VIEW
            <>
              <Box textAlign="center">
                <Heading color="#f59e0b" fontWeight="600" fontSize="2xl" mb={2}>
                  Reset Password
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Enter your email to receive a password reset link
                </Text>
              </Box>

              <Field.Root required invalid={!!emailError}>
                <Field.Label fontWeight="500" color="black">
                  Email
                </Field.Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="your@email.com"
                  bg="white"
                  border="1px solid"
                  borderColor={emailError ? "red.500" : "gray.300"}
                  color="black"
                  _focus={{
                    borderColor: emailError ? "red.500" : "#f59e0b",
                    boxShadow: emailError ? "0 0 0 1px red" : "0 0 0 1px #f59e0b",
                  }}
                />
                {emailError && (
                  <Field.ErrorText color="red.500" fontSize="sm" mt={1}>
                    {emailError}
                  </Field.ErrorText>
                )}
              </Field.Root>

              <Button
                onClick={handleForgotPassword}
                bg="#f59e0b"
                color="black"
                fontWeight="500"
                _hover={{ bg: "#d97706" }}
                transition="colors 0.15s"
                loading={loading}
                w="full"
              >
                Send Reset Link
              </Button>

              <Box textAlign="center">
                <Text color="gray.600" fontSize="sm">
                  Remember your password?{" "}
                  <Text
                    as="span"
                    color="#f59e0b"
                    fontWeight="500"
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => {
                      setShowForgotPassword(false);
                      setEmail("");
                      setEmailError("");
                    }}
                  >
                    Sign In
                  </Text>
                </Text>
              </Box>
            </>
          ) : (
            // LOGIN/SIGNUP VIEW
            <>
          <Box textAlign="center">
            <Heading color="#f59e0b" fontWeight="600" fontSize="2xl" mb={2}>
              Contractor's CRM
            </Heading>
            <Text color="gray.600" fontSize="sm">
              {isSignUp ? "Create your account" : "Sign in to your account"}
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <Field.Root required invalid={!!emailError}>
                <Field.Label fontWeight="500" color="black">
                  Email
                </Field.Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  placeholder="your@email.com"
                  bg="white"
                  border="1px solid"
                  borderColor={emailError ? "red.500" : "gray.300"}
                  color="black"
                  _focus={{
                    borderColor: emailError ? "red.500" : "#f59e0b",
                    boxShadow: emailError ? "0 0 0 1px red" : "0 0 0 1px #f59e0b",
                  }}
                />
                {emailError && (
                  <Field.ErrorText color="red.500" fontSize="sm" mt={1}>
                    {emailError}
                  </Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root required invalid={!!passwordError}>
                <Field.Label fontWeight="500" color="black">
                  Password
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
                {isSignUp && !passwordError && (
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
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </VStack>
          </form>

          {!isSignUp && (
            <Box textAlign="center" mt={-2}>
              <Text
                color="#f59e0b"
                fontSize="sm"
                fontWeight="500"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </Text>
            </Box>
          )}

          <Box textAlign="center">
            <Text color="gray.600" fontSize="sm">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <Text
                as="span"
                color="#f59e0b"
                fontWeight="500"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </Box>
          </>
          )}
        </VStack>
        )}
      </Box>
    </Flex>
  );
}
