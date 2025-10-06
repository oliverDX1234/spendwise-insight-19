import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const SeedData = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch(
        'https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/seed-demo-data',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Demo data seeded successfully!', {
          description: `Created ${data.stats.categories} categories, ${data.stats.products} products, and ${data.stats.expenses} expenses.`
        });
      } else {
        toast.error('Failed to seed data', {
          description: data.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed data', {
        description: 'Check console for details'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleGenerateReports = async () => {
    setIsGeneratingReports(true);
    try {
      const response = await fetch(
        'https://alpdddwpjrwapqedcwdw.supabase.co/functions/v1/seed-historical-reports',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail: 'kocovskioliver1234+premium@gmail.com'
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Historical reports generated successfully!', {
          description: `Generated ${data.reports.length} monthly reports.`
        });
      } else {
        toast.error('Failed to generate reports', {
          description: data.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error generating reports:', error);
      toast.error('Failed to generate reports', {
        description: 'Check console for details'
      });
    } finally {
      setIsGeneratingReports(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seed Demo Data</CardTitle>
          <CardDescription>
            This will seed the database with demo data for kocovskioliver1234+premium@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSeedData}
            disabled={isSeeding}
          >
            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSeeding ? 'Seeding...' : 'Seed Demo Data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Historical Reports</CardTitle>
          <CardDescription>
            Generate the last 3 months of reports for kocovskioliver+1234@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateReports}
            disabled={isGeneratingReports}
          >
            {isGeneratingReports && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGeneratingReports ? 'Generating Reports...' : 'Generate Last 3 Months Reports'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeedData;
