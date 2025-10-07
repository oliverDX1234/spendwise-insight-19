# 💰 SpendWise Insight

> Smart expense tracking and financial insights for better money management

SpendWise Insight is a modern, full-featured expense tracking application that helps you manage your finances, set spending limits, analyze patterns, and generate comprehensive reports. Built with React, TypeScript, and Supabase.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## ✨ Features

### 📊 Core Features

- **Expense Tracking**: Record and categorize all your expenses with custom categories
- **Product Management**: Track specific products and their associated costs
- **Payment Cards**: Manage multiple payment cards and assign expenses to them
- **Recurring Expenses**: Automate tracking of recurring bills and subscriptions
- **Spending Limits**: Set category-based spending limits with real-time alerts

### 📈 Analytics & Insights (Premium)

- **Interactive Charts**: Visualize spending patterns with beautiful charts
- **Category Analysis**: Understand where your money goes
- **Product Analytics**: Track most purchased items and spending trends
- **Time-based Comparisons**: Compare current period vs all-time spending
- **Expense Trends**: Identify patterns in your spending behavior

### 📄 Reports

- **Monthly Reports**: Automatically generated monthly financial summaries
- **Historical Data**: Access reports from previous months
- **PDF Export**: Download reports in PDF format
- **Excel Export**: Export data to Excel for further analysis
- **Custom Date Ranges**: Generate reports for specific time periods

### 👤 User Management

- **User Authentication**: Secure signup/login with email confirmation
- **Profile Management**: Update personal info, avatar, and password
- **Onboarding Flow**: Guided setup for new users with plan selection
- **Admin Dashboard**: Manage users, view statistics, and oversee the platform

### 🎯 Additional Features

- **Trial & Premium Plans**: Flexible subscription options
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Live data synchronization with Supabase
- **Dark Mode Support**: (via shadcn-ui theme system)
- **Toast Notifications**: User-friendly feedback for all actions

## 🛠️ Tech Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management and caching
- **Recharts** - Data visualization and charts
- **shadcn-ui** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible UI primitives

### Backend

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Edge Functions
  - Storage for avatars
  - Real-time subscriptions
  - Authentication

### Development Tools

- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/spendwise-insight-19.git
cd spendwise-insight-19
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Set up the database**

The project includes migration files in `supabase/migrations/`. Apply them to your Supabase project:

```bash
# If you have Supabase CLI installed
npx supabase link --project-ref your_project_ref
npx supabase db push
```

Or manually run the SQL migrations in your Supabase SQL Editor.

5. **Start the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## 📁 Project Structure

```
spendwise-insight-19/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn-ui components
│   │   ├── admin/          # Admin-specific components
│   │   ├── AppSidebar.tsx  # Main navigation sidebar
│   │   ├── Layout.tsx      # App layout wrapper
│   │   └── ...             # Feature components
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.tsx     # Authentication logic
│   │   ├── useExpenses.tsx # Expense management
│   │   ├── useAnalytics.tsx# Analytics data
│   │   └── ...             # Other hooks
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Dashboard
│   │   ├── Expenses.tsx    # Expenses page
│   │   ├── Analytics.tsx   # Analytics page
│   │   ├── Profile.tsx     # User profile
│   │   └── ...             # Other pages
│   ├── integrations/       # External integrations
│   │   └── supabase/       # Supabase client & types
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # App entry point
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── check-limits/   # Limit checking
│   │   ├── process-recurring-expenses/
│   │   ├── generate-monthly-reports/
│   │   └── ...
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── ...config files
```

## 🗄️ Database Schema

The application uses the following main tables:

- **users** - User profiles and subscription info
- **user_roles** - User role management (admin/user)
- **expenses** - Individual expense records
- **categories** - Expense categories
- **products** - Product catalog
- **payment_cards** - User payment methods
- **limits** - Spending limits by category
- **reports** - Monthly financial reports

All tables have Row Level Security (RLS) enabled for data protection.

## 🔐 Authentication & Security

- Email/password authentication via Supabase Auth
- Row Level Security (RLS) policies on all tables
- Service role for admin operations
- Secure avatar uploads with user-specific folders
- Protected routes and API endpoints

## 📦 Key Features Implementation

### Recurring Expenses

Automatically processed via Supabase Edge Function scheduled with pg_cron:

- Daily processing of recurring expenses
- Creates new expense records based on recurrence rules
- Updates next due dates automatically

### Spending Limits

Real-time limit checking with notifications:

- Category-based limits
- Daily, weekly, monthly periods
- Alert system when approaching or exceeding limits

### Monthly Reports

Automated report generation:

- Scheduled generation at month end
- Historical report seeding for past data
- Current month report generation on demand
- Export to PDF and Excel formats

## 🎨 Customization

### Theme

The app uses Tailwind CSS with shadcn-ui. Customize colors in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      // Add your custom colors
    }
  }
}
```

### Components

All UI components are in `src/components/ui/` and can be customized according to your needs.

## 🚢 Deployment

### Frontend Deployment

The app can be deployed to any static hosting service:

**Vercel**

```bash
npm run build
vercel --prod
```

**Netlify**

```bash
npm run build
netlify deploy --prod --dir=dist
```

**Lovable (Recommended)**
Simply open [Lovable](https://lovable.dev/projects/824e10dc-8192-4047-b8fb-cf2db72a08d2) and click Share → Publish.

### Backend (Supabase)

- Database migrations are applied via Supabase Dashboard or CLI
- Edge Functions are deployed via Supabase CLI:

```bash
npx supabase functions deploy
```

## 🧪 Testing

Run the development server and test features:

```bash
npm run dev
```

Key areas to test:

- User registration with avatar upload
- Expense creation and editing
- Category management
- Limit alerts
- Report generation
- Analytics charts (Premium feature)

## 📝 Environment Variables

Required environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [shadcn-ui](https://ui.shadcn.com/) for the beautiful component library
- [Supabase](https://supabase.com/) for the amazing backend platform
- [Recharts](https://recharts.org/) for data visualization
- [Lucide Icons](https://lucide.dev/) for the icon set

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**Built with ❤️ using React, TypeScript, and Supabase**
