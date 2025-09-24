import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const resend = new Resend(resendApiKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CHECK-LIMITS FUNCTION CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { user_id, category_id } = requestBody;
    
    if (!user_id || !category_id) {
      return new Response(JSON.stringify({ error: 'user_id and category_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Checking spending limits for user ${user_id} in category ${category_id}...`);

    // Get active limits for this user and category
    const { data: limits, error: limitsError } = await supabase
      .from('limits')
      .select('*')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (limitsError) {
      console.error('Error fetching limits:', limitsError);
      throw limitsError;
    }

    if (!limits || limits.length === 0) {
      console.log('No active limits found for this category');
      return new Response(JSON.stringify({ message: 'No active limits found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${limits.length} active limits`);

    for (const limit of limits) {
      try {
        // Get expenses for this category within the limit period
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', limit.user_id)
          .eq('category_id', limit.category_id)
          .gte('expense_date', limit.start_date)
          .lte('expense_date', limit.end_date);

        if (expensesError) {
          console.error('Error fetching expenses for limit:', limit.id, expensesError);
          continue;
        }

        const totalSpent = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
        const limitAmount = Number(limit.amount);
        const percentage = (totalSpent / limitAmount) * 100;

        console.log(`Limit ${limit.name}: $${totalSpent}/$${limitAmount} (${percentage.toFixed(1)}%)`);

        // Check if limit is reached (100% or more)
        if (percentage >= 100) {
          console.log(`Limit reached for ${limit.name}!`);

          // Get user details for notification
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('user_id', limit.user_id)
            .single();

          if (userError || !user) {
            console.error('Error fetching user for limit:', limit.id, userError);
            continue;
          }

          // Get category name
          const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('name')
            .eq('id', limit.category_id)
            .single();

          const categoryName = category?.name || 'Unknown Category';

          // Send email notification
          try {
            const emailResponse = await resend.emails.send({
              from: 'ExpenseTracker <notifications@resend.dev>',
              to: [user.email],
              subject: '🚨 Spending Limit Reached!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #ef4444;">Spending Limit Reached</h2>
                  <p>Hi ${user.full_name || 'there'},</p>
                  <p>Your spending limit "<strong>${limit.name}</strong>" for the <strong>${categoryName}</strong> category has been reached.</p>
                  <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>Limit:</strong> $${limitAmount.toFixed(2)}</p>
                    <p style="margin: 0;"><strong>Spent:</strong> $${totalSpent.toFixed(2)} (${percentage.toFixed(1)}%)</p>
                    <p style="margin: 0;"><strong>Period:</strong> ${limit.period_type.charAt(0).toUpperCase() + limit.period_type.slice(1)}</p>
                  </div>
                  <p>Consider reviewing your spending in this category to stay within your budget.</p>
                  <p>Best regards,<br>Your Expense Tracker</p>
                </div>
              `,
            });

            console.log(`Email sent successfully to ${user.email}:`, emailResponse);
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
      } catch (error) {
        console.error('Error processing limit:', limit.id, error);
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Limit check completed',
      limitsProcessed: limits.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in check-limits function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);