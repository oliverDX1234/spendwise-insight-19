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

    // Create 20 unique categories (not duplicating predefined ones)
    const categoryData = [
      { name: 'Streaming Services', color: '#EF4444' },
      { name: 'Car Maintenance', color: '#F59E0B' },
      { name: 'Home Decor', color: '#10B981' },
      { name: 'Coffee & Tea', color: '#3B82F6' },
      { name: 'Gaming', color: '#8B5CF6' },
      { name: 'Photography', color: '#EC4899' },
      { name: 'Garden & Plants', color: '#14B8A6' },
      { name: 'Office Supplies', color: '#F97316' },
      { name: 'Mobile & Internet', color: '#06B6D4' },
      { name: 'Concert Tickets', color: '#84CC16' },
      { name: 'Online Courses', color: '#6366F1' },
      { name: 'Gym & Yoga', color: '#A855F7' },
      { name: 'Pet Supplies', color: '#D946EF' },
      { name: 'Hair Salon', color: '#F43F5E' },
      { name: 'Car Insurance', color: '#0EA5E9' },
      { name: 'Vitamins & Supplements', color: '#22C55E' },
      { name: 'Laundry & Cleaning', color: '#EAB308' },
      { name: 'Music & Audio', color: '#6B7280' },
      { name: 'Fast Food', color: '#DC2626' },
      { name: 'Home Security', color: '#059669' }
    ];

    console.log('Creating categories...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .insert(
        categoryData.map(cat => ({
          user_id: user.id,
          name: cat.name,
          color: cat.color,
          is_predefined: false
        }))
      )
      .select();

    if (catError) throw catError;
    console.log('Created', categories.length, 'categories');

    // Create realistic products for each category
    const categoryProducts: Record<string, string[]> = {
      'Streaming Services': ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'YouTube Premium'],
      'Car Maintenance': ['Oil Change', 'Tire Rotation', 'Brake Pads', 'Car Wash', 'Air Filter'],
      'Home Decor': ['Wall Art', 'Throw Pillows', 'Curtains', 'Area Rug', 'Table Lamp'],
      'Coffee & Tea': ['Espresso', 'Latte', 'Green Tea', 'Coffee Beans', 'Tea Bags'],
      'Gaming': ['Game Pass', 'PlayStation Plus', 'Steam Games', 'Gaming Mouse', 'Headset'],
      'Photography': ['Camera Lens', 'Memory Card', 'Tripod', 'Photo Editing Software', 'Camera Bag'],
      'Garden & Plants': ['Potting Soil', 'Seeds', 'Flower Pots', 'Fertilizer', 'Garden Tools'],
      'Office Supplies': ['Printer Paper', 'Pens', 'Notebooks', 'Stapler', 'Desk Organizer'],
      'Mobile & Internet': ['Phone Plan', 'Internet Service', 'Phone Case', 'Screen Protector', 'Charging Cable'],
      'Concert Tickets': ['Rock Concert', 'Jazz Festival', 'Pop Show', 'Classical Music', 'Comedy Show'],
      'Online Courses': ['Programming Course', 'Language Learning', 'Design Course', 'Business Course', 'Cooking Class'],
      'Gym & Yoga': ['Gym Membership', 'Yoga Mat', 'Workout Clothes', 'Protein Powder', 'Water Bottle'],
      'Pet Supplies': ['Pet Food', 'Dog Treats', 'Cat Litter', 'Pet Toys', 'Grooming Service'],
      'Hair Salon': ['Haircut', 'Hair Coloring', 'Hair Treatment', 'Styling Products', 'Shampoo'],
      'Car Insurance': ['Monthly Premium', 'Comprehensive Coverage', 'Collision Coverage', 'Liability Insurance', 'Roadside Assistance'],
      'Vitamins & Supplements': ['Multivitamin', 'Vitamin D', 'Omega-3', 'Protein Powder', 'Probiotics'],
      'Laundry & Cleaning': ['Detergent', 'Fabric Softener', 'Bleach', 'All-Purpose Cleaner', 'Sponges'],
      'Music & Audio': ['Headphones', 'Bluetooth Speaker', 'Vinyl Records', 'Guitar Strings', 'Microphone'],
      'Fast Food': ['Burger Meal', 'Pizza', 'Sandwich', 'Fried Chicken', 'Burrito'],
      'Home Security': ['Security Camera', 'Smart Lock', 'Alarm System', 'Motion Sensor', 'Video Doorbell']
    };


    const productsData = [];
    for (const category of categories) {
      const productList = categoryProducts[category.name] || ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
      for (let i = 0; i < productList.length; i++) {
        productsData.push({
          user_id: user.id,
          category_id: category.id,
          name: productList[i],
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
