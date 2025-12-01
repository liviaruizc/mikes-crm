import { NavLink, Outlet } from 'react-router-dom';
import { VStack, Box, Flex, Heading } from '@chakra-ui/react';

export default function AppLayout() {
  return (
    <Flex minH="100vh" bg="gray.900">
      {/* Sidebar */}
      <Box
        w="250px"
        bg="gray.800"
        p={6}
        borderRight="1px solid"
        borderColor="gray.700"
      >
        <Heading size="lg" color="gold.400" mb={8}>
          Mike's CRM
        </Heading>

        <VStack align="start" gap="3" w="full">
          <NavLink
            to="/"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            Home
          </NavLink>

          <NavLink
            to="/appointments/new"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            New Appointment
          </NavLink>

          <NavLink
            to="/calendar"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            Calendar
          </NavLink>

          <NavLink
            to="/customers"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            Customers
          </NavLink>

          <NavLink
            to="/pipeline"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            Pipeline
          </NavLink>

          <NavLink
            to="/map"
            style={({ isActive }) => ({
              width: "100%",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#D4AF37" : "transparent",
              color: isActive ? "black" : "white",
              fontWeight: isActive ? "600" : "400",
              textDecoration: "none",
              fontSize: "16px",
              transition: "all 0.2s",
            })}
          >
            Map
          </NavLink>
        </VStack>
      </Box>

      {/* Main Content Area */}
      <Box flex="1" p={8}>
        <Outlet />
      </Box>
    </Flex>
  );
}
