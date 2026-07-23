# MediLink: Interoperable Health Information System

MediLink is a secure, modern, and interoperable full-stack health information system built with a **React.js** frontend, a **Node.js + Express.js** backend, a **MySQL** database, and an HL7-compliant **FHIR (Fast Healthcare Interoperability Resources) API** layer.

The system features robust authentication, Role-Based Access Control (RBAC), user-friendly dashboards for both doctors and patients, and clinical utilities including appointments, medical history, lab results, and prescriptions. It also showcases **cross-hospital interoperability** by allowing doctors to query and import patient records from virtual external health systems via standardized FHIR JSON payloads.

---

## Technical Stack & Security

- **Frontend**: React.js (Vite template), Lucide React (icons), and custom Vanilla CSS with a high-end, responsive clinical theme (deep teal `#00A3A6`, soft teal `#C2E7EB`, ice blue `#F0F9FA`, custom glassmorphism, Montserrat and Lato typography).
- **Backend**: Node.js & Express.js.
- **Database**: MySQL (using `mysql2` client with connection pool).
- **Session Security**: JSON Web Tokens (JWT) for secure authentication.
- **Data Protection**: `bcryptjs` password hashing and strict Role-Based Access Control (RBAC) supporting `patient`, `doctor`, and `admin` roles.
- **Interoperability Layer**: Dynamic HL7 FHIR (v4.0.1) resource builder exposing `Patient`, `Observation`, `MedicationRequest`, and `Condition` JSON models.

---

## Repository Structure

```text
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
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended, tested on v24.18.0)
- [MySQL Database Server](https://www.mysql.com/) (running locally or remotely on port 3306)

---

### Step 1: Clone & Initialize the Project
The local workspace has already been initialized with a Git repository. To configure and test it:

1. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

---

### Step 2: Configure Environment Variables
1. Inside the `backend/` folder, create a `.env` file (a default copy has been created for you).
2. Edit the database credentials in `backend/.env` to match your local MySQL configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=health_system
   JWT_SECRET=supersecretjwtkeyforhealthsystem
   ```

---

### Step 3: Setup & Seed the Database
Ensure your MySQL server is running, then execute the automatic schema and mock database seeder from the `backend/` directory:
```bash
npm run db:setup
```
This script will:
- Establish a connection to your MySQL server.
- Create the `health_system` database and build the tables.
- Seed the tables with rich test data (doctors, patients, medical history, lab observations, prescriptions, and appointments) so the application is fully functional out of the box!

---

### Step 4: Run the Application

1. **Start the Express API Server**:
   From the `backend/` directory, run:
   ```bash
   npm run dev
   ```
   *(This starts the server on port `5000` with `nodemon` for auto-reloading.)*

2. **Start the React Frontend**:
   Open a separate terminal window, navigate to the `frontend/` directory, and run:
   ```bash
   npm run dev
   ```
   *(This boots the Vite React client, usually listening on `http://localhost:5173/`.)*

---

## Live Demo Login Credentials

Use the following seeded accounts to immediately test the dashboards and RBAC restrictions:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Doctor** | `dr.doe@health.com` | `password123` | Can access all patients, log clinical findings, write prescriptions, and sync external hospital records. |
| **Doctor** | `dr.smith@health.com` | `password123` | Can access all patients, log clinical findings, write prescriptions, and sync external hospital records. |
| **Patient** | `alice@health.com` | `password123` | Can view her EHR record, schedule appointments, see her lab history, and view her active prescriptions. |
| **Patient** | `bob@health.com` | `password123` | Can view his EHR record, schedule appointments, see his lab history, and view his active prescriptions. |
| **Admin** | `admin@health.com` | `adminpassword` | Full administrative capabilities. |

---

## Interoperability & FHIR API Endpoints

MediLink exposes standard HL7 FHIR (R4) read/write endpoints. These endpoints require a valid JWT header (`Authorization: Bearer <TOKEN>`):

- `GET /api/fhir/Patient`: Returns a FHIR Search Bundle containing all local patient resources.
- `GET /api/fhir/Patient/:fhirId`: Returns a single patient mapped as a FHIR `Patient` resource (e.g., `/api/fhir/Patient/pat-alice-johnson`).
- `GET /api/fhir/Observation?patient=:fhirId`: Returns a FHIR Bundle of laboratory/clinical findings mapped as `Observation` resources.
- `GET /api/fhir/MedicationRequest?patient=:fhirId`: Returns a FHIR Bundle of active prescriptions mapped as `MedicationRequest` resources.
- `GET /api/fhir/Condition?patient=:fhirId`: Returns a FHIR Bundle of medical history entries mapped as `Condition` resources.
- `POST /api/fhir/Patient`: Creates or updates a patient profile in our MySQL database from a raw inbound FHIR `Patient` JSON payload.

---

## Syncing with External Hospitals (FHIR Interoperability Demonstration)

In the **Doctor Dashboard**, click on the **FHIR Interop Console** tab to test external sync functionality:
1. Search for external patient records from "St. Jude General Hospital" or "Gotham City Clinic".
2. Click **Sync & Import Records** on a result (e.g., *Sarah Connor* or *Bruce Wayne*).
3. The backend will pull the remote HL7 FHIR Patient resource, map it locally, save it to the MySQL database, and import their external clinical history (conditions, past prescriptions, and lab tests) into your local database.
4. You can then search for the newly imported patient in the local Patient Directory!

---

## How to Link to GitHub

To publish this project to your GitHub account:

1. Create a new repository on [GitHub](https://github.com/) (select **New**, name it, and keep it empty - do not add README, license, or gitignore since they are already present).
2. Copy your GitHub repository URL (e.g., `https://github.com/yourusername/interoperable-health-system.git`).
3. Open a terminal in the project root directory and link the remote:
   ```bash
   git remote add origin https://github.com/yourusername/interoperable-health-system.git
   ```
4. Verify the link:
   ```bash
   git remote -v
   ```
5. Stage, commit, and push your code:
   ```bash
   git add .
   git commit -m "Initial commit: Complete Interoperable Health Information System"
   git branch -M main
   git push -u origin main
   ```
