import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const JobTracking = () => {
  const jobDetails = {
    id: "BK001",
    service: "Paint Protection Film - Full Front",
    vehicle: "2024 Porsche 911 GT3",
    startDate: "March 10, 2025",
    estimatedCompletion: "March 14, 2025",
    status: "in_progress",
    currentStage: "quality_check",
  };

  const timeline = [
    {
      id: "received",
      label: "Vehicle Received",
      status: "completed",
      time: "March 10, 10:00 AM",
      notes: "Vehicle received and logged into system",
    },
    {
      id: "inspection",
      label: "Pre-Installation Inspection",
      status: "completed",
      time: "March 10, 11:30 AM",
      notes: "Paint condition assessed, minor correction required",
    },
    {
      id: "quoted",
      label: "Quote Approved",
      status: "completed",
      time: "March 10, 2:00 PM",
      notes: "Client approved quote including paint correction",
    },
    {
      id: "in_progress",
      label: "Installation In Progress",
      status: "completed",
      time: "March 11-13",
      notes: "PPF installation completed on front bumper, hood, fenders, mirrors",
    },
    {
      id: "quality_check",
      label: "Quality Control",
      status: "current",
      time: "In Progress",
      notes: "Final inspection and edge sealing in progress",
    },
    {
      id: "complete",
      label: "Ready for Pickup",
      status: "pending",
      time: "Est. March 14, 3:00 PM",
      notes: "Awaiting final approval",
    },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">JOB TRACKING</h1>
          <p className="text-text-secondary">Real-time progress updates for your service</p>
        </div>

        {/* Job Summary */}
        <ChromeSurface className="p-6 mb-8" glow>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-2">{jobDetails.id}</div>
              <h2 className="text-xl font-light text-foreground mb-1">{jobDetails.service}</h2>
              <p className="text-text-secondary">{jobDetails.vehicle}</p>
            </div>
            <StatusBadge status="limited">In Progress</StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-1">START DATE</div>
              <div className="text-foreground">{jobDetails.startDate}</div>
            </div>
            <div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-1">EST. COMPLETION</div>
              <div className="text-foreground">{jobDetails.estimatedCompletion}</div>
            </div>
          </div>
        </ChromeSurface>

        {/* Timeline */}
        <div className="space-y-4">
          <div className="chrome-label mb-4">PROGRESS TIMELINE</div>
          {timeline.map((stage, idx) => (
            <ChromeSurface key={stage.id} className={`p-6 ${stage.status === "current" ? "chrome-glow" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="mt-1">{getStatusIcon(stage.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-light text-foreground">{stage.label}</h3>
                    <div className="chrome-label text-[10px] text-text-tertiary">{stage.time}</div>
                  </div>
                  <p className="text-sm text-text-secondary">{stage.notes}</p>
                </div>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobTracking;
