# Frontend Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |

## Useful Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first styling

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route pages
├── hooks/          # Custom React hooks
├── services/       # API client functions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles (Tailwind)
```

## Tailwind CSS v4

This project uses Tailwind CSS v4 with the new `@tailwindcss/postcss` plugin.

- Styles are imported via `@import "tailwindcss"` in `index.css`
- No config file needed - Tailwind auto-detects content files
- Use standard Tailwind utility classes in JSX

