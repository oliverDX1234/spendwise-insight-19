import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { useExpensesAnalytics, useCategoriesAnalytics, useProductsAnalytics } from "@/hooks/useAnalytics";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

export default function Analytics() {
  const { isTrial } = useSubscription();
  const { data: expensesData, isLoading: expensesLoading } = useExpensesAnalytics();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoriesAnalytics();
  const { data: productsData, isLoading: productsLoading } = useProductsAnalytics();

  if (isTrial) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Analytics</h1>
          <div className="bg-muted/50 rounded-lg p-12">
            <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade your plan to access detailed analytics and insights about your expenses.
            </p>
            <Button>Upgrade Plan</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Get insights into your spending patterns and financial habits.
        </p>
      </div>

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${expensesData?.totalAmount?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expensesData?.totalExpenses || 0} transactions this month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Daily Expenses Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Expenses This Month
                </CardTitle>
                <CardDescription>
                  Track your spending patterns throughout the month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <LineChart data={expensesData?.dailyExpenses || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Recurring vs One-time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Recurring vs One-time
                </CardTitle>
                <CardDescription>
                  Breakdown of recurring and one-time expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    recurring: {
                      label: "Recurring",
                      color: "#8B5CF6",
                    },
                    oneTime: {
                      label: "One-time",
                      color: "#06B6D4",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={expensesData?.recurringVsOneTime || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expensesData?.recurringVsOneTime?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={expensesData.recurringVsOneTime[index].fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
                <CardDescription>
                  See which categories you spend the most on
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={expensesData?.expensesByCategory || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Top 10 Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Expenses</CardTitle>
                <CardDescription>
                  Your highest individual expenses this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expensesData?.topExpenses?.slice(0, 10).map((expense, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium truncate">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">{expense.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${expense.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoriesData?.totalCategories || 0}</div>
                <p className="text-xs text-muted-foreground">Active categories</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Most Used Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Categories</CardTitle>
                <CardDescription>Categories with the most transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Transactions",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={categoriesData?.mostUsedCategories || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Highest Spending Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Highest Spending Categories</CardTitle>
                <CardDescription>Categories with the highest total amount</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoriesData?.highestSpendingCategories || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoriesData?.highestSpendingCategories?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Usage Trends */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly vs All-Time Spending</CardTitle>
                <CardDescription>Compare this month's spending with all-time totals by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    monthly: {
                      label: "This Month",
                      color: "#8B5CF6",
                    },
                    allTime: {
                      label: "All Time",
                      color: "#06B6D4",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={categoriesData?.monthlyVsAllTime?.slice(0, 8) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="monthly" fill="#8B5CF6" />
                      <Bar dataKey="allTime" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productsData?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">Tracked products</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Most Purchased Products */}
            <Card>
              <CardHeader>
                <CardTitle>Most Purchased Products</CardTitle>
                <CardDescription>Products with highest total quantity</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    quantity: {
                      label: "Quantity",
                      color: "#8B5CF6",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={productsData?.mostPurchasedProducts || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantity" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Highest Spending Products */}
            <Card>
              <CardHeader>
                <CardTitle>Highest Spending Products</CardTitle>
                <CardDescription>Products with highest total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "#06B6D4",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={productsData?.highestSpendingProducts || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {productsData?.highestSpendingProducts?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill="#06B6D4" />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Product Usage Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>Product Usage Frequency</CardTitle>
                <CardDescription>How often products are used in expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Usage Count",
                      color: "#10B981",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={productsData?.usageFrequency || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Monthly vs All-Time Purchases */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly vs All-Time Purchases</CardTitle>
                <CardDescription>Compare current month with total purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    monthly: {
                      label: "This Month",
                      color: "#8B5CF6",
                    },
                    allTime: {
                      label: "All Time",
                      color: "#06B6D4",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer>
                    <BarChart data={productsData?.monthlyVsAllTime || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="monthly" fill="#8B5CF6" />
                      <Bar dataKey="allTime" fill="#06B6D4" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}