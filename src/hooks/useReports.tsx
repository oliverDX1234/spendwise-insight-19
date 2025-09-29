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

  return {
    reports,
    isLoading,
    error,
    downloadFile,
  };
}
