import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TABLES = [
  "profiles",
  "vehicles",
  "services",
  "bookings",
  "booking_services",
  "booking_stages",
  "booking_stage_images",
  "booking_audit_log",
  "staff_profiles",
  "user_roles",
  "departments",
  "leads",
  "lead_activities",
  "inventory",
  "inventory_transactions",
  "merchandise",
  "orders",
  "order_items",
  "cart_items",
  "gallery_items",
  "reviews",
  "notifications",
  "notification_preferences",
  "loyalty_points",
  "loyalty_transactions",
  "referrals",
  "promo_codes",
  "promo_code_redemptions",
  "process_templates",
  "process_template_stages",
  "service_availability",
  "staff_invitations",
  "addon_requests",
  "push_subscriptions",
  "whatsapp_alert_queue",
  "vehicle_catalog",
] as const;

type TableName = typeof TABLES[number];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = typeof val === "object" ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function DataExport() {
  const [status, setStatus] = useState<Record<string, "loading" | "done" | "empty" | "error">>({});
  const [allLoading, setAllLoading] = useState(false);

  const exportTable = async (table: TableName) => {
    setStatus((s) => ({ ...s, [table]: "loading" }));
    try {
      // Fetch up to 10000 rows
      const { data, error } = await (supabase.from(table) as any).select("*").limit(10000);
      if (error) throw error;
      if (!data || data.length === 0) {
        setStatus((s) => ({ ...s, [table]: "empty" }));
        return false;
      }
      const csv = toCsv(data);
      downloadCsv(`${table}.csv`, csv);
      setStatus((s) => ({ ...s, [table]: "done" }));
      return true;
    } catch (err) {
      console.error(`Export ${table} failed:`, err);
      setStatus((s) => ({ ...s, [table]: "error" }));
      return false;
    }
  };

  const exportAll = async () => {
    setAllLoading(true);
    let exported = 0;
    for (const table of TABLES) {
      const ok = await exportTable(table);
      if (ok) exported++;
      // small delay between downloads so browser doesn't block them
      await new Promise((r) => setTimeout(r, 300));
    }
    setAllLoading(false);
    toast.success(`Exported ${exported} tables`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Export</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Download all database tables as CSV files
            </p>
          </div>
          <Button onClick={exportAll} disabled={allLoading} size="lg">
            {allLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export All
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {TABLES.map((table) => (
              <div
                key={table}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50"
              >
                <span className="font-mono text-sm text-foreground">{table}</span>
                <div className="flex items-center gap-2">
                  {status[table] === "done" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {status[table] === "empty" && (
                    <span className="text-xs text-muted-foreground">empty</span>
                  )}
                  {status[table] === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportTable(table)}
                    disabled={status[table] === "loading" || allLoading}
                  >
                    {status[table] === "loading" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
