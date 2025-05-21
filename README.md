# Foldering AI Project

This repository contains the Foldering AI project, a system for intelligent folder management and organization.

## Project Structure
```
.
├── api/           # Backend API services
├── etl/           # ETL (Extract, Transform, Load) scripts
├── frontend/      # Frontend application
├── ml/            # Machine Learning models and scripts
├── .env           # Environment variables
├── requirements.txt # Python dependencies
└── README.md      # This file
```

## Prerequisites
- Python 3.8 or higher
- Node.js 16.x or higher (for frontend)
- PostgreSQL database
- Git

## Setup Instructions

### 1. Backend Setup
1. Create a virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the environment variables in `.env` file:
  - DATABASE_URL
  - API_KEY
  - OTHER_REQUIRED_VARIABLES

4. Initialize the database:
```bash
python api/db/init_db.py
```

### 2. Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install frontend dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### 3. Running the Project

#### Backend
```bash
# In one terminal
cd api
uvicorn api.main:app --reload
```

#### Frontend
```bash
# In another terminal
cd frontend
npm run dev
```

## Development Workflow
1. Backend API runs on: `http://localhost:8000`
2. Frontend development server runs on: `http://localhost:3000`
3. API documentation is available at: `http://localhost:8000/docs`

## Features
- Purchase Order Management
- Checklist SPV (Supplier Performance Verification)
- Notes Management
- Role-based Access Control
- Real-time Updates

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
This project is proprietary and confidential. All rights reserved.
