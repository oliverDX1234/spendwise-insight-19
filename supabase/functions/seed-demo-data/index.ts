import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const targetEmail = 'kocovskioliver1234+premium@gmail.com';
    
    console.log('Finding user:', targetEmail);
    
    // Find user by email
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    const user = authUser.users.find(u => u.email === targetEmail);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', user.id);

    // Create 20 categories
    const categoryNames = [
      'Groceries', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare',
      'Dining Out', 'Clothing', 'Electronics', 'Home Improvement', 'Travel',
      'Education', 'Fitness', 'Insurance', 'Gifts', 'Pet Care',
      'Books', 'Subscriptions', 'Beauty', 'Sports', 'Hobbies'
    ];

    const colors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
      '#6366F1', '#A855F7', '#D946EF', '#F43F5E', '#0EA5E9',
      '#22C55E', '#EAB308', '#6B7280', '#DC2626', '#059669'
    ];

    console.log('Creating categories...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .insert(
        categoryNames.map((name, index) => ({
          user_id: user.id,
          name,
          color: colors[index],
          is_predefined: false
        }))
      )
      .select();

    if (catError) throw catError;
    console.log('Created', categories.length, 'categories');

    // Create products for each category
    const productTemplates = [
      'Item A', 'Item B', 'Item C', 'Product X', 'Product Y',
      'Service A', 'Service B', 'Package A', 'Bundle A', 'Special Item'
    ];

    const productsData = [];
    for (const category of categories) {
      for (let i = 0; i < 5; i++) {
        productsData.push({
          user_id: user.id,
          category_id: category.id,
          name: `${category.name} - ${productTemplates[i % productTemplates.length]}`,
          default_price: Math.floor(Math.random() * 100) + 10
        });
      }
    }

    console.log('Creating products...');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .insert(productsData)
      .select();

    if (prodError) throw prodError;
    console.log('Created', products.length, 'products');

    // Create 500 expenses over last 3 months
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    console.log('Creating expenses...');
    const expensesData = [];
    
    for (let i = 0; i < 500; i++) {
      const randomDate = new Date(
        threeMonthsAgo.getTime() + 
        Math.random() * (now.getTime() - threeMonthsAgo.getTime())
      );

      const category = categories[Math.floor(Math.random() * categories.length)];
      const isRecurring = Math.random() < 0.1; // 10% recurring
      
      expensesData.push({
        user_id: user.id,
        category_id: category.id,
        expense_date: randomDate.toISOString().split('T')[0],
        description: `Expense ${i + 1} - ${category.name}`,
        amount: 0, // Will be calculated from products
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? ['weekly', 'monthly', 'yearly'][Math.floor(Math.random() * 3)] : null
      });
    }

    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .insert(expensesData)
      .select();

    if (expError) throw expError;
    console.log('Created', expenses.length, 'expenses');

    // Add products to each expense
    console.log('Adding products to expenses...');
    const expenseProductsData = [];
    
    for (const expense of expenses) {
      const categoryProducts = products.filter(p => p.category_id === expense.category_id);
      const numProducts = Math.floor(Math.random() * 3) + 1; // 1-3 products
      
      let totalAmount = 0;
      for (let i = 0; i < numProducts && categoryProducts.length > 0; i++) {
        const product = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.default_price || (Math.floor(Math.random() * 100) + 10);
        
        totalAmount += price * quantity;
        
        expenseProductsData.push({
          expense_id: expense.id,
          product_id: product.id,
          quantity,
          price_per_unit: price
        });
      }

      // Update expense amount
      await supabase
        .from('expenses')
        .update({ amount: totalAmount })
        .eq('id', expense.id);
    }

    const { error: expProdError } = await supabase
      .from('expense_products')
      .insert(expenseProductsData);

    if (expProdError) throw expProdError;
    console.log('Added products to expenses');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo data seeded successfully',
        stats: {
          categories: categories.length,
          products: products.length,
          expenses: expenses.length,
          expenseProducts: expenseProductsData.length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
