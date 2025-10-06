import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";

interface ReportFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFormat: (format: "excel" | "pdf") => void;
  title?: string;
  description?: string;
}

export function ReportFormatDialog({
  open,
  onOpenChange,
  onSelectFormat,
  title = "Choose Report Format",
  description = "Select the format you'd like to download",
}: ReportFormatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => {
              onSelectFormat("excel");
              onOpenChange(false);
            }}
          >
            <FileSpreadsheet className="h-8 w-8" />
            <span>Excel (.xlsx)</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => {
              onSelectFormat("pdf");
              onOpenChange(false);
            }}
          >
            <FileText className="h-8 w-8" />
            <span>PDF (.pdf)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
