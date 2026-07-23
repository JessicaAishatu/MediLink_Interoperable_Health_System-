# MediLink: Interoperable Health Information System

MediLink is a secure, modern, and interoperable full-stack health information system built with a **React.js** frontend, a **Node.js + Express.js** backend, a **MySQL** database, and an HL7-compliant **FHIR (Fast Healthcare Interoperability Resources) API** layer.

The system features robust authentication, Role-Based Access Control (RBAC), user-friendly dashboards for both doctors and patients, and clinical utilities including appointments, medical history, lab results, and prescriptions. It also showcases **cross-hospital interoperability** by allowing doctors to query and import patient records from virtual external health systems via standardized FHIR JSON payloads.


## Technical Stack & Security

- **Frontend**: React.js.
- **Backend**: Node.js & Express.js.
- **Database**: MySQL (using `mysql2` client with connection pool).
- **Session Security**: JSON Web Tokens (JWT) for secure authentication.
- **Data Protection**: `bcryptjs` password hashing and strict Role-Based Access Control (RBAC) supporting `patient`, `doctor`, and `admin` roles.
- **Interoperability Layer**: Dynamic HL7 FHIR (v4.0.1) resource builder exposing `Patient`, `Observation`, `MedicationRequest`, and `Condition` JSON models.


## Repository Structure

Interoperable_Health_System/
├── backend/
│   ├── config/
│   │   └── db.js            # MySQL connection pool
│   ├── database/
│   │   └── schema.sql       # Database schema initialization
│   ├── middleware/
│   │   └── auth.js          # JWT & RBAC validators
│   ├── routes/
│   │   ├── auth.js          # Register, Login, & profile fetch
│   │   ├── clinical.js      # Appointments, history, labs, rx
│   │   ├── fhir.js          # Standard HL7 FHIR R4 API endpoints
│   │   └── interop.js       # External hospital sync endpoints
│   ├── scripts/
│   │   ├── setup-db.js      # SQL executor and mock-data seeder
│   │   └── test-api.js      # API connection check test script
│   ├── .env.example         # Template for environment variables
│   ├── package.json
│   └── server.js            # Server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx    # Login page with demo credentials helper
│   │   │   ├── Register.jsx # Stepped patient demographics registrar
│   │   │   ├── PatientDashboard.jsx # EHR Dashboard, Lab trends, Prescriptions, Appointment Booker
│   │   │   └── DoctorDashboard.jsx  # EHR viewer, Clinical Input panels, FHIR importer console
│   │   ├── App.css          # View layouts and styles
│   │   ├── App.jsx          # Shell router and state manager
│   │   ├── index.css        # Global CSS theme & CSS variables
│   │   └── main.jsx
│   ├── index.html           # Google Fonts and SEO metadata tags
│   └── package.json
├── .gitignore
├── README.md
└── task.md                  # Task checklist log
