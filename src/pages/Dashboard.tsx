import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Calendar, Car, Package, User, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Mock current booking
  const currentBooking = {
    id: "BK001",
    service: "Paint Protection Film",
    vehicle: "2024 Porsche 911 GT3",
    status: "in_progress",
    currentStage: "quality_check",
    stages: [
      { id: "received", label: "Received", completed: true },
      { id: "inspection", label: "Inspection", completed: true },
      { id: "quoted", label: "Quoted", completed: true },
      { id: "in_progress", label: "In Progress", completed: true },
      { id: "quality_check", label: "Quality Check", completed: false },
      { id: "complete", label: "Complete", completed: false },
    ],
    estimatedCompletion: "2 days",
  };

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">CLIENT DASHBOARD</h1>
          <p className="text-text-secondary">Welcome back, track your services and manage your garage</p>
        </div>

        {/* Current Booking Card */}
        <ChromeSurface className="p-8 mb-8" glow>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="chrome-label mb-2 text-text-tertiary">CURRENT BOOKING</div>
              <h2 className="text-2xl font-light text-foreground mb-1">{currentBooking.service}</h2>
              <p className="text-text-secondary flex items-center gap-2">
                <Car className="w-4 h-4" strokeWidth={1.4} />
                {currentBooking.vehicle}
              </p>
            </div>
            <StatusBadge status="limited">In Progress</StatusBadge>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <div className="chrome-label mb-4">SERVICE TIMELINE</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {currentBooking.stages.map((stage, idx) => (
                <div key={stage.id} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                        stage.completed
                          ? "border-success bg-success/20 text-success"
                          : stage.id === currentBooking.currentStage
                          ? "border-primary bg-primary/20 text-primary chrome-glow"
                          : "border-border bg-muted/10 text-muted-foreground"
                      }`}
                    >
                      {stage.completed ? "✓" : idx + 1}
                    </div>
                    <div className={`chrome-label text-[9px] ${stage.completed || stage.id === currentBooking.currentStage ? "text-foreground" : "text-text-tertiary"}`}>
                      {stage.label}
                    </div>
                  </div>
                  {idx < currentBooking.stages.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-full h-0.5 bg-border -z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-border/50">
            <ChromeButton size="sm" asChild>
              <Link to="/job-tracking">
                <Clock className="mr-2 w-3 h-3" strokeWidth={1.4} />
                Track Progress
              </Link>
            </ChromeButton>
            <ChromeButton variant="outline" size="sm">
              <MapPin className="mr-2 w-3 h-3" strokeWidth={1.4} />
              View Location
            </ChromeButton>
          </div>

          {/* ETA */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Clock className="w-4 h-4" strokeWidth={1.4} />
              <span>Estimated completion: <span className="text-primary font-normal">{currentBooking.estimatedCompletion}</span></span>
            </div>
          </div>
        </ChromeSurface>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: "Book Service", to: "/services" },
            { icon: Package, label: "My Bookings", to: "/bookings" },
            { icon: Car, label: "My Vehicles", to: "/garage" },
            { icon: User, label: "Profile", to: "/profile" },
          ].map((action) => (
            <Link key={action.label} to={action.to}>
              <ChromeSurface className="p-6 chrome-sheen hover:chrome-glow-strong transition-all duration-300 cursor-pointer" glow>
                <action.icon className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
                <div className="chrome-label text-xs text-foreground">{action.label}</div>
              </ChromeSurface>
            </Link>
          ))}
        </div>

        {/* Upcoming Bookings */}
        <div className="mb-8">
          <h2 className="chrome-label mb-4 text-foreground">UPCOMING BOOKINGS</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { service: "Ceramic Coating", vehicle: "BMW M4", date: "March 15, 2025" },
              { service: "Interior Detail", vehicle: "Audi RS6", date: "March 22, 2025" },
            ].map((booking, idx) => (
              <ChromeSurface key={idx} className="p-6" glow>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-light text-foreground mb-1">{booking.service}</div>
                    <div className="text-sm text-text-secondary flex items-center gap-2">
                      <Car className="w-3 h-3" strokeWidth={1.4} />
                      {booking.vehicle}
                    </div>
                  </div>
                  <div className="chrome-label text-[10px] text-text-tertiary">{booking.date}</div>
                </div>
              </ChromeSurface>
            ))}
          </div>
        </div>

        {/* Garage Snapshot */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="chrome-label text-foreground">MY GARAGE</h2>
            <ChromeButton variant="ghost" size="sm" asChild>
              <Link to="/garage">View All</Link>
            </ChromeButton>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { make: "Porsche", model: "911 GT3", year: "2024" },
              { make: "BMW", model: "M4 Competition", year: "2023" },
              { make: "Audi", model: "RS6 Avant", year: "2024" },
            ].map((vehicle, idx) => (
              <ChromeSurface key={idx} className="p-6 chrome-sheen" glow>
                <Car className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
                <div className="text-base font-light text-foreground mb-1">
                  {vehicle.year} {vehicle.make}
                </div>
                <div className="chrome-label text-[10px] text-text-secondary">{vehicle.model}</div>
              </ChromeSurface>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
