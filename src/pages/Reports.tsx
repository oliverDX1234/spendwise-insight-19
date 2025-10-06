import * as React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { format } from "date-fns";
import { ReportFormatDialog } from "@/components/ReportFormatDialog";

export default function Reports() {
  const { reports, isLoading, downloadFile, generateCurrentMonthReport } = useReports();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [formatDialogOpen, setFormatDialogOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<{
    type: "current" | "historical";
    report?: any;
  } | null>(null);

  const handleSelectFormat = async (format: "excel" | "pdf") => {
    if (!selectedReport) return;

    if (selectedReport.type === "current") {
      setIsGenerating(true);
      await generateCurrentMonthReport(format);
      setIsGenerating(false);
    } else if (selectedReport.report) {
      const url = format === "excel" ? selectedReport.report.excel_url : selectedReport.report.pdf_url;
      if (url) {
        const extension = format === "excel" ? "xlsx" : "pdf";
        await downloadFile(
          url,
          `Report_${selectedReport.report.report_number}_${selectedReport.report.month_year}.${extension}`
        );
      }
    }
    setSelectedReport(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Reports</h1>
          <p className="text-muted-foreground mt-2">
            View and download your monthly expense reports
          </p>
        </div>
      </div>

      <ReportFormatDialog
        open={formatDialogOpen}
        onOpenChange={setFormatDialogOpen}
        onSelectFormat={handleSelectFormat}
      />

      <Card className="p-6">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setSelectedReport({ type: "current" });
              setFormatDialogOpen(true);
            }}
            disabled={isGenerating}
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Download Current Month Report"}
          </Button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-muted-foreground">
              Reports are generated automatically at the end of each month
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    Report No.{report.report_number}
                  </TableCell>
                  <TableCell>{report.month_year}</TableCell>
                  <TableCell>
                    {format(new Date(report.created_at), "PPP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport({ type: "historical", report });
                        setFormatDialogOpen(true);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
