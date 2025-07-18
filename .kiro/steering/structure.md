# Project Structure

## Root Directory
```
whatsapp-campaign-manager/
├── whatsapp-backend/          # Node.js/Express API server
├── whatsapp-admin/            # Angular frontend application
├── start-backend.bat          # Backend startup script
├── start-frontend.bat         # Frontend startup script
├── README.md                  # Main project documentation
├── PROGRAMACION-ENVIOS-COLOMBIA.md  # Colombia timezone features
└── *.xlsx                     # Sample contact files
```

## Backend Structure (whatsapp-backend/)
```
whatsapp-backend/
├── controllers/               # API route handlers
├── routes/                   # Express route definitions
├── services/                 # Business logic services
├── middlewares/              # Express middleware
├── utils/                    # Utility functions
├── data/                     # JSON data persistence
├── uploads/                  # Temporary file uploads
├── session/                  # WhatsApp session storage
├── .wwebjs_cache/           # WhatsApp Web cache
├── server.js                 # Main server entry point
├── server-stable.js          # Stable version backup
├── reset-session.js          # Session reset utility
└── package.json              # Dependencies and scripts
```

## Frontend Structure (whatsapp-admin/)
```
whatsapp-admin/
├── src/
│   ├── app/
│   │   ├── features/         # Feature modules
│   │   │   ├── dashboard/    # Dashboard component
│   │   │   └── broadcast/    # Broadcast/campaign component
│   │   ├── core/            # Core services and models
│   │   │   └── services/    # HTTP services (whatsapp.service.ts)
│   │   ├── shared/          # Shared components and utilities
│   │   └── app.component.*  # Root application component
│   ├── styles.scss          # Global styles
│   └── index.html           # Main HTML template
├── public/                  # Static assets
├── dist/                    # Build output
├── proxy.conf.json          # Development proxy configuration
├── angular.json             # Angular CLI configuration
└── package.json             # Dependencies and scripts
```

## Key Architectural Patterns

### Frontend (Angular)
- **Feature-based organization**: Components grouped by functionality (dashboard, broadcast)
- **Service layer**: Core services in `src/app/core/services/`
- **Component structure**: Each feature has `.ts`, `.html`, `.scss` files
- **Material Design**: Consistent UI using Angular Material components

### Backend (Express)
- **MVC pattern**: Controllers handle routes, services contain business logic
- **Middleware stack**: CORS, rate limiting, file upload handling
- **Data persistence**: JSON files in `/data` directory
- **Session management**: WhatsApp Web session in `/session` directory

## File Naming Conventions
- **Angular components**: `component-name.component.ts/html/scss`
- **Services**: `service-name.service.ts`
- **Backend files**: kebab-case for utilities, camelCase for main files
- **Data files**: JSON format in `/data` directory

## Important Configuration Files
- `proxy.conf.json`: Frontend-to-backend API routing
- `angular.json`: Angular build and serve configuration
- `package.json`: Dependencies and npm scripts (both frontend/backend)
- `.gitignore`: Excludes node_modules, build artifacts, session data

## Development Workflow
1. Backend runs on port 3000, serves API endpoints
2. Frontend runs on port 4200, proxies API calls to backend
3. WhatsApp Web integration requires QR code authentication
4. Data persisted locally in JSON files, no external database required