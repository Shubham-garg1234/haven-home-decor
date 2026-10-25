# Haven Home Decor - Backend API

Express.js backend server for Haven Home Decor e-commerce platform.

## Features

- ✅ Authentication (Signup, Login, Logout, Token Refresh)
- ✅ Product Management (CRUD operations)
- ✅ Category Management (CRUD operations)
- ✅ Shopping Cart (Add, Update, Remove, Clear)
- ✅ Order Management (Create, View, Update Status)
- ✅ Payment Integration (Razorpay)
- ✅ Admin Dashboard (Stats, User Management)
- ✅ Role-based Access Control (Admin/Customer)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# JWT Secret (optional)
JWT_SECRET=your_jwt_secret_here

# OpenAI-powered image search and shopping assistant
OPENAI_API_KEY=your_openai_api_key_here
# Optional; defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

### 3. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh access token

### Products

- `GET /api/products` - Get all products (public)
- `GET /api/products/:id` - Get single product (public)
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### AI Assistant

- `POST /api/assistant/image-search` - Search the active catalog using a JPEG, PNG, or WebP image sent as the raw request body (maximum 5 MB)
- `POST /api/assistant/chat` - Get a shopping assistant reply. Send `{ "messages": [{ "role": "user", "content": "..." }] }`; at most 8 user/assistant messages are used as context.

Both endpoints require `OPENAI_API_KEY` on the backend. Never add the key to the frontend environment or send it to the browser.

### Categories

- `GET /api/categories` - Get all categories (public)
- `GET /api/categories/:id` - Get single category (public)
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Cart

- `GET /api/cart` - Get user's cart (authenticated)
- `POST /api/cart` - Add item to cart (authenticated)
- `PUT /api/cart/:id` - Update cart item quantity (authenticated)
- `DELETE /api/cart/:id` - Remove item from cart (authenticated)
- `DELETE /api/cart` - Clear entire cart (authenticated)

### Orders

- `GET /api/orders` - Get user's orders (authenticated)
- `GET /api/orders/:id` - Get single order (authenticated)
- `POST /api/orders` - Create new order (authenticated)
- `PUT /api/orders/:id/status` - Update order status (admin)

### Payments

- `POST /api/payments/create-order` - Create Razorpay order (authenticated)
- `POST /api/payments/verify` - Verify payment (authenticated)
- `POST /api/payments/webhook` - Razorpay webhook handler

### Admin

- `GET /api/admin/stats` - Get dashboard statistics (admin)
- `GET /api/admin/users` - Get all users (admin)
- `PUT /api/admin/users/:id/role` - Update user role (admin)

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Error Handling

The API returns errors in the following format:

```json
{
  "error": "Error message here"
}
```

## Development

The server uses:
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **Razorpay** - Payment gateway
- **CORS** - Cross-origin resource sharing

## Notes

- The backend uses Supabase Service Role Key for admin operations
- All database operations respect Row Level Security (RLS) policies
- Payment webhooks should be configured in Razorpay dashboard
- Make sure to set `FRONTEND_URL` for CORS configuration

