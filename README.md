# Telegram Food Ordering App

A modern React-based food ordering application integrated with Telegram WebApp.

## Features

- 🍔 **Product Catalog**: Browse and select food items
- 🛒 **Shopping Cart**: Add/remove items with quantity controls
- 📱 **Mobile-First Design**: Optimized for Telegram WebApp
- 📋 **Order History**: View past orders with status tracking
- 👨‍💼 **Admin Panel**: Manage orders and update status
- 🤖 **Telegram Integration**: Seamless bot integration

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **UI Components**: Radix UI, Lucide React icons
- **Styling**: Tailwind CSS with custom design system

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── ProductCard.jsx          # Individual product display
│   │   ├── ProductCatalog.jsx       # Product grid
│   │   ├── OrderProcessing.jsx      # Cart and checkout
│   │   ├── PastOrders.jsx           # Order history
│   │   ├── figma/
│   │   │   └── ImageWithFallback.jsx # Image component with fallback
│   │   └── ui/
│   │       └── utils.js             # Utility functions
│   ├── App.jsx                      # Main application component
│   ├── AdminApp.jsx                 # Admin interface
│   ├── main.jsx                     # React entry point
│   ├── admin.jsx                    # Admin entry point
│   └── index.css                    # Global styles
├── public/
│   ├── index.html                   # Main HTML file
│   └── admin.html                   # Admin HTML file
├── server/
│   └── index.js                     # Express server
├── package.json                     # Dependencies and scripts
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS configuration
└── postcss.config.js                # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Telegram Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd telegram-food-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ADMIN_CHAT_ID=your_admin_chat_id
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

### Development

For development with hot reload:

```bash
# Terminal 1: Start the backend server
npm run dev

# Terminal 2: Start the frontend dev server
npm run build -- --watch
```

## Usage

### Customer Interface

1. **Access via Telegram**: Open the bot and click the menu button
2. **Browse Products**: View available food items with prices
3. **Add to Cart**: Use +/- buttons to adjust quantities
4. **Checkout**: Review order and place it
5. **Track Orders**: View order history and status updates

### Admin Interface

1. **Access Admin Panel**: Navigate to `/admin.html`
2. **View Orders**: See all incoming orders
3. **Update Status**: Change order status (pending → preparing → arriving → arrived)
4. **Add Comments**: Include notes for customers
5. **Set ETA**: Provide estimated delivery times

## API Endpoints

### Customer Endpoints

- `POST /api/order` - Place a new order
- `GET /api/orders?user_id=<id>` - Get user's order history
- `GET /api/order-status/:orderId` - Get specific order status

### Admin Endpoints

- `GET /api/admin-orders` - Get all orders for admin
- `POST /api/admin-orders` - Update order status and details

### Webhook

- `POST /api/webhook` - Telegram bot webhook for status updates

## Customization

### Adding New Products

Edit the `products` array in `src/App.jsx`:

```javascript
const products = [
  {
    id: 7,
    name: 'New Item',
    price: 9.99,
    emoji: '🍕',
    description: 'Description of the new item'
  }
  // ... existing products
];
```

### Styling

The app uses Tailwind CSS with a custom design system. Colors and components can be customized in:

- `tailwind.config.js` - Theme configuration
- `src/index.css` - CSS variables and global styles

### Database Integration

Currently using file-based storage for demo purposes. To integrate with a database:

1. Replace the mock data in server endpoints
2. Update the order storage functions in `server/index.js`
3. Add proper database connection and queries

## Deployment

### Production Build

```bash
npm run build
```

This creates optimized files in the `public/` directory.

### Server Deployment

The Express server serves the built React app. Deploy to platforms like:

- Heroku
- Vercel
- Railway
- DigitalOcean

### Environment Variables

Ensure these are set in production:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `ADMIN_CHAT_ID` - Admin's Telegram chat ID
- `PORT` - Server port (optional, defaults to 3000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Check the existing issues
- Create a new issue with detailed description
- Include error logs and steps to reproduce 