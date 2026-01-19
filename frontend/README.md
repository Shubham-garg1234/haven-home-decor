# Haven Home Decor

A modern e-commerce platform for home decor products built with React, TypeScript, Express.js, and Supabase.

## 🚀 Features

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with role-based access
- **Payment**: Razorpay integration
- **Admin Dashboard**: Complete admin panel for managing products, categories, and orders

## 📁 Project Structure

```
haven-home-decor/
├── backend/              # Express.js backend server
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   └── server.js        # Server entry point
├── src/                 # React frontend
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and API client
│   └── types/          # TypeScript types
└── supabase/           # Database migrations
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Razorpay account (for payments)

### 1. Clone and Install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
```

**Backend (backend/.env):**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Setup

Run the migration in your Supabase project:
- Go to Supabase Dashboard → SQL Editor
- Run the migration file: `supabase/migrations/20260116173910_5ba26649-33b1-4206-be0c-6a8af1ffeb60.sql`

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove item from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (admin)

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/webhook` - Razorpay webhook

### Admin
- `GET /api/admin/stats` - Get dashboard stats
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role

## 🔐 Admin Access

To grant admin access to a user, run this SQL in Supabase:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'USER_ID_HERE';
```

Or use the admin panel to update user roles.

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests (when implemented)
cd backend
npm test
```

## 📦 Build

```bash
# Build frontend
npm run build

# Build backend (production)
cd backend
npm start
```

## 🚢 Deployment

### Frontend
Deploy the `dist` folder to any static hosting (Vercel, Netlify, etc.)

### Backend
Deploy to platforms like:
- Railway
- Render
- Heroku
- AWS EC2
- DigitalOcean

Make sure to set all environment variables in your deployment platform.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
