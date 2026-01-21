import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { VStack, Box, Flex, Heading, IconButton, useDisclosure, Drawer, Button, createToaster, Text } from '@chakra-ui/react';
import { supabase } from '../../lib/supabaseClient';
import { Home, CalendarDays, Users, Briefcase, Map, Settings, Bell, PieChart, GitBranch, Plus } from 'lucide-react';
import logo from '../../../logo.svg';

const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

export default function AppLayout() {
  const { open, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/appointments/new', label: 'New Appointment', icon: Plus },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/deals', label: 'Deals', icon: Briefcase },
    { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
    { to: '/stats', label: 'Stats', icon: PieChart },
    { to: '/map', label: 'Map', icon: Map },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      toaster.create({
        title: "Logged out",
        description: "You have been logged out successfully.",
        type: "success",
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toaster.create({
        title: "Error",
        description: "Failed to log out.",
        type: "error",
      });
    }
  }

  const NavLinkItem = ({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) => (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: "100%",
        padding: "10px 16px",
        borderRadius: "4px",
        backgroundColor: isActive ? "#f59e0b" : "transparent",
        color: isActive ? "#000000" : "#FFFFFF",
        fontWeight: "400",
        textDecoration: "none",
        fontSize: "15px",
        transition: "all 0.2s",
      })}
    >
      <Icon size={20} />
      <Text flex="1" fontSize="15px" fontWeight="400">
        {label}
      </Text>
      <Box as="span" opacity="0.5" fontSize="18px">›</Box>
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
          Cliently
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
          <Box mb={8} display="flex" justifyContent="center">
            <img src={logo} alt="Cliently" style={{ width: '100px', height: '100px' }} />
          </Box>
          
          <Text 
            fontSize="11px" 
            fontWeight="600" 
            color="gray.500" 
            letterSpacing="0.1em" 
            mb={3}
            textTransform="uppercase"
          >
            OVERVIEW
          </Text>
          
          <VStack align="start" gap="1" w="full">
            {navLinks.map((link) => (
              <NavLinkItem key={link.to} to={link.to} label={link.label} icon={link.icon} />
            ))}
            <Button
              w="full"
              mt={4}
              bg="transparent"
              color="red.400"
              border="1px solid"
              borderColor="red.400"
              fontWeight="500"
              _hover={{ bg: "red.400", color: "white" }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </VStack>
        </Box>

        {/* Mobile Drawer */}
        <Drawer.Root open={open} onOpenChange={onClose} placement="start">
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="#000000">
              <Drawer.Header borderBottom="1px solid" borderColor="gray.700">
                <Box display="flex" justifyContent="center">
                  <img src={logo} alt="Cliently" style={{ width: '60px', height: '60px' }} />
                </Box>
              </Drawer.Header>
              <Drawer.CloseTrigger />
              <Drawer.Body p={6}>
                <Text 
                  fontSize="11px" 
                  fontWeight="600" 
                  color="gray.500" 
                  letterSpacing="0.1em" 
                  mb={3}
                  textTransform="uppercase"
                >
                  OVERVIEW
                </Text>
                
                <VStack align="start" gap="1" w="full">
                  {navLinks.map((link) => (
                    <NavLinkItem key={link.to} to={link.to} label={link.label} icon={link.icon} onClick={onClose} />
                  ))}
                  <Button
                    w="full"
                    mt={4}
                    bg="transparent"
                    color="red.400"
                    border="1px solid"
                    borderColor="red.400"
                    fontWeight="500"
                    _hover={{ bg: "red.400", color: "white" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
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
        overflowX="auto"
      >
        {[
          { to: '/', label: 'Home', icon: Home },
          { to: '/calendar', label: 'Calendar', icon: CalendarDays },
          { to: '/customers', label: 'Customers', icon: Users },
          { to: '/deals', label: 'Deals', icon: Briefcase },
          { to: '/map', label: 'Map', icon: Map },
          { to: '/settings', label: 'Settings', icon: Settings },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "8px 8px",
              borderRadius: "8px",
              backgroundColor: isActive ? "#f59e0b" : "transparent",
              color: isActive ? "#000000" : "#FFFFFF",
              textDecoration: "none",
              fontSize: "11px",
              minWidth: "60px",
              flexShrink: 0,
            })}
          >
            <link.icon size={18} style={{ marginBottom: "2px" }} />
            {link.label}
          </NavLink>
        ))}
      </Box>
    </Flex>
  );
}
