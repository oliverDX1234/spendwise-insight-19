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
      
      // Generate PDF report
      const pdfBuffer = await generatePDFReport(expenses, monthYear);

      // Upload Excel to storage
      const excelFileName = `${userData.user_id}/${monthYear.replace(" ", "_")}_report.xlsx`;
      const { error: excelUploadError } = await supabase.storage
        .from("reports")
        .upload(excelFileName, excelBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });

      if (excelUploadError) {
        console.error(`Error uploading Excel report for ${monthYear}:`, excelUploadError);
        continue;
      }

      // Upload PDF to storage
      const pdfFileName = `${userData.user_id}/${monthYear.replace(" ", "_")}_report.pdf`;
      const { error: pdfUploadError } = await supabase.storage
        .from("reports")
        .upload(pdfFileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (pdfUploadError) {
        console.error(`Error uploading PDF report for ${monthYear}:`, pdfUploadError);
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
        excel_url: excelFileName,
        pdf_url: pdfFileName,
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

  // Sheet 1: Expenses Summary
  const expenseRows = expenses.map(exp => ({
    Date: new Date(exp.expense_date).toLocaleDateString(),
    Description: exp.description || '-',
    Category: exp.category?.name || 'Uncategorized',
    Products: exp.expense_products?.map((ep: any) => 
      `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
    ).join(', ') || '-',
    Amount: `$${Number(exp.amount).toFixed(2)}`,
  }));

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  expenseRows.push({
    Date: '',
    Description: '',
    Category: '',
    Products: 'TOTAL',
    Amount: `$${totalAmount.toFixed(2)}`,
  });

  const sheet1 = XLSX.utils.json_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Expenses');

  // Sheet 2: By Category
  const categoryMap = new Map();
  expenses.forEach(exp => {
    const cat = exp.category?.name || 'Uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
  });

  const categoryRows = Array.from(categoryMap.entries()).map(([cat, amount]) => ({
    Category: cat,
    'Total Spent': `$${amount.toFixed(2)}`,
    Percentage: `${((amount / totalAmount) * 100).toFixed(1)}%`,
  }));

  const sheet2 = XLSX.utils.json_to_sheet(categoryRows);
  XLSX.utils.book_append_sheet(workbook, sheet2, 'By Category');

  // Sheet 3: By Products
  const productMap = new Map();
  expenses.forEach(exp => {
    exp.expense_products?.forEach((ep: any) => {
      const name = ep.product?.name || 'Unknown';
      const current = productMap.get(name) || { quantity: 0, total: 0 };
      productMap.set(name, {
        quantity: current.quantity + ep.quantity,
        total: current.total + (ep.quantity * Number(ep.price_per_unit)),
      });
    });
  });

  const productRows = Array.from(productMap.entries()).map(([name, data]) => ({
    Product: name,
    'Total Quantity': data.quantity,
    'Total Spent': `$${data.total.toFixed(2)}`,
  }));

  const sheet3 = XLSX.utils.json_to_sheet(productRows);
  XLSX.utils.book_append_sheet(workbook, sheet3, 'By Products');

  // Sheet 4: Analytics
  const recurringCount = expenses.filter(e => e.is_recurring).length;
  const oneTimeCount = expenses.length - recurringCount;

  const analyticsRows = [
    { Metric: 'Total Expenses', Value: expenses.length },
    { Metric: 'Total Amount', Value: `$${totalAmount.toFixed(2)}` },
    { Metric: 'Recurring Expenses', Value: recurringCount },
    { Metric: 'One-Time Expenses', Value: oneTimeCount },
    { Metric: 'Average per Expense', Value: `$${(totalAmount / expenses.length).toFixed(2)}` },
    { Metric: 'Categories Used', Value: categoryMap.size },
    { Metric: 'Products Purchased', Value: productMap.size },
  ];

  const sheet4 = XLSX.utils.json_to_sheet(analyticsRows);
  XLSX.utils.book_append_sheet(workbook, sheet4, 'Analytics');

  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

async function generatePDFReport(expenses: any[], monthYear: string): Promise<Uint8Array> {
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  // Calculate category totals
  const categoryMap = new Map();
  expenses.forEach(exp => {
    const cat = exp.category?.name || 'Uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
  });

  // Build PDF content
  let content = `SPENDWISE MONTHLY REPORT\n${monthYear}\n\n`;
  content += `SUMMARY\n${'='.repeat(60)}\n`;
  content += `Total Expenses: ${expenses.length}\n`;
  content += `Total Amount: $${totalAmount.toFixed(2)}\n\n`;
  
  content += `EXPENSES BY CATEGORY\n${'='.repeat(60)}\n`;
  Array.from(categoryMap.entries()).forEach(([cat, amount]) => {
    const percentage = ((amount / totalAmount) * 100).toFixed(1);
    content += `${cat}: $${amount.toFixed(2)} (${percentage}%)\n`;
  });
  
  content += `\n\nDETAILED EXPENSES\n${'='.repeat(60)}\n\n`;
  expenses.forEach((exp, idx) => {
    content += `${idx + 1}. ${new Date(exp.expense_date).toLocaleDateString()}\n`;
    content += `   Category: ${exp.category?.name || 'Uncategorized'}\n`;
    content += `   Amount: $${Number(exp.amount).toFixed(2)}\n`;
    if (exp.description) content += `   Description: ${exp.description}\n`;
    if (exp.expense_products?.length > 0) {
      content += `   Products: ${exp.expense_products.map((ep: any) => 
        `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
      ).join(', ')}\n`;
    }
    content += '\n';
  });

  content += `${'='.repeat(60)}\n`;
  content += `TOTAL: $${totalAmount.toFixed(2)}\n`;

  // Create a proper PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Courier
>>
endobj
5 0 obj
<<
/Length ${content.length + 50}
>>
stream
BT
/F1 10 Tf
50 750 Td
15 TL
${content.split('\n').map(line => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`).join('\n')}
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000341 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${500 + content.length}
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdfContent);
}
