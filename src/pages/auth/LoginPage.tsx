import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Divider,
  HStack,
  Icon,
  FormErrorMessage,
  useToast,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useAuth } from "../../components/context/AuthContext";

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      login(result);
      toast({
        title: "Login successful",
        status: "success",
        duration: 3000,
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    const authProvider =
      provider === "google"
        ? new GoogleAuthProvider()
        : new FacebookAuthProvider();

    try {
      const result = await signInWithPopup(auth, authProvider);
      login(result);
      toast({
        title: "Login successful",
        status: "success",
        duration: 3000,
      });
      navigate("/"); // Changed from "/dashboard" to "/" for home page
    } catch (error: any) {
      toast({
        title: "Social login failed",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Container maxW="lg" py={{ base: "12", md: "24" }}>
      <Box
        bg="white" // Always use white background
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor="geneTerrain.border"
      >
        <form onSubmit={handleLogin}>
          <VStack spacing={6}>
            <Heading color="geneTerrain.primary">Sign In</Heading>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel color="geneTerrain.textSecondary">Email</FormLabel>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                bg="white"
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ borderColor: "geneTerrain.accent1" }}
                _focus={{ borderColor: "geneTerrain.accent1" }}
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel color="geneTerrain.textSecondary">Password</FormLabel>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                bg="white"
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ borderColor: "geneTerrain.accent1" }}
                _focus={{ borderColor: "geneTerrain.accent1" }}
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <Button
              w="full"
              type="submit"
              isLoading={isLoading}
              bg="geneTerrain.accent1"
              color="white"
              _hover={{ bg: "geneTerrain.primary" }}
            >
              Sign In
            </Button>

            <Divider borderColor="geneTerrain.border" />

            <Text color="geneTerrain.textMuted">Or continue with</Text>

            <HStack spacing={4} width="full">
              <Button
                w="full"
                variant="outline"
                leftIcon={<Icon as={FaGoogle} />}
                onClick={() => handleSocialLogin("google")}
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ bg: "geneTerrain.accent1", color: "white" }}
              >
                Google
              </Button>
              <Button
                w="full"
                variant="outline"
                leftIcon={<Icon as={FaFacebook} />}
                onClick={() => handleSocialLogin("facebook")}
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ bg: "geneTerrain.accent1", color: "white" }}
              >
                Facebook
              </Button>
            </HStack>

            <Text color="geneTerrain.textMuted">
              New user?{" "}
              <RouterLink to="/register">
                <Text as="span" color="geneTerrain.accent1" fontWeight="medium">
                  Create account
                </Text>
              </RouterLink>
            </Text>
          </VStack>
        </form>
      </Box>
    </Container>
  );
};

export default LoginPage;
