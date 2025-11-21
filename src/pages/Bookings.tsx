import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Car, Calendar, Clock } from "lucide-react";

const Bookings = () => {
  const bookings = [
    {
      id: "BK001",
      service: "Paint Protection Film",
      vehicle: "2024 Porsche 911 GT3",
      date: "March 10, 2025",
      status: "limited" as const,
      statusLabel: "In Progress",
    },
    {
      id: "BK002",
      service: "Ceramic Coating",
      vehicle: "BMW M4 Competition",
      date: "March 15, 2025",
      status: "available" as const,
      statusLabel: "Scheduled",
    },
    {
      id: "BK003",
      service: "Full Detail",
      vehicle: "Audi RS6 Avant",
      date: "February 28, 2025",
      status: "unavailable" as const,
      statusLabel: "Completed",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">MY BOOKINGS</h1>
          <p className="text-text-secondary">Track all your service appointments</p>
        </div>

        <div className="space-y-4">
          {bookings.map((booking) => (
            <ChromeSurface key={booking.id} className="p-6" glow>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="chrome-label text-[10px] text-text-tertiary">{booking.id}</div>
                    <StatusBadge status={booking.status}>{booking.statusLabel}</StatusBadge>
                  </div>
                  <h3 className="text-xl font-light text-foreground mb-1">{booking.service}</h3>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-2">
                      <Car className="w-4 h-4" strokeWidth={1.4} />
                      {booking.vehicle}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" strokeWidth={1.4} />
                      {booking.date}
                    </span>
                  </div>
                </div>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
