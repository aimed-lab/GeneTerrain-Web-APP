import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  useDisclosure,
  useToast,
  VStack,
  HStack,
  Icon,
  Box,
} from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import { getAuth } from "firebase/auth";
import { sendFeedback } from "../../services/feedbackService";

interface FeedbackForm {
  name: string;
  email: string;
  category: string;
  message: string;
  file: File | null;
}

const FeedbackModal: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [form, setForm] = useState<FeedbackForm>({
    name: "",
    email: "",
    category: "",
    message: "",
    file: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    field: keyof FeedbackForm,
    value: string | File | null
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange("file", file);
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      category: "",
      message: "",
      file: null,
    });
  };

  const handleSubmit = async () => {
    if (!form.email || !form.message) {
      toast({
        title: "Required fields missing",
        description: "Please fill in email and message",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getAuth();
      const payload = {
        user_id: auth.currentUser?.uid || "anonymous",
        name: form.name || undefined,
        email: form.email,
        category: form.category || "other",
        message: form.message,
        screenshot_filename: form.file ? form.file.name : null,
        screenshot_mime_type: form.file ? form.file.type : null,
      };

      await sendFeedback(payload);

      toast({
        title: "Thanks for your feedback!",
        description: "We've received your message.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      resetForm();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error submitting feedback",
        description: error?.message || "Please try again later",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <Button
        onClick={onOpen}
        position="fixed"
        bottom="24px"
        right="24px"
        zIndex="1000"
        colorScheme="teal"
        borderRadius="full"
        size="lg"
        boxShadow="lg"
        _hover={{
          transform: "scale(1.05)",
          boxShadow: "xl",
        }}
        _active={{
          transform: "scale(0.95)",
        }}
        transition="all 0.2s"
        leftIcon={<Icon as={ChatIcon} />}
      >
        Feedback
      </Button>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>We value your feedback</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name (optional)</FormLabel>
                <Input
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  placeholder="Select a category"
                  value={form.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                >
                  <option value="bug">Bug Report</option>
                  <option value="suggestion">Feature Suggestion</option>
                  <option value="compliment">Compliment</option>
                  <option value="other">Other</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Message</FormLabel>
                <Textarea
                  placeholder="Tell us what you think..."
                  value={form.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  rows={4}
                  resize="vertical"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Screenshot (optional)</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  p={1}
                />
                {form.file && (
                  <Box mt={2} fontSize="sm" color="gray.600">
                    Selected: {form.file.name}
                  </Box>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button onClick={handleClose} variant="ghost">
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Submitting..."
                isDisabled={!form.email || !form.message}
              >
                Submit Feedback
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FeedbackModal;
