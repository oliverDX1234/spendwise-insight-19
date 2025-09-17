import { useState, useMemo } from "react"
import { format } from "date-fns"
import { Search, Filter, ArrowUpDown, ChevronDown } from "lucide-react"
import { useExpenses } from "@/hooks/useExpenses"
import { useCategories } from "@/hooks/useCategories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type SortField = 'expense_date' | 'amount' | 'description' | 'category'
type SortDirection = 'asc' | 'desc'
type TimePeriod = 'all' | 'today' | 'week' | 'month' | 'year'

export default function Expenses() {
  const { expenses, loading, deleteExpense } = useExpenses()
  const { categories } = useCategories()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const [sortField, setSortField] = useState<SortField>('expense_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Get unique products from all expenses
  const allProducts = useMemo(() => {
    const products = new Set<string>()
    expenses.forEach(expense => {
      expense.products.forEach(product => {
        products.add(product.name)
      })
    })
    return Array.from(products)
  }, [expenses])

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(expense => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.products.some(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Category filter
      const matchesCategory = selectedCategory === "all" || expense.category_id === selectedCategory

      // Product filter
      const matchesProduct = selectedProduct === "all" || 
        expense.products.some(product => product.name === selectedProduct)

      // Time period filter
      const expenseDate = new Date(expense.expense_date)
      const now = new Date()
      let matchesTimePeriod = true

      switch (timePeriod) {
        case 'today':
          matchesTimePeriod = expenseDate.toDateString() === now.toDateString()
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          matchesTimePeriod = expenseDate >= weekStart && expenseDate <= weekEnd
          break
        case 'month':
          matchesTimePeriod = expenseDate.getMonth() === now.getMonth() && 
                             expenseDate.getFullYear() === now.getFullYear()
          break
        case 'year':
          matchesTimePeriod = expenseDate.getFullYear() === now.getFullYear()
          break
      }

      return matchesSearch && matchesCategory && matchesProduct && matchesTimePeriod
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'expense_date':
          aValue = new Date(a.expense_date).getTime()
          bValue = new Date(b.expense_date).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'description':
          aValue = a.description || ''
          bValue = b.description || ''
          break
        case 'category':
          aValue = a.category?.name || ''
          bValue = b.category?.name || ''
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [expenses, searchTerm, selectedCategory, selectedProduct, timePeriod, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? 
      <ArrowUpDown className="h-4 w-4 rotate-180" /> : 
      <ArrowUpDown className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Badge variant="secondary">
          {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {allProducts.map((product) => (
                  <SelectItem key={product} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("all")
                setSelectedProduct("all") 
                setTimePeriod("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('expense_date')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Date {getSortIcon('expense_date')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('description')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Description {getSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('category')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Category {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead>Products</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('amount')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Amount {getSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {expense.description || '-'}
                    {expense.is_recurring && (
                      <Badge variant="outline" className="ml-2">
                        Recurring
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: expense.category?.color,
                        color: expense.category?.color
                      }}
                    >
                      {expense.category?.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {expense.products.length > 0 ? (
                      <div className="space-y-1">
                        {expense.products.map((product, index) => (
                          <div key={index} className="text-sm">
                            {product.name} ({product.quantity}x ${product.price_per_unit})
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteExpense(expense.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No expenses found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}