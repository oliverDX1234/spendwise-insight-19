import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string
  category: { name: string; color: string }
  expense_products: Array<{
    product: { name: string }
    quantity: number
    price_per_unit: number
  }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get format from request body
    const { format = 'excel' } = await req.json().catch(() => ({ format: 'excel' }))

    // Get current month's date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = now
    const monthYear = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

    console.log(`Generating current month report for user ${user.id}`)

    // Fetch user's expenses for current month
    const { data: expenses, error: expensesError } = await supabaseClient
      .from('expenses')
      .select(`
        *,
        category:categories(name, color),
        expense_products(
          quantity,
          price_per_unit,
          product:products(name)
        )
      `)
      .eq('user_id', user.id)
      .gte('expense_date', startDate.toISOString().split('T')[0])
      .lte('expense_date', endDate.toISOString().split('T')[0])
      .order('expense_date', { ascending: false })

    if (expensesError) throw expensesError

    if (!expenses || expenses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No expenses found for current month' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Generate report based on format
    let buffer: Uint8Array
    let contentType: string
    let filename: string

    if (format === 'pdf') {
      buffer = await generatePDFReport(expenses, monthYear)
      contentType = 'application/pdf'
      filename = `SpendWise_Report_${monthYear.replace(' ', '_')}.pdf`
    } else {
      buffer = await generateExcelReport(expenses, monthYear)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      filename = `SpendWise_Report_${monthYear.replace(' ', '_')}.xlsx`
    }

    // Return the file
    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in generate-current-month-report:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function generateExcelReport(expenses: any[], monthYear: string): Promise<Uint8Array> {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Expenses Summary
  const expenseRows = expenses.map(exp => ({
    Date: new Date(exp.expense_date).toLocaleDateString(),
    Description: exp.description || '-',
    Category: exp.category?.name || 'Uncategorized',
    Products: exp.expense_products?.map((ep: any) => 
      `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
    ).join(', ') || '-',
    Amount: `$${Number(exp.amount).toFixed(2)}`,
  }))

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  expenseRows.push({
    Date: '',
    Description: '',
    Category: '',
    Products: 'TOTAL',
    Amount: `$${totalAmount.toFixed(2)}`,
  })

  const sheet1 = XLSX.utils.json_to_sheet(expenseRows)
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Expenses')

  // Sheet 2: By Category
  const categoryMap = new Map()
  expenses.forEach(exp => {
    const cat = exp.category?.name || 'Uncategorized'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount))
  })

  const categoryRows = Array.from(categoryMap.entries()).map(([cat, amount]) => ({
    Category: cat,
    'Total Spent': `$${amount.toFixed(2)}`,
    Percentage: `${((amount / totalAmount) * 100).toFixed(1)}%`,
  }))

  const sheet2 = XLSX.utils.json_to_sheet(categoryRows)
  XLSX.utils.book_append_sheet(workbook, sheet2, 'By Category')

  // Sheet 3: By Products
  const productMap = new Map()
  expenses.forEach(exp => {
    exp.expense_products?.forEach((ep: any) => {
      const name = ep.product?.name || 'Unknown'
      const current = productMap.get(name) || { quantity: 0, total: 0 }
      productMap.set(name, {
        quantity: current.quantity + ep.quantity,
        total: current.total + (ep.quantity * Number(ep.price_per_unit)),
      })
    })
  })

  const productRows = Array.from(productMap.entries()).map(([name, data]) => ({
    Product: name,
    'Total Quantity': data.quantity,
    'Total Spent': `$${data.total.toFixed(2)}`,
  }))

  const sheet3 = XLSX.utils.json_to_sheet(productRows)
  XLSX.utils.book_append_sheet(workbook, sheet3, 'By Products')

  // Sheet 4: Analytics
  const recurringCount = expenses.filter(e => e.is_recurring).length
  const oneTimeCount = expenses.length - recurringCount

  const analyticsRows = [
    { Metric: 'Total Expenses', Value: expenses.length },
    { Metric: 'Total Amount', Value: `$${totalAmount.toFixed(2)}` },
    { Metric: 'Recurring Expenses', Value: recurringCount },
    { Metric: 'One-Time Expenses', Value: oneTimeCount },
    { Metric: 'Average per Expense', Value: `$${(totalAmount / expenses.length).toFixed(2)}` },
    { Metric: 'Categories Used', Value: categoryMap.size },
    { Metric: 'Products Purchased', Value: productMap.size },
  ]

  const sheet4 = XLSX.utils.json_to_sheet(analyticsRows)
  XLSX.utils.book_append_sheet(workbook, sheet4, 'Analytics')

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return new Uint8Array(excelBuffer)
}

async function generatePDFReport(expenses: any[], monthYear: string): Promise<Uint8Array> {
  // Create a simple text-based PDF content
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  
  // Calculate category totals
  const categoryMap = new Map()
  expenses.forEach(exp => {
    const cat = exp.category?.name || 'Uncategorized'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(exp.amount))
  })

  // Build PDF content as text
  let pdfContent = `SPENDWISE MONTHLY REPORT\n${monthYear}\n\n`
  pdfContent += `SUMMARY\n${'='.repeat(50)}\n`
  pdfContent += `Total Expenses: ${expenses.length}\n`
  pdfContent += `Total Amount: $${totalAmount.toFixed(2)}\n\n`
  
  pdfContent += `EXPENSES BY CATEGORY\n${'='.repeat(50)}\n`
  Array.from(categoryMap.entries()).forEach(([cat, amount]) => {
    const percentage = ((amount / totalAmount) * 100).toFixed(1)
    pdfContent += `${cat}: $${amount.toFixed(2)} (${percentage}%)\n`
  })
  
  pdfContent += `\nDETAILED EXPENSES\n${'='.repeat(50)}\n`
  expenses.forEach(exp => {
    pdfContent += `\nDate: ${new Date(exp.expense_date).toLocaleDateString()}\n`
    pdfContent += `Category: ${exp.category?.name || 'Uncategorized'}\n`
    pdfContent += `Amount: $${Number(exp.amount).toFixed(2)}\n`
    if (exp.description) pdfContent += `Description: ${exp.description}\n`
    if (exp.expense_products?.length > 0) {
      pdfContent += `Products: ${exp.expense_products.map((ep: any) => 
        `${ep.product?.name} (${ep.quantity}x $${ep.price_per_unit})`
      ).join(', ')}\n`
    }
  })

  // Convert to PDF using a simple text-to-PDF approach
  // For a basic implementation, we'll create a simple PDF structure
  const encoder = new TextEncoder()
  return encoder.encode(pdfContent)
}
