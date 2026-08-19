# Usage Meter - Premium Frontend UI

A high-quality, premium UI for the Usage Metering & Billing Engine with modern design inspired by Framer, Dribbble, and Mobbin.

## 🎨 Design Features

- **Glassmorphism Effects**: Beautiful glass-like cards with backdrop blur
- **Gradient Backgrounds**: Animated gradient backgrounds with blob animations
- **Smooth Animations**: Framer Motion powered micro-interactions and page transitions
- **Premium Typography**: Inter and Space Grotesk fonts for modern readability
- **Dark Mode**: Deep dark theme with vibrant accent colors (primary blue, accent purple)
- **Responsive Design**: Fully responsive across all device sizes

## 🚀 Tech Stack

- **React 19** - Modern React with latest features
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS v3** - Utility-first CSS framework with custom theme
- **Framer Motion** - Production-ready motion library for React
- **Recharts** - Composable charting library for data visualization
- **Lucide React** - Beautiful & consistent icon toolkit
- **React Router** - Declarative routing for React
- **Axios** - HTTP client for API integration

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Layout.jsx          # Main layout with navigation
│   ├── pages/
│   │   ├── Landing.jsx         # Landing page with hero section
│   │   ├── Dashboard.jsx       # Dashboard with metrics and charts
│   │   ├── Tenants.jsx         # Tenant management interface
│   │   ├── Usage.jsx           # Usage analytics with charts
│   │   ├── History.jsx         # Usage history with beautiful cards
│   │   └── Settings.jsx        # Settings panel with modern controls
│   ├── utils/
│   │   └── api.js              # API integration utilities
│   ├── App.jsx                 # Main app component with routing
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles with Tailwind
├── index.html
├── package.json
├── tailwind.config.js          # Custom Tailwind configuration
├── postcss.config.js
└── vite.config.js
```

## 🎯 Features Implemented

### 1. Landing Page
- Animated hero section with gradient text
- Feature cards with hover effects
- Statistics section with animated counters
- Call-to-action sections
- Smooth scroll animations

### 2. Dashboard
- Real-time metrics cards with trend indicators
- Live usage chart with area visualization
- Usage distribution pie chart
- Recent activity feed with icons
- Animated data updates

### 3. Tenant Management
- Beautiful tenant cards with progress bars
- Search and filter functionality
- Add/Edit/Delete tenant operations
- Status badges (Active, Trial, Inactive)
- Plan indicators (Enterprise, Pro, Starter)
- Modal dialogs for tenant operations

### 4. Usage Analytics
- Time range selector (7d, 30d, 90d)
- Multiple chart types (Area, Bar, Line)
- Resource breakdown by category
- Export functionality
- Real-time data refresh

### 5. Usage History
- Beautiful history cards with metric icons
- Search and filter by metric type
- Cost calculations and summaries
- Detailed event information
- Load more functionality

### 6. Settings Panel
- Tabbed interface for different settings
- Profile management
- Notification preferences with toggles
- Security settings (password, 2FA)
- Billing information
- Appearance settings (theme, accent color)
- API key management
- Webhook configuration

## 🎨 Custom Theme

The project uses a custom Tailwind theme with:

- **Primary Colors**: Blue spectrum (primary-50 to primary-900)
- **Accent Colors**: Purple spectrum (accent-50 to accent-900)
- **Dark Colors**: Slate spectrum (dark-50 to dark-950)
- **Custom Animations**: blob, float, pulse-slow
- **Glass Effects**: Custom glassmorphism utilities
- **Gradient Borders**: Animated gradient border components

## 🔌 API Integration

The frontend is configured to connect to the backend API at `http://localhost:3001`. The API utility includes:

- Mock data fallback for development
- Tenant CRUD operations
- Usage history retrieval
- Real-time usage data
- Metrics aggregation

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ installed
- Backend API running on port 3001

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 🎯 Key Design Patterns

### Glassmorphism Cards
```jsx
<div className="glass-card p-6">
  {/* Content */}
</div>
```

### Gradient Text
```jsx
<h1 className="gradient-text">Usage Metering</h1>
```

### Motion Animations
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* Content */}
</motion.div>
```

### Interactive Buttons
```jsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="btn-primary"
>
  Button Text
</motion.button>
```

## 📱 Responsive Design

The UI is fully responsive with:
- Mobile-first approach
- Responsive grid layouts
- Adaptive navigation (collapsible sidebar)
- Touch-friendly interactions
- Optimized for all screen sizes

## 🎭 Animations & Micro-interactions

- Page transitions with fade and slide
- Card hover effects with scale and shadow
- Button press animations
- Loading states with spinners
- Real-time data update animations
- Smooth chart transitions

## 🔧 Configuration Files

### Tailwind Config
Custom theme with extended colors, animations, and utilities.

### Vite Config
Optimized for development with hot module replacement and build optimizations.

### PostCSS Config
Tailwind CSS integration with autoprefixer for browser compatibility.

## 🚀 Performance

- Vite for fast development and optimized builds
- Code splitting with React Router
- Lazy loading for better initial load
- Optimized bundle size
- Tree shaking for unused code elimination

## 📄 License

This project is part of the Usage Metering & Billing Engine.

## 🤝 Contributing

To contribute to this project:
1. Follow the existing code style
2. Test your changes thoroughly
3. Ensure responsive design is maintained
4. Keep animations smooth and performant

## 🎨 Design Inspiration

- Framer - Smooth animations and interactions
- Dribbble - Modern UI patterns
- Mobbin - Real-world app designs
- MotionSites - Micro-interaction patterns

---

**Built with ❤️ using React, Tailwind CSS, and Framer Motion**
