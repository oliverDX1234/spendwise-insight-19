import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    // Get last month's date range
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
    const monthYear = lastMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

    console.log(`Generating reports for ${monthYear}`)

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('user_id, email, full_name')

    if (usersError) throw usersError

    for (const user of users || []) {
      try {
        // Fetch user's expenses for last month
        const { data: expenses, error: expensesError } = await supabaseAdmin
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
          .eq('user_id', user.user_id)
          .gte('expense_date', startDate.toISOString().split('T')[0])
          .lte('expense_date', endDate.toISOString().split('T')[0])
          .order('expense_date', { ascending: false })

        if (expensesError) throw expensesError

        if (!expenses || expenses.length === 0) {
          console.log(`No expenses for user ${user.email} in ${monthYear}`)
          continue
        }

        // Generate Excel file
        const excelBuffer = await generateExcelReport(expenses, monthYear)

        // Get next report number
        const { data: lastReport } = await supabaseAdmin
          .from('reports')
          .select('report_number')
          .eq('user_id', user.user_id)
          .order('report_number', { ascending: false })
          .limit(1)
          .single()

        const reportNumber = (lastReport?.report_number || 0) + 1

        // Upload to storage
        const fileName = `${user.user_id}/report_${reportNumber}_${monthYear.replace(' ', '_')}.xlsx`
        const { error: uploadError } = await supabaseAdmin.storage
          .from('reports')
          .upload(fileName, excelBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Create report record
        const { error: insertError } = await supabaseAdmin
          .from('reports')
          .insert({
            user_id: user.user_id,
            report_number: reportNumber,
            month_year: monthYear,
            excel_url: fileName,
          })

        if (insertError) throw insertError

        // Send email with report
        await resend.emails.send({
          from: 'SpendWise <onboarding@resend.dev>',
          to: [user.email],
          subject: `Your Monthly Expense Report - ${monthYear}`,
          html: `
            <h1>Monthly Expense Report</h1>
            <p>Hello ${user.full_name},</p>
            <p>Your expense report for ${monthYear} is ready!</p>
            <p>You can download it from your SpendWise Reports section.</p>
            <p>Total expenses: ${expenses.length}</p>
            <p>Total amount: $${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}</p>
            <br/>
            <p>Best regards,<br/>SpendWise Team</p>
          `,
        })

        console.log(`Report generated for ${user.email}`)
      } catch (error) {
        console.error(`Error generating report for user ${user.email}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Reports generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-monthly-reports:', error)
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
