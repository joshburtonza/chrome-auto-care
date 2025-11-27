import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ClientNav } from "@/components/client/ClientNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const JobTracking = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBooking) {
      fetchStages();
      
      // Set up realtime subscription for stages
      const channel = supabase
        .channel('booking-stages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'booking_stages',
            filter: `booking_id=eq.${selectedBooking.id}`
          },
          () => {
            fetchStages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedBooking]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services (title),
        vehicles (make, model, year)
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else if (data && data.length > 0) {
      setBookings(data);
      setSelectedBooking(data[0]); // Select most recent booking
    }
    setLoading(false);
  };

  const fetchStages = async () => {
    if (!selectedBooking) return;

    const { data, error } = await supabase
      .from("booking_stages")
      .select("*")
      .eq("booking_id", selectedBooking.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching stages:", error);
    } else {
      setStages(data || []);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      received: "Vehicle Received",
      inspection: "Pre-Installation Inspection",
      quoted: "Quote Approved",
      in_progress: "Installation In Progress",
      quality_check: "Quality Control",
      complete: "Ready for Pickup"
    };
    return labels[stage] || stage;
  };

  const getStageStatus = (stage: any, index: number) => {
    if (stage.completed) return "completed";
    if (selectedBooking?.current_stage === stage.stage) return "current";
    return "pending";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={1.4} />;
      case "current":
        return <Clock className="w-5 h-5 text-primary" strokeWidth={1.4} />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" strokeWidth={1.4} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="chrome-label">LOADING...</div>
        </div>
      </div>
    );
  }

  if (!selectedBooking) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="chrome-title text-4xl mb-2">JOB TRACKING</h1>
            <p className="text-text-secondary">No active bookings found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">JOB TRACKING</h1>
          <p className="text-text-secondary">Real-time progress updates for your service</p>
        </div>

        {/* Job Summary */}
        <ChromeSurface className="p-6 mb-8" glow>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-2">
                {selectedBooking.id.slice(0, 8).toUpperCase()}
              </div>
              <h2 className="text-xl font-light text-foreground mb-1">
                {selectedBooking.services?.title}
              </h2>
              <p className="text-text-secondary">
                {selectedBooking.vehicles?.year} {selectedBooking.vehicles?.make} {selectedBooking.vehicles?.model}
              </p>
            </div>
            <StatusBadge status={selectedBooking.status}>{selectedBooking.status}</StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-1">START DATE</div>
              <div className="text-foreground">
                {format(new Date(selectedBooking.booking_date), "MMMM d, yyyy")}
              </div>
            </div>
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-1">EST. COMPLETION</div>
              <div className="text-foreground">
                {selectedBooking.estimated_completion 
                  ? format(new Date(selectedBooking.estimated_completion), "MMMM d, yyyy")
                  : "TBD"}
              </div>
            </div>
          </div>
        </ChromeSurface>

        {/* Timeline */}
        <div className="space-y-4">
          <div className="chrome-label mb-4">PROGRESS TIMELINE</div>
          {stages.length > 0 ? (
            stages.map((stage, idx) => {
              const status = getStageStatus(stage, idx);
              return (
                <ChromeSurface key={stage.id} className={`p-6 ${status === "current" ? "chrome-glow" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(status)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-light text-foreground">
                          {getStageLabel(stage.stage)}
                        </h3>
                        <div className="chrome-label text-[10px] text-text-tertiary">
                          {stage.completed_at 
                            ? format(new Date(stage.completed_at), "MMM d, h:mm a")
                            : status === "current" ? "In Progress" : "Pending"}
                        </div>
                      </div>
                      {stage.notes && (
                        <p className="text-sm text-text-secondary">{stage.notes}</p>
                      )}
                    </div>
                  </div>
                </ChromeSurface>
              );
            })
          ) : (
            <ChromeSurface className="p-6">
              <p className="text-text-secondary">No stages have been set up for this booking yet.</p>
            </ChromeSurface>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobTracking;
