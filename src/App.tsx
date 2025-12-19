import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";
import Index from "./pages/Index";
import ClientLogin from "./pages/auth/ClientLogin";
import StaffLogin from "./pages/auth/StaffLogin";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Garage from "./pages/Garage";
import Store from "./pages/Store";
import Orders from "./pages/Orders";
import Gallery from "./pages/Gallery";
import Reviews from "./pages/Reviews";
import Rewards from "./pages/Rewards";
import Referrals from "./pages/Referrals";
import JobTracking from "./pages/JobTracking";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffBookings from "./pages/staff/StaffBookings";
import StaffCustomers from "./pages/staff/StaffCustomers";
import StaffServices from "./pages/staff/StaffServices";
import StaffMerchandise from "./pages/staff/StaffMerchandise";
import StaffOrders from "./pages/staff/StaffOrders";
import StaffWorkQueue from "./pages/staff/StaffWorkQueue";
import StaffTeam from "./pages/staff/StaffTeam";
import StaffInventory from "./pages/staff/StaffInventory";
import StaffProcessTemplates from "./pages/staff/StaffProcessTemplates";
import StaffDepartments from "./pages/staff/StaffDepartments";
import StaffPromoCodes from "./pages/staff/StaffPromoCodes";
import StaffGallery from "./pages/staff/StaffGallery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <CartProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth/client-login" element={<ClientLogin />} />
                  <Route path="/auth/staff-login" element={<StaffLogin />} />
                  <Route path="/auth/signup" element={<Signup />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/reviews" element={<Reviews />} />
                  
                  {/* Protected client routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/services"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Services />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Bookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/garage"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Garage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/store"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Store />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/job-tracking"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <JobTracking />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rewards"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Rewards />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/referrals"
                    element={
                      <ProtectedRoute allowedRoles={['client']}>
                        <Referrals />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Protected staff routes */}
                  <Route
                    path="/staff/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/bookings"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/customers"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffCustomers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/services"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffServices />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/merchandise"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffMerchandise />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/orders"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/work-queue"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffWorkQueue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/team"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <StaffTeam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/inventory"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffInventory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/process-templates"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <StaffProcessTemplates />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/departments"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <StaffDepartments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/promo-codes"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <StaffPromoCodes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/staff/gallery"
                    element={
                      <ProtectedRoute allowedRoles={['staff', 'admin']}>
                        <StaffGallery />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <InstallPrompt />
                <PushNotificationPrompt />
              </CartProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
