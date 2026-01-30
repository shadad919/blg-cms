# BLG Admin Dashboard

A professional admin dashboard built with Next.js (App Router) and Hono backend for managing posts from an Android app.

## Features

- 🔐 Admin authentication system
- 📝 Posts management (CRUD operations)
- 🌍 Multi-language support (English, German, Arabic)
- 🎨 Professional UI with government-inspired color scheme
- 📱 Responsive design
- ⚡ Fast API with Hono
- 🔒 JWT-based authentication

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- next-intl (localization)
- Zustand (state management)
- React Hook Form + Zod
- Axios

### Backend
- Hono
- TypeScript
- JWT authentication
- Zod validation

## Color Scheme

- **Primary (Government Blue)**: `#1E3A8A`
- **Background**: `#F5F7FA`
- **Text**: `#1F2937`
- **Success**: `#16A34A`
- **Warning**: `#F59E0B`
- **Critical**: `#DC2626`

## Project Structure

```
blg/
├── app/              # Next.js app with integrated Hono API
│   ├── app/
│   │   ├── api/      # Hono API routes (integrated)
│   │   │   └── [[...route]]/
│   │   └── [locale]/ # App router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities & API client
│   ├── i18n/         # Localization config
│   └── messages/     # Translation files
└── package.json      # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd app && npm install
```

2. Set up environment variables:

Create `.env` or `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
# Required for post image uploads (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

### Running the Development Server

From the root directory:
```bash
npm run dev
```

Or from the app directory:
```bash
cd app && npm run dev
```

This will start the Next.js app with integrated Hono API on port 3000.

### Default Login Credentials

- Email: `admin@example.com`
- Password: `admin123`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Localization

The app supports three languages:
- English (en) - Default
- German (de)
- Arabic (ar)

Translation files are located in `app/messages/`.

## API Endpoints

All API endpoints are integrated into Next.js and available at `/api/*`

### Authentication
- `POST /api/admin/login` - Admin login (public)
- `GET /api/admin/me` - Get current admin profile (protected)

### Posts
- `GET /api/posts` - Get all posts (with pagination and filters)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (protected)
- `PATCH /api/posts/:id` - Update post (protected)
- `DELETE /api/posts/:id` - Delete post (protected)

## License

MIT
