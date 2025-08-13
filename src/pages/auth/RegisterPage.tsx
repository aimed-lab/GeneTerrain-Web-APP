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
  FormErrorMessage,
  useToast,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useAuth } from "../../components/context/AuthContext";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to home page
  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.fullName) {
      newErrors.fullName = "Name is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      toast({
        title: "Account created successfully",
        status: "success",
        duration: 3000,
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
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
        <form onSubmit={handleRegister}>
          <VStack spacing={6}>
            <Heading color="geneTerrain.primary">Create Account</Heading>

            <FormControl isInvalid={!!errors.fullName}>
              <FormLabel color="geneTerrain.textSecondary">Full Name</FormLabel>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                bg="white"
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ borderColor: "geneTerrain.accent1" }}
                _focus={{ borderColor: "geneTerrain.accent1" }}
              />
              <FormErrorMessage>{errors.fullName}</FormErrorMessage>
            </FormControl>

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

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel color="geneTerrain.textSecondary">
                Confirm Password
              </FormLabel>
              <Input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                bg="white"
                borderColor="geneTerrain.border"
                color="geneTerrain.textPrimary"
                _hover={{ borderColor: "geneTerrain.accent1" }}
                _focus={{ borderColor: "geneTerrain.accent1" }}
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>

            <Button
              w="full"
              bg="geneTerrain.accent1"
              color="white"
              type="submit"
              isLoading={isLoading}
              _hover={{ bg: "geneTerrain.primary" }}
            >
              Create Account
            </Button>

            <Text color="geneTerrain.textMuted">
              Already have an account?{" "}
              <RouterLink to="/login">
                <Text as="span" color="geneTerrain.accent1" fontWeight="medium">
                  Sign in
                </Text>
              </RouterLink>
            </Text>
          </VStack>
        </form>
      </Box>
    </Container>
  );
};

export default RegisterPage;
