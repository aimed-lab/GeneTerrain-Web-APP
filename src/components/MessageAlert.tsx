import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  CloseButton,
} from "@chakra-ui/react";
import React from "react";
import * as ReactDOM from "react-dom";

const MessageAlert = ({ message }) => (
  <Alert
    status="success"
    variant="subtle"
    borderRadius="md"
    boxShadow="lg"
    padding={4}
    alignItems="start"
  >
    <Box display="flex" alignItems="center" gap={2}>
      <AlertIcon boxSize={6} />
      <Box>
        <AlertTitle fontWeight="bold" fontSize="lg" mb={1}>
          Stop doing this
        </AlertTitle>
        <AlertDescription fontSize="md" color="gray.700">
          {message || "This is not good, brooo"}
        </AlertDescription>
      </Box>
    </Box>
  </Alert>
);

export const AlertMessage = (message) => {
  alert("triggered");
  ReactDOM.render(
    <MessageAlert message={message} />,
    document.getElementById("alertContainer")
  );
};

export default MessageAlert;
