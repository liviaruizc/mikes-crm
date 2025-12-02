import { NavLink, Outlet } from 'react-router-dom';
import { VStack, Box, Flex, Heading, IconButton, useDisclosure, Drawer } from '@chakra-ui/react';

export default function AppLayout() {
  const { open, onOpen, onClose } = useDisclosure();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/appointments/new', label: 'New Appointment' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/customers', label: 'Customers' },
    { to: '/deals', label: 'Deals' },
    { to: '/pipeline', label: 'Pipeline' },
    { to: '/map', label: 'Map' },
  ];

  const NavLinkItem = ({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) => (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        width: "100%",
        padding: "12px 16px",
        borderRadius: "8px",
        backgroundColor: isActive ? "#f59e0b" : "transparent",
        color: isActive ? "#000000" : "#FFFFFF",
        fontWeight: "500",
        textDecoration: "none",
        fontSize: "16px",
        transition: "all 0.2s",
      })}
    >
      {label}
    </NavLink>
  );

  return (
    <Flex minH="100vh" bg="white" direction="column">
      {/* Mobile Header */}
      <Box
        display={{ base: "flex", md: "none" }}
        bg="#000000"
        p={4}
        borderBottom="1px solid"
        borderColor="gray.200"
        alignItems="center"
        justifyContent="space-between"
      >
        <Heading size="md" color="#f59e0b">
          Mike's CRM
        </Heading>
        <IconButton
          aria-label="Open menu"
          onClick={onOpen}
          bg="gray.800"
          color="white"
          _hover={{ bg: "gray.700" }}
        >
          ☰
        </IconButton>
      </Box>

      <Flex flex="1" overflow="hidden">
        {/* Desktop Sidebar */}
        <Box
          display={{ base: "none", md: "block" }}
          w="256px"
          bg="#000000"
          p={6}
          borderRight="1px solid"
          borderColor="gray.200"
          overflowY="auto"
        >
          <Heading size="lg" color="#f59e0b" mb={8}>
            Mike's CRM
          </Heading>
          <VStack align="start" gap="3" w="full">
            {navLinks.map((link) => (
              <NavLinkItem key={link.to} to={link.to} label={link.label} />
            ))}
          </VStack>
        </Box>

        {/* Mobile Drawer */}
        <Drawer.Root open={open} onOpenChange={onClose} placement="start">
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="#000000">
              <Drawer.Header borderBottom="1px solid" borderColor="gray.700">
                <Heading size="md" color="#f59e0b">
                  Mike's CRM
                </Heading>
              </Drawer.Header>
              <Drawer.CloseTrigger />
              <Drawer.Body p={6}>
                <VStack align="start" gap="3" w="full">
                  {navLinks.map((link) => (
                    <NavLinkItem key={link.to} to={link.to} label={link.label} onClick={onClose} />
                  ))}
                </VStack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>

        {/* Main Content Area */}
        <Box 
          flex="1" 
          p={{ base: 4, md: 8 }} 
          overflowY="auto"
          pb={{ base: "80px", md: 8 }}
        >
          <Outlet />
        </Box>
      </Flex>

      {/* Mobile Bottom Navigation */}
      <Box
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        bg="#000000"
        borderTop="1px solid"
        borderColor="gray.700"
        justifyContent="space-around"
        alignItems="center"
        p={2}
        zIndex={10}
      >
        {[
          { to: '/', icon: '🏠', label: 'Home' },
          { to: '/calendar', icon: '📅', label: 'Calendar' },
          { to: '/customers', icon: '👥', label: 'Customers' },
          { to: '/map', icon: '🗺️', label: 'Map' },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#f59e0b" : "transparent",
              color: isActive ? "#000000" : "#FFFFFF",
              textDecoration: "none",
              fontSize: "12px",
              minWidth: "70px",
            })}
          >
            <span style={{ fontSize: "20px", marginBottom: "4px" }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </Box>
    </Flex>
  );
}
