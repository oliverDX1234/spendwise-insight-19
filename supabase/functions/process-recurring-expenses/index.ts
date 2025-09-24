import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from '../../../src/integrations/supabase/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Get all recurring expenses that are due today
    const { data: recurringExpenses, error: expensesError } = await supabaseClient
      .from('expenses')
      .select(`
        *,
        expense_products (
          id,
          product_id,
          quantity,
          price_per_unit,
          products (
            id,
            name,
            category_id
          )
        )
      `)
      .eq('is_recurring', true)
      .lte('next_occurrence', todayStr)

    if (expensesError) {
      console.error('Error fetching recurring expenses:', expensesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recurring expenses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!recurringExpenses || recurringExpenses.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recurring expenses due today', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0

    for (const expense of recurringExpenses) {
      try {
        // Calculate next occurrence date
        const nextOccurrence = calculateNextOccurrence(expense.next_occurrence || expense.expense_date, expense.recurring_interval)

        // Create new expense
        const { data: newExpense, error: insertError } = await supabaseClient
          .from('expenses')
          .insert({
            user_id: expense.user_id,
            category_id: expense.category_id,
            amount: expense.amount,
            expense_date: todayStr,
            description: expense.description,
            is_recurring: false, // New instances are not recurring themselves
            recurring_interval: null,
            next_occurrence: null
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating new expense:', insertError)
          continue
        }

        // Copy expense products if they exist
        if (expense.expense_products && expense.expense_products.length > 0) {
          for (const expenseProduct of expense.expense_products) {
            let productId = expenseProduct.product_id

            // If the product doesn't exist, create it
            if (!productId && expenseProduct.products) {
              const { data: newProduct, error: productError } = await supabaseClient
                .from('products')
                .insert({
                  user_id: expense.user_id,
                  name: expenseProduct.products.name,
                  category_id: expenseProduct.products.category_id,
                  default_price: expenseProduct.price_per_unit
                })
                .select()
                .single()

              if (productError) {
                console.error('Error creating product:', productError)
                continue
              }
              productId = newProduct.id
            }

            if (productId) {
              const { error: expenseProductError } = await supabaseClient
                .from('expense_products')
                .insert({
                  expense_id: newExpense.id,
                  product_id: productId,
                  quantity: expenseProduct.quantity,
                  price_per_unit: expenseProduct.price_per_unit
                })

              if (expenseProductError) {
                console.error('Error creating expense product:', expenseProductError)
              }
            }
          }
        }

        // Update the original recurring expense with next occurrence
        const { error: updateError } = await supabaseClient
          .from('expenses')
          .update({ next_occurrence: nextOccurrence })
          .eq('id', expense.id)

        if (updateError) {
          console.error('Error updating recurring expense:', updateError)
        } else {
          processedCount++
        }

      } catch (error) {
        console.error('Error processing expense:', expense.id, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} recurring expenses`,
        processed: processedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextOccurrence(currentDate: string, interval: string | null): string {
  const date = new Date(currentDate)
  
  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      // Default to monthly if interval is not recognized
      date.setMonth(date.getMonth() + 1)
  }
  
  return date.toISOString().split('T')[0]
}