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
    let emailsSent = 0;

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

          // Get user details for email
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

          // Send email notification
          try {
            console.log(`Sending email notification to ${user.email}...`);
            
            const emailResponse = await resend.emails.send({
              from: 'Expense Tracker <onboarding@resend.dev>',
              to: [user.email],
              subject: '🚨 Spending Limit Exceeded!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                  <div style="border-left: 4px solid #ef4444; padding-left: 20px; margin-bottom: 20px;">
                    <h1 style="color: #ef4444; margin-bottom: 10px; font-size: 24px;">🚨 Spending Limit Exceeded!</h1>
                  </div>
                  
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    Hi ${user.full_name || 'there'},
                  </p>
                  
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    Your spending limit "<strong>${limit.name}</strong>" for the <strong>${categoryName}</strong> category has been exceeded.
                  </p>
                  
                  <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #dc2626; font-size: 18px;">Limit Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-weight: 600;">Limit Amount:</td>
                        <td style="padding: 8px 0; color: #374151; text-align: right;">$${limitAmount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-weight: 600;">Amount Spent:</td>
                        <td style="padding: 8px 0; color: #dc2626; text-align: right; font-weight: 600;">$${totalSpent.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-weight: 600;">Exceeded by:</td>
                        <td style="padding: 8px 0; color: #dc2626; text-align: right; font-weight: 600;">${percentage.toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-weight: 600;">Period:</td>
                        <td style="padding: 8px 0; color: #374151; text-align: right;">${limit.period_type.charAt(0).toUpperCase() + limit.period_type.slice(1)}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    Consider reviewing your spending in this category to stay within your budget for the remainder of this ${limit.period_type} period.
                  </p>
                  
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                      Best regards,<br>
                      Your Expense Tracker Team
                    </p>
                  </div>
                </div>
              `,
            });

            console.log(`✅ Email sent successfully to ${user.email}:`, emailResponse);
            emailsSent++;
          } catch (emailError) {
            console.error(`❌ Failed to send email to ${user.email}:`, emailError);
          }
        }
      } catch (error) {
        console.error('Error processing limit:', limit.id, error);
      }
    }

    const response = {
      message: 'Limit check completed',
      limitsProcessed: limits.length,
      limitExceeded,
      notifications,
      emailsSent
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