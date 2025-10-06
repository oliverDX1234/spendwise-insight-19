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

  const {
    data: reports = [],
    isLoading,
    error,
  } = useQuery({
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
      // Get a signed URL for the file
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("reports")
        .createSignedUrl(url, 60); // 60 seconds expiry

      if (urlError || !signedUrlData) {
        throw urlError || new Error("Failed to get download URL");
      }

      // Download using fetch to get the raw file
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const generateCurrentMonthReport = async (format: "excel" | "pdf") => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/generate-current-month-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ format }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate report");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      const now = new Date();
      const monthYear = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      const extension = format === "excel" ? "xlsx" : "pdf";
      link.download = `SpendWise_Report_${monthYear.replace(
        " ",
        "_"
      )}.${extension}`;
      link.click();
      window.URL.revokeObjectURL(link.href);

      toast.success(
        `Current month report downloaded successfully as ${format.toUpperCase()}`
      );
    } catch (error) {
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
