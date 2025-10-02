import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Report {
  id: string;
  user_id: string;
  report_number: number;
  month_year: string;
  created_at: string;
  pdf_url: string | null;
  excel_url: string | null;
}

export function useReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ["reports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!user?.id,
  });

  const downloadFile = async (url: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("reports")
        .download(url);

      if (error) throw error;

      const blob = new Blob([data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);

      toast.success("Report downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const generateCurrentMonthReport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-current-month-report",
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (error) throw error;

      const blob = new Blob([data]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      const now = new Date();
      const monthYear = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      link.download = `SpendWise_Report_${monthYear.replace(" ", "_")}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(link.href);

      toast.success("Current month report downloaded successfully");
    } catch (error: any) {
      console.error("Error generating current month report:", error);
      toast.error("Failed to generate report. Please try again.");
    }
  };

  return {
    reports,
    isLoading,
    error,
    downloadFile,
    generateCurrentMonthReport,
  };
}
