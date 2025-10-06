import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import * as XLSX from "https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  description: string | null;
  category: {
    name: string;
    color: string;
  };
  expense_products: Array<{
    quantity: number;
    price_per_unit: number;
    product: {
      name: string;
    };
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userEmail } = await req.json();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("user_id, id")
      .eq("email", userEmail)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    // Generate reports for last 3 months
    for (let i = 1; i <= 3; i++) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const monthYear = targetDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      console.log(`Generating report for ${monthYear}...`);

      // Fetch expenses for this month
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
          *,
          category:categories(name, color),
          expense_products(
            quantity,
            price_per_unit,
            product:products(name)
          )
        `
        )
        .eq("user_id", userData.user_id)
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .lte("expense_date", endDate.toISOString().split("T")[0])
        .order("expense_date", { ascending: false });

      if (expensesError) {
        console.error(`Error fetching expenses for ${monthYear}:`, expensesError);
        continue;
      }

      if (!expenses || expenses.length === 0) {
        console.log(`No expenses found for ${monthYear}, skipping...`);
        continue;
      }

      // Generate Excel report
      const excelBuffer = await generateExcelReport(expenses, monthYear);

      // Upload to storage
      const fileName = `${userData.user_id}/${monthYear.replace(" ", "_")}_report.xlsx`;
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, excelBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Error uploading report for ${monthYear}:`, uploadError);
        continue;
      }

      // Get next report number
      const { data: existingReports } = await supabase
        .from("reports")
        .select("report_number")
        .eq("user_id", userData.user_id)
        .order("report_number", { ascending: false })
        .limit(1);

      const nextReportNumber = existingReports && existingReports.length > 0
        ? existingReports[0].report_number + 1
        : 1;

      // Create report record
      const { error: reportError } = await supabase.from("reports").insert({
        user_id: userData.user_id,
        report_number: nextReportNumber,
        month_year: monthYear,
        excel_url: fileName,
        created_at: new Date(year, month, endDate.getDate()).toISOString(),
      });

      if (reportError) {
        console.error(`Error creating report record for ${monthYear}:`, reportError);
        continue;
      }

      results.push({
        month: monthYear,
        expenses_count: expenses.length,
        report_number: nextReportNumber,
      });

      console.log(`✓ Report generated for ${monthYear}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${results.length} reports`,
        reports: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in seed-historical-reports:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateExcelReport(
  expenses: any[],
  monthYear: string
): Promise<Uint8Array> {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Expenses
  const expensesData = expenses.map((expense) => ({
    Date: new Date(expense.expense_date).toLocaleDateString(),
    Category: expense.category?.name || "Unknown",
    Description: expense.description || "",
    Amount: parseFloat(expense.amount),
    Products: expense.expense_products
      ?.map((ep: any) => `${ep.product?.name} (${ep.quantity}x)`)
      .join(", ") || "",
  }));
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");

  // Sheet 2: By Category
  const categoryTotals = expenses.reduce((acc: any, expense) => {
    const categoryName = expense.category?.name || "Unknown";
    acc[categoryName] = (acc[categoryName] || 0) + parseFloat(expense.amount);
    return acc;
  }, {});

  const categoryData = Object.entries(categoryTotals).map(
    ([category, total]) => ({
      Category: category,
      Total: total,
    })
  );
  const categorySheet = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, "By Category");

  // Sheet 3: By Products
  const productTotals: any = {};
  expenses.forEach((expense) => {
    expense.expense_products?.forEach((ep: any) => {
      const productName = ep.product?.name || "Unknown";
      if (!productTotals[productName]) {
        productTotals[productName] = { quantity: 0, total: 0 };
      }
      productTotals[productName].quantity += ep.quantity;
      productTotals[productName].total +=
        ep.quantity * parseFloat(ep.price_per_unit);
    });
  });

  const productData = Object.entries(productTotals).map(
    ([product, data]: [string, any]) => ({
      Product: product,
      Quantity: data.quantity,
      Total: data.total,
    })
  );
  const productSheet = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(workbook, productSheet, "By Products");

  // Sheet 4: Analytics
  const totalSpent = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  );
  const averageExpense = totalSpent / expenses.length;
  const topCategory = Object.entries(categoryTotals).sort(
    ([, a]: any, [, b]: any) => b - a
  )[0];

  const analyticsData = [
    { Metric: "Total Expenses", Value: expenses.length },
    { Metric: "Total Amount Spent", Value: totalSpent.toFixed(2) },
    { Metric: "Average Expense", Value: averageExpense.toFixed(2) },
    {
      Metric: "Top Category",
      Value: topCategory ? `${topCategory[0]} ($${topCategory[1]})` : "N/A",
    },
    { Metric: "Report Period", Value: monthYear },
  ];
  const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData);
  XLSX.utils.book_append_sheet(workbook, analyticsSheet, "Analytics");

  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
