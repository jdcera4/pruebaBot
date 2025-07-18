# Technology Stack

## Frontend (whatsapp-admin)
- **Framework**: Angular 19.2.x
- **UI Library**: Angular Material with Indigo-Pink theme
- **Styling**: SCSS
- **Build Tool**: Angular CLI
- **Key Dependencies**:
  - Angular CDK for component utilities
  - RxJS for reactive programming
  - XLSX for Excel file processing
  - TypeScript 5.7.x

## Backend (whatsapp-backend)
- **Runtime**: Node.js 16.0+ (Express.js framework)
- **WhatsApp Integration**: whatsapp-web.js v1.23.0
- **Key Dependencies**:
  - CORS for cross-origin requests
  - Express Rate Limit for API protection
  - Multer for file uploads
  - QRCode libraries for authentication
  - UUID for unique identifiers
  - XLSX for Excel processing

## Development Tools
- **Testing**: Karma + Jasmine (frontend)
- **Development Server**: Nodemon (backend)
- **Package Manager**: NPM

## Common Commands

### Quick Start (Recommended)
```bash
# Start backend
start-backend.bat

# Start frontend (separate terminal)
start-frontend.bat
```

### Manual Development
```bash
# Backend setup and start
cd whatsapp-backend
npm install
npm start          # Development mode
npm run dev        # With nodemon
npm run prod       # Production mode

# Frontend setup and start
cd whatsapp-admin
npm install
npm start          # Serves on http://localhost:4200
ng serve           # Alternative command
```

### Build Commands
```bash
# Frontend build
cd whatsapp-admin
ng build                    # Production build
ng build --watch           # Development build with watch
ng test                    # Run tests
```

## Configuration
- **Proxy**: Frontend proxies `/api` requests to `http://localhost:3000`
- **Ports**: Backend runs on 3000, Frontend on 4200
- **Session Storage**: WhatsApp session stored locally in backend
- **Data Persistence**: JSON files in backend `/data` directory

## Architecture Notes
- Frontend communicates with backend via REST API
- WhatsApp Web session managed through QR code authentication
- File uploads handled through multer middleware
- Rate limiting implemented for API protection
- Colombia timezone (America/Bogota) used for scheduled messages