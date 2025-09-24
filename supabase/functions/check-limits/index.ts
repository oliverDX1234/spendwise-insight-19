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
    console.log('=== CHECK-LIMITS FUNCTION CALLED ===');
    
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
      return new Response(JSON.stringify({ 
        message: 'No active limits found',
        limitExceeded: false,
        notifications: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${limits.length} active limits`);
    let limitExceeded = false;
    const notifications = [];

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
          console.log(`🚨 LIMIT EXCEEDED for ${limit.name}!`);
          limitExceeded = true;

          // Get category name
          const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('name')
            .eq('id', limit.category_id)
            .single();

          const categoryName = category?.name || 'Unknown Category';
          
          // Create notification object to return to frontend
          const notification = {
            limitName: limit.name,
            categoryName,
            limitAmount,
            totalSpent,
            percentage: percentage.toFixed(1),
            periodType: limit.period_type
          };
          
          notifications.push(notification);
          
          console.log(`Notification created:`, notification);
        }
      } catch (error) {
        console.error('Error processing limit:', limit.id, error);
      }
    }

    const response = {
      message: 'Limit check completed',
      limitsProcessed: limits.length,
      limitExceeded,
      notifications
    };

    console.log('Final response:', response);

    return new Response(JSON.stringify(response), {
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