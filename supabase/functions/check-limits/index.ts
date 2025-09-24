import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking spending limits...');

    // Get all active limits
    const { data: limits, error: limitsError } = await supabase
      .from('limits')
      .select('*')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (limitsError) {
      console.error('Error fetching limits:', limitsError);
      throw limitsError;
    }

    if (!limits || limits.length === 0) {
      console.log('No active limits found');
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

          // TODO: Send email notification here
          // You can implement email sending using Resend or another service
          console.log(`Would send email to ${user.email} about limit reached for ${categoryName}`);
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