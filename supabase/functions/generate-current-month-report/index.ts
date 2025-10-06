import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  description: string;
  category: { name: string; color: string };
  expense_products: Array<{
    product: { name: string };
    quantity: number;
    price_per_unit: number;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get format from request body
    const { format = "excel" } = await req
      .json()
      .catch(() => ({ format: "excel" }));

    // Get current month's date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = now;
    const monthYear = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    console.log(`Generating current month report for user ${user.id}`);

    // Fetch user's expenses for current month
    const { data: expenses, error: expensesError } = await supabaseClient
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
      .eq("user_id", user.id)
      .gte("expense_date", startDate.toISOString().split("T")[0])
      .lte("expense_date", endDate.toISOString().split("T")[0])
      .order("expense_date", { ascending: false });

    if (expensesError) throw expensesError;

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: "No expenses found for current month" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Generate report based on format
    let buffer: Uint8Array;
    let contentType: string;
    let filename: string;

    if (format === "pdf") {
      buffer = await generatePDFReport(expenses, monthYear);
      contentType = "application/pdf";
      filename = `SpendWise_Report_${monthYear.replace(" ", "_")}.pdf`;
    } else {
      buffer = await generateExcelReport(expenses, monthYear);
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `SpendWise_Report_${monthYear.replace(" ", "_")}.xlsx`;
    }

    // Return the file
    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error in generate-current-month-report:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function generateExcelReport(
  expenses: any[],
  monthYear: string
): Promise<Uint8Array> {
  const workbook = XLSX.utils.book_new();

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Define color scheme matching PDF
  const colors = {
    headerBg: "4F46E5", // Indigo
    headerText: "FFFFFF", // White
    totalBg: "22C55E", // Green
    categoryColors: [
      "FF6384",
      "36A2EB",
      "FFCE56",
      "4BC0C0",
      "9966FF",
      "FF9F40",
      "2ECC71",
      "E74C3C",
      "3498DB",
      "9B59B6",
    ],
  };

  // Sheet 1: Summary Dashboard
  const summaryData = [
    ["SPENDWISE MONTHLY REPORT"],
    [monthYear],
    [""],
    ["SUMMARY STATISTICS"],
    ["Metric", "Value"],
    ["Total Expenses", expenses.length],
    ["Total Amount", totalAmount.toFixed(2)],
    ["Average per Expense", (totalAmount / expenses.length).toFixed(2)],
    ["Recurring Expenses", expenses.filter((e) => e.is_recurring).length],
    [
      "One-Time Expenses",
      expenses.length - expenses.filter((e) => e.is_recurring).length,
    ],
    [
      "Date Range",
      `${new Date(
        expenses[expenses.length - 1]?.expense_date || new Date()
      ).toLocaleDateString()} - ${new Date(
        expenses[0]?.expense_date || new Date()
      ).toLocaleDateString()}`,
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];

  // Merge and style title
  if (!summarySheet["!merges"]) summarySheet["!merges"] = [];
  summarySheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  summarySheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Sheet 2: Detailed Expenses
  const expenseRows = expenses.map((exp) => ({
    Date: new Date(exp.expense_date).toLocaleDateString(),
    Category: exp.category?.name || "Uncategorized",
    Description: exp.description || "-",
    Products:
      exp.expense_products
        ?.map(
          (ep: any) =>
            `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
        )
        .join(", ") || "-",
    Amount: Number(exp.amount).toFixed(2),
    Type: exp.is_recurring ? "Recurring" : "One-Time",
  }));

  // Add total row
  expenseRows.push({
    Date: "",
    Category: "",
    Description: "",
    Products: "TOTAL",
    Amount: totalAmount.toFixed(2),
    Type: "",
  });

  const sheet1 = XLSX.utils.json_to_sheet(expenseRows);

  // Set column widths for expenses
  sheet1["!cols"] = [
    { wch: 12 }, // Date
    { wch: 15 }, // Category
    { wch: 30 }, // Description
    { wch: 40 }, // Products
    { wch: 12 }, // Amount
    { wch: 12 }, // Type
  ];

  XLSX.utils.book_append_sheet(workbook, sheet1, "All Expenses");

  // Sheet 3: By Category (with detailed breakdown)
  const categoryMap = new Map();
  const categoryExpenseCount = new Map();

  expenses.forEach((exp) => {
    const cat = exp.category?.name || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
    categoryExpenseCount.set(cat, (categoryExpenseCount.get(cat) || 0) + 1);
  });

  // Sort categories by amount (highest first)
  const sortedCategories = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const categoryData = [
    ["SPENDING BY CATEGORY"],
    [""],
    [
      "Category",
      "Total Spent",
      "# Expenses",
      "Avg per Expense",
      "% of Total",
      "Visual",
    ],
  ];

  sortedCategories.forEach(([cat, amount]) => {
    const count = categoryExpenseCount.get(cat) || 1;
    const percentage = (amount / totalAmount) * 100;
    const bars = "█".repeat(Math.round(percentage / 2)); // Visual bar representation

    categoryData.push([
      cat,
      amount.toFixed(2),
      count,
      (amount / count).toFixed(2),
      `${percentage.toFixed(1)}%`,
      bars,
    ]);
  });

  // Add total row
  categoryData.push(["", "", "", "", "", ""]);
  categoryData.push([
    "TOTAL",
    totalAmount.toFixed(2),
    expenses.length,
    (totalAmount / expenses.length).toFixed(2),
    "100.0%",
    "",
  ]);

  const sheet2 = XLSX.utils.aoa_to_sheet(categoryData);

  // Set column widths
  sheet2["!cols"] = [
    { wch: 20 }, // Category
    { wch: 15 }, // Total Spent
    { wch: 12 }, // # Expenses
    { wch: 15 }, // Avg per Expense
    { wch: 12 }, // % of Total
    { wch: 30 }, // Visual
  ];

  // Merge title
  if (!sheet2["!merges"]) sheet2["!merges"] = [];
  sheet2["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  XLSX.utils.book_append_sheet(workbook, sheet2, "By Category");

  // Sheet 4: By Products (detailed)
  const productMap = new Map();
  const productPrices = new Map(); // Track average price

  expenses.forEach((exp) => {
    exp.expense_products?.forEach((ep: any) => {
      const name = ep.product?.name || "Unknown";
      const current = productMap.get(name) || {
        quantity: 0,
        total: 0,
        purchases: 0,
      };
      const prices = productPrices.get(name) || [];

      productMap.set(name, {
        quantity: current.quantity + ep.quantity,
        total: current.total + ep.quantity * Number(ep.price_per_unit),
        purchases: current.purchases + 1,
      });

      prices.push(Number(ep.price_per_unit));
      productPrices.set(name, prices);
    });
  });

  // Sort products by total spent (highest first)
  const sortedProducts = Array.from(productMap.entries()).sort(
    (a, b) => b[1].total - a[1].total
  );

  const productData = [
    ["PRODUCTS PURCHASED"],
    [""],
    [
      "Product",
      "Qty",
      "Total Spent",
      "Avg Price",
      "Times Purchased",
      "% of Total",
    ],
  ];

  const totalProductSpending = Array.from(productMap.values()).reduce(
    (sum, p) => sum + p.total,
    0
  );

  sortedProducts.forEach(([name, data]) => {
    const prices = productPrices.get(name) || [0];
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const percentage = (data.total / totalProductSpending) * 100;

    productData.push([
      name,
      data.quantity,
      data.total.toFixed(2),
      avgPrice.toFixed(2),
      data.purchases,
      `${percentage.toFixed(1)}%`,
    ]);
  });

  // Add total row
  productData.push(["", "", "", "", "", ""]);
  productData.push([
    "TOTAL",
    Array.from(productMap.values()).reduce((sum, p) => sum + p.quantity, 0),
    totalProductSpending.toFixed(2),
    "",
    "",
    "100.0%",
  ]);

  const sheet3 = XLSX.utils.aoa_to_sheet(productData);

  // Set column widths
  sheet3["!cols"] = [
    { wch: 30 }, // Product
    { wch: 10 }, // Qty
    { wch: 15 }, // Total Spent
    { wch: 12 }, // Avg Price
    { wch: 15 }, // Times Purchased
    { wch: 12 }, // % of Total
  ];

  // Merge title
  if (!sheet3["!merges"]) sheet3["!merges"] = [];
  sheet3["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  XLSX.utils.book_append_sheet(workbook, sheet3, "By Products");

  // Sheet 5: Analytics & Insights
  const recurringCount = expenses.filter((e) => e.is_recurring).length;
  const oneTimeCount = expenses.length - recurringCount;

  // Calculate spending trends
  const expensesByWeek = new Map();
  expenses.forEach((exp) => {
    const date = new Date(exp.expense_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toLocaleDateString();
    expensesByWeek.set(
      weekKey,
      (expensesByWeek.get(weekKey) || 0) + Number(exp.amount)
    );
  });

  // Find highest and lowest expense
  const sortedByAmount = [...expenses].sort(
    (a, b) => Number(b.amount) - Number(a.amount)
  );
  const highestExpense = sortedByAmount[0];
  const lowestExpense = sortedByAmount[sortedByAmount.length - 1];

  // Most common category
  const mostCommonCategory = Array.from(categoryExpenseCount.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const highestSpendingCategory = sortedCategories[0];

  const analyticsData = [
    ["ANALYTICS & INSIGHTS"],
    [""],
    ["OVERVIEW"],
    ["Total Expenses", expenses.length],
    ["Total Amount", `$${totalAmount.toFixed(2)}`],
    ["Average per Expense", `$${(totalAmount / expenses.length).toFixed(2)}`],
    [""],
    ["EXPENSE TYPES"],
    [
      "Recurring Expenses",
      recurringCount,
      `${((recurringCount / expenses.length) * 100).toFixed(1)}%`,
    ],
    [
      "One-Time Expenses",
      oneTimeCount,
      `${((oneTimeCount / expenses.length) * 100).toFixed(1)}%`,
    ],
    [""],
    ["CATEGORIES"],
    ["Total Categories", categoryMap.size],
    [
      "Most Frequent Category",
      mostCommonCategory?.[0] || "N/A",
      `${mostCommonCategory?.[1] || 0} expenses`,
    ],
    [
      "Highest Spending Category",
      highestSpendingCategory?.[0] || "N/A",
      `$${highestSpendingCategory?.[1]?.toFixed(2) || "0.00"}`,
    ],
    [""],
    ["PRODUCTS"],
    ["Total Products", productMap.size],
    [
      "Total Items Purchased",
      Array.from(productMap.values()).reduce((sum, p) => sum + p.quantity, 0),
    ],
    [""],
    ["EXPENSE RANGE"],
    [
      "Highest Expense",
      `$${Number(highestExpense?.amount || 0).toFixed(2)}`,
      highestExpense?.category?.name || "",
    ],
    [
      "Lowest Expense",
      `$${Number(lowestExpense?.amount || 0).toFixed(2)}`,
      lowestExpense?.category?.name || "",
    ],
    [
      "Difference",
      `$${(
        Number(highestExpense?.amount || 0) - Number(lowestExpense?.amount || 0)
      ).toFixed(2)}`,
    ],
    [""],
    ["WEEKLY BREAKDOWN"],
    ["Week Starting", "Total Spent", "# Expenses"],
  ];

  // Add weekly data
  Array.from(expensesByWeek.entries()).forEach(([week, amount]) => {
    const weekExpenses = expenses.filter((e) => {
      const date = new Date(e.expense_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toLocaleDateString() === week;
    }).length;

    analyticsData.push([week, `$${amount.toFixed(2)}`, weekExpenses]);
  });

  const sheet4 = XLSX.utils.aoa_to_sheet(analyticsData);

  // Set column widths
  sheet4["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];

  // Merge title
  if (!sheet4["!merges"]) sheet4["!merges"] = [];
  sheet4["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

  XLSX.utils.book_append_sheet(workbook, sheet4, "Analytics & Insights");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
  return new Uint8Array(excelBuffer);
}

async function generatePDFReport(
  expenses: any[],
  monthYear: string
): Promise<Uint8Array> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Calculate category totals
  const categoryMap = new Map();
  expenses.forEach((exp) => {
    const cat = exp.category?.name || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount));
  });

  // Define colors for charts
  const chartColors = [
    [255, 99, 132], // Red
    [54, 162, 235], // Blue
    [255, 206, 86], // Yellow
    [75, 192, 192], // Teal
    [153, 102, 255], // Purple
    [255, 159, 64], // Orange
    [46, 204, 113], // Green
    [231, 76, 60], // Dark Red
    [52, 152, 219], // Light Blue
    [155, 89, 182], // Violet
  ];

  // Helper function to check if we need a new page
  const checkAddPage = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper function to draw a pie chart
  const drawPieChart = (x: number, y: number, radius: number) => {
    const categories = Array.from(categoryMap.entries());
    let startAngle = -Math.PI / 2; // Start at top

    categories.forEach(([cat, amount], idx) => {
      const percentage = amount / totalAmount;
      const angle = percentage * 2 * Math.PI;
      const color = chartColors[idx % chartColors.length];

      // Draw pie slice
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);

      // Calculate pie slice path
      const startX = x + radius * Math.cos(startAngle);
      const startY = y + radius * Math.sin(startAngle);
      const endAngle = startAngle + angle;
      const endX = x + radius * Math.cos(endAngle);
      const endY = y + radius * Math.sin(endAngle);

      // Draw the slice
      doc.circle(x, y, radius, "F");

      // Since jsPDF doesn't have built-in pie slice, we'll draw wedges using triangles
      const steps = Math.max(3, Math.ceil(angle * 20)); // More steps for smoother arcs
      doc.setFillColor(color[0], color[1], color[2]);

      for (let i = 0; i < steps; i++) {
        const a1 = startAngle + (angle * i) / steps;
        const a2 = startAngle + (angle * (i + 1)) / steps;
        const x1 = x + radius * Math.cos(a1);
        const y1 = y + radius * Math.sin(a1);
        const x2 = x + radius * Math.cos(a2);
        const y2 = y + radius * Math.sin(a2);

        doc.triangle(x, y, x1, y1, x2, y2, "F");
      }

      startAngle = endAngle;
    });

    // Draw white circle in center for donut effect
    doc.setFillColor(255, 255, 255);
    doc.circle(x, y, radius * 0.5, "F");
  };

  // Helper function to draw a horizontal bar
  const drawBar = (
    x: number,
    y: number,
    width: number,
    maxWidth: number,
    color: number[],
    label: string,
    value: string
  ) => {
    // Background bar
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, maxWidth, 8, "F");

    // Colored bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, width, 8, "F");

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, maxWidth, 8, "S");
  };

  // Title with colored header
  doc.setFillColor(79, 70, 229); // Indigo background
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SPENDWISE MONTHLY REPORT", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(monthYear, pageWidth / 2, 30, { align: "center" });

  yPos = 50;
  doc.setTextColor(0, 0, 0); // Reset to black

  // Summary Section with Cards
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  checkAddPage(50);
  doc.text("SUMMARY", margin, yPos);
  yPos += 10;

  // Calculate additional stats
  const recurringCount = expenses.filter((e) => e.is_recurring).length;
  const avgExpense = totalAmount / expenses.length;

  // Draw summary cards
  const cardWidth = (maxWidth - 10) / 2;
  const cardHeight = 25;

  // Card 1: Total Expenses
  doc.setFillColor(239, 246, 255); // Light blue
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Total Expenses", margin + 5, yPos + 8);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246); // Blue
  doc.text(expenses.length.toString(), margin + 5, yPos + 20);

  // Card 2: Total Amount
  doc.setFillColor(240, 253, 244); // Light green
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(
    margin + cardWidth + 10,
    yPos,
    cardWidth,
    cardHeight,
    3,
    3,
    "FD"
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Total Amount", margin + cardWidth + 15, yPos + 8);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Green
  doc.text(`$${totalAmount.toFixed(2)}`, margin + cardWidth + 15, yPos + 20);

  yPos += cardHeight + 8;

  // Card 3: Average per Expense
  doc.setFillColor(254, 243, 199); // Light yellow
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Average per Expense", margin + 5, yPos + 8);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 179, 8); // Yellow
  doc.text(`$${avgExpense.toFixed(2)}`, margin + 5, yPos + 20);

  // Card 4: Categories
  doc.setFillColor(243, 232, 255); // Light purple
  doc.setDrawColor(216, 180, 254);
  doc.roundedRect(
    margin + cardWidth + 10,
    yPos,
    cardWidth,
    cardHeight,
    3,
    3,
    "FD"
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Categories Used", margin + cardWidth + 15, yPos + 8);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(168, 85, 247); // Purple
  doc.text(categoryMap.size.toString(), margin + cardWidth + 15, yPos + 20);

  yPos += cardHeight + 15;
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFontSize(10);

  // Expenses by Category with Visual Chart
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  checkAddPage(100); // Need space for chart
  doc.text("EXPENSES BY CATEGORY", margin, yPos);
  yPos += 10;

  // Draw pie/donut chart
  const chartCenterX = pageWidth / 2;
  const chartCenterY = yPos + 35;
  const chartRadius = 30;

  drawPieChart(chartCenterX, chartCenterY, chartRadius);
  yPos += 75; // Space after chart

  // Category legend with bars
  doc.setFontSize(10);
  const categories = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1] - a[1]
  ); // Sort by amount
  const maxCategoryAmount = Math.max(...categories.map(([_, amt]) => amt));
  const barMaxWidth = maxWidth * 0.6; // 60% of page width for bars

  categories.forEach(([cat, amount], idx) => {
    checkAddPage(16);
    const percentage = ((amount / totalAmount) * 100).toFixed(1);
    const color = chartColors[idx % chartColors.length];

    // Color box indicator
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, yPos, 5, 5, "F");

    // Category name and amount
    doc.setFont("helvetica", "bold");
    doc.text(cat, margin + 8, yPos + 4);
    doc.setFont("helvetica", "normal");
    doc.text(`$${amount.toFixed(2)} (${percentage}%)`, margin + 8, yPos + 10);

    // Draw bar chart
    const barWidth = (amount / maxCategoryAmount) * barMaxWidth;
    drawBar(
      margin + 80,
      yPos + 1,
      barWidth,
      barMaxWidth,
      color,
      cat,
      `$${amount.toFixed(2)}`
    );

    yPos += 16;
  });
  yPos += 10;

  // Detailed Expenses
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  checkAddPage(30);
  doc.text("DETAILED EXPENSES", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  expenses.forEach((exp, idx) => {
    // Calculate required height for this expense entry
    let linesNeeded = 4; // Date, Category, Amount + box padding
    if (exp.description) linesNeeded += 2;
    if (exp.expense_products?.length > 0) linesNeeded += 2;
    const requiredHeight = linesNeeded * 6 + 10;

    checkAddPage(requiredHeight);

    const boxStartY = yPos;

    // Draw expense box/card
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);

    // Header with date and amount
    doc.setFillColor(249, 250, 251); // Light gray background
    doc.rect(margin, yPos, maxWidth, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      `${idx + 1}. ${new Date(exp.expense_date).toLocaleDateString()}`,
      margin + 3,
      yPos + 6
    );

    // Amount on the right
    doc.setTextColor(34, 197, 94); // Green for positive amounts
    const amountText = `$${Number(exp.amount).toFixed(2)}`;
    const amountWidth = doc.getTextWidth(amountText);
    doc.text(amountText, margin + maxWidth - amountWidth - 3, yPos + 6);
    doc.setTextColor(0, 0, 0); // Reset to black

    yPos += 10;

    // Category with color indicator
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Find category color from our chart colors
    const categoryIndex = Array.from(categoryMap.keys()).indexOf(
      exp.category?.name || "Uncategorized"
    );
    const categoryColor = chartColors[categoryIndex % chartColors.length];
    doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2]);
    doc.circle(margin + 4, yPos - 1, 1.5, "F");

    doc.text(`${exp.category?.name || "Uncategorized"}`, margin + 8, yPos);
    yPos += 6;

    if (exp.description) {
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(exp.description, maxWidth - 10);
      descLines.forEach((line: string) => {
        checkAddPage(6);
        doc.text(line, margin + 3, yPos);
        yPos += 5;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 2;
    }

    if (exp.expense_products?.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      const productsText = exp.expense_products
        .map(
          (ep: any) =>
            `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
        )
        .join(", ");
      const productLines = doc.splitTextToSize(
        `Items: ${productsText}`,
        maxWidth - 10
      );
      productLines.forEach((line: string) => {
        checkAddPage(5);
        doc.text(line, margin + 3, yPos);
        yPos += 5;
      });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos += 2;
    }

    // Draw border around the expense card
    const boxHeight = yPos - boxStartY + 2;
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, boxStartY, maxWidth, boxHeight, "S");

    yPos += 6; // Space between expense entries
  });

  // Total at the end with styled box
  checkAddPage(25);
  yPos += 5;

  // Draw a highlighted total box
  doc.setFillColor(79, 70, 229); // Indigo background
  doc.roundedRect(margin, yPos, maxWidth, 18, 3, 3, "F");

  doc.setTextColor(255, 255, 255); // White text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL AMOUNT:", margin + 5, yPos + 12);

  const totalText = `$${totalAmount.toFixed(2)}`;
  const totalWidth = doc.getTextWidth(totalText);
  doc.text(totalText, margin + maxWidth - totalWidth - 5, yPos + 12);

  doc.setTextColor(0, 0, 0); // Reset

  // Add page numbers to all pages
  const pageCount = doc.internal.pages.length - 1; // Subtract 1 for the internal page object
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);

    // Page number at bottom center
    const pageText = `Page ${i} of ${pageCount}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 10);

    // Footer text
    doc.setFontSize(7);
    doc.text("Generated by SpendWise", margin, pageHeight - 10);
    const dateText = new Date().toLocaleDateString();
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - margin - dateWidth, pageHeight - 10);
  }

  // Convert to Uint8Array
  const pdfArrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(pdfArrayBuffer);
}
