import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Garage from "./pages/Garage";
import Store from "./pages/Store";
import Gallery from "./pages/Gallery";
import JobTracking from "./pages/JobTracking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/gallery" element={<Gallery />} />
            
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
              path="/job-tracking"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <JobTracking />
                </ProtectedRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
