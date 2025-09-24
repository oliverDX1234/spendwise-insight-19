import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  useExpensesAnalytics,
  useCategoriesAnalytics,
  useProductsAnalytics,
} from "@/hooks/useAnalytics";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";

export default function Analytics() {
  const { isTrial } = useSubscription();
  const { data: expensesData, isLoading: expensesLoading } =
    useExpensesAnalytics();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategoriesAnalytics();
  const { data: productsData, isLoading: productsLoading } =
    useProductsAnalytics();

  // Color array for product pie chart (50 colors)
  const productColors = [
    "#06B6D4", // cyan-500
    "#8B5CF6", // violet-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#10B981", // emerald-500
    "#F97316", // orange-500
    "#3B82F6", // blue-500
    "#EC4899", // pink-500
    "#84CC16", // lime-500
    "#6366F1", // indigo-500
    "#14B8A6", // teal-500
    "#F43F5E", // rose-500
    "#8B5A2B", // brown-600
    "#7C3AED", // purple-600
    "#059669", // emerald-600
    "#DC2626", // red-600
    "#2563EB", // blue-600
    "#CA8A04", // yellow-600
    "#16A34A", // green-600
    "#DB2777", // pink-600
    "#0891B2", // cyan-600
    "#9333EA", // violet-600
    "#EA580C", // orange-600
    "#4F46E5", // indigo-600
    "#0D9488", // teal-600
    "#E11D48", // rose-600
    "#65A30D", // lime-600
    "#7C2D12", // orange-900
    "#581C87", // purple-900
    "#064E3B", // emerald-900
    "#7F1D1D", // red-900
    "#1E3A8A", // blue-900
    "#78350F", // amber-900
    "#14532D", // green-900
    "#831843", // pink-900
    "#164E63", // cyan-900
    "#4C1D95", // violet-900
    "#9A3412", // orange-900
    "#312E81", // indigo-900
    "#134E4A", // teal-900
    "#881337", // rose-900
    "#365314", // lime-900
    "#92400E", // amber-700
    "#6D28D9", // violet-700
    "#047857", // emerald-700
    "#B91C1C", // red-700
    "#1D4ED8", // blue-700
    "#A16207", // yellow-700
    "#15803D", // green-700
    "#BE185D", // pink-700
  ];

  if (isTrial) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Analytics</h1>
          <div className="bg-muted/50 rounded-lg p-12">
            <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade your plan to access detailed analytics and insights about
              your expenses.
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
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${expensesData?.totalAmount?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expensesData?.totalExpenses || 0} transactions this month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 w-full grid-cols-1 lg:grid-cols-2">
            {/* Daily Expenses Line Chart */}
            <Card className="w-full">
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
                  className="h-[300px] w-full"
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
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={expensesData?.recurringVsOneTime || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: $${value.toFixed(2)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expensesData?.recurringVsOneTime?.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={expensesData.recurringVsOneTime[index].fill}
                          />
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
                  className="h-[300px] w-full"
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
                  {expensesData?.topExpenses
                    ?.slice(0, 10)
                    .map((expense, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium truncate">
                            {expense.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${expense.amount.toFixed(2)}
                          </p>
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
                <CardTitle className="text-sm font-medium">
                  Total Categories
                </CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categoriesData?.totalCategories || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active categories
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Most Used Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Categories</CardTitle>
                <CardDescription>
                  Categories with the most transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Transactions",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px] w-full"
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
                <CardDescription>
                  Categories with the highest total amount
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
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoriesData?.highestSpendingCategories || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: $${value.toFixed(2)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoriesData?.highestSpendingCategories?.map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          )
                        )}
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
                <CardDescription>
                  Compare this month's spending with all-time totals by category
                </CardDescription>
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
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <BarChart
                      data={categoriesData?.monthlyVsAllTime?.slice(0, 8) || []}
                    >
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
                <CardTitle className="text-sm font-medium">
                  Total Products
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productsData?.totalProducts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tracked products
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Most Purchased Products */}
            <Card>
              <CardHeader>
                <CardTitle>Most Purchased Products</CardTitle>
                <CardDescription>
                  Products with highest total quantity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    quantity: {
                      label: "Quantity",
                      color: "#8B5CF6",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <BarChart data={productsData?.mostPurchasedProducts || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantity">
                        {productsData?.mostPurchasedProducts?.map(
                          (_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={productColors[index % productColors.length]}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Highest Spending Products */}
            <Card>
              <CardHeader>
                <CardTitle>Highest Spending Products</CardTitle>
                <CardDescription>
                  Products with highest total spending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "#06B6D4",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={productsData?.highestSpendingProducts || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) =>
                          `${name}: $${value.toFixed(2)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {productsData?.highestSpendingProducts?.map(
                          (_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={productColors[index % productColors.length]}
                            />
                          )
                        )}
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
                <CardDescription>
                  How often products are used in expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "Usage Count",
                      color: "#10B981",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer>
                    <BarChart data={productsData?.usageFrequency || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count">
                        {productsData?.usageFrequency?.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={productColors[index % productColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Monthly vs All-Time Purchases */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly vs All-Time Purchases</CardTitle>
                <CardDescription>
                  Compare current month with total purchases
                </CardDescription>
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
                  className="h-[300px] w-full"
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
