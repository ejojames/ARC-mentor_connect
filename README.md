# Arc Mentor Connect

An institutional alumni-trainee networking platform designed to bridge the gap between students and experienced mentors. This platform enables students to explore career paths and connect with alumni, while allowing verified mentors to post professional and academic opportunities.

---
##LIVE LINK : https://arc-mentor-connect.onrender.com/
<img width="1920" height="1080" alt="Screenshot 2026-07-01 205136" src="https://github.com/user-attachments/assets/f52c14b6-0b2c-4bfe-98d7-f9e2ebbaae0f" />

## Key Problems Solved & Innovative Approaches

Arc Mentor Connect was developed to tackle systemic friction in institutional networking and career placement.

### The Problems We Solve
* **Information Silos**: Breaks down the barrier between current students and successful alumni, making hard-earned advice and institutional knowledge easy to find.
* **Unverified Mentorship (MVP Authentication)**: To ensure only qualified mentors can post, new mentor accounts are securely locked by default. Because this is an MVP, we use a direct database approval method (approving via the Supabase dashboard) rather than building a heavy, dedicated admin interface.
* **Opportunity Fragmentation**: Instead of students digging through emails or noisy social media groups, mentors can clearly label their postings (e.g., "Mentorship" vs. "Internship"), keeping everything categorized in one specialized hub.
* **Communication Mess**: Fixes messy email chains by giving every opportunity its own dedicated announcement room, allowing mentors to broadcast updates to all participants instantly.
* **Manual Overload**: Eliminates the stress of manually reviewing hundreds of applicants. Mentors can set automatic acceptance caps and strict eligibility rules (like a minimum CGPA or specific semesters) to automatically filter out unqualified candidates.
* **Data Traps & Blind Spots**: Mentors no longer have to guess how their postings are performing or struggle to extract data. The platform provides a single-page analytics dashboard for instant insights and allows easy 1-click exporting of participant data directly to Excel.

### Our Innovative Approaches
* **Zero-Friction Role Routing**: A unified authentication pipeline that contextually transforms the entire application layout, navigation tree, and data access policies based on the user's selected archetype (Student vs. Mentor) without requiring separate portals.
* **Client-Side Authorization Ejection**: Instead of relying solely on heavy server-side redirects, our layout architecture intercepts unverified users at the root DOM level. It immediately replaces the application shell with a secure fallback UI *before* any sensitive components can mount.
* **Cryptographic Data Enforcement**: Leveraging Row Level Security (RLS) at the database layer ensures that even if a malicious user manipulates the client interface, the database intrinsically rejects unauthorized reads and writes based on the user's cryptographically signed session role.

---

## 1. Project Implementation Overview

Arc Mentor Connect is built as a lightweight, highly responsive Client-Side Single Page Application (SPA). The architecture decouples the user interface from the backend database services to ensure high availability, rapid rendering, and straightforward scalability.

### Core Technology Stack
* Frontend Framework: React 19 with TypeScript for strong type safety and predictable runtime behavior.
* Build Tooling & Bundler: Vite for fast local development cycles and optimized production asset minification.
* Styling Engine: Tailwind CSS utilizing standard modern utility architectures for a cohesive UI/UX theme.
* Backend-as-a-Service (BaaS): Supabase for secure user authentication, relational data storage, and immediate row-level filtering.

---

## 2. Project Structure

The repository follows a modular, feature-based directory structure to separate data layers, visual components, and application layouts.

```text
├── .env.local                  # Local environment variable definitions (git-ignored)
├── index.html                  # Main application DOM entry point
├── package.json                # Project dependencies and deployment scripts
├── vite.config.ts              # Vite asset pipelines and compilation settings
└── src/
    ├── main.tsx                # React application bootstrapping entry script
    ├── index.css               # Global Tailwind CSS directives and custom variants
    ├── components/             # Reusable UI elements (Buttons, Inputs, Cards)
    ├── hooks/                  # Custom React hooks (Authentication, Data Fetching)
    ├── layouts/                # Structural shells (DashboardLayout, AuthLayout)
    ├── pages/                  # Top-level view components (Home, Auth, OpportunityBoard)
    ├── routes/                 # Navigation configurations and client-side page mapping
    └── integrations/
        └── supabase/
            └── client.ts       # Central Supabase client initialization script
```

---

## 3. Setup and Installation Instructions

To run this project locally, ensure you have Node.js (v18 or higher) installed on your system.

### Step 1: Clone and Prepare Directory
Extract the codebase package into your workspace and open your terminal inside the project root folder.

### Step 2: Configure Environment Variables
Create a file named `.env.local` in the root directory and append your specific database credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anonymous_api_key
```

### Step 3: Install Dependencies
Execute the installation command using the legacy peer dependency flag to ensure seamless compilation across modern UI library variations:
```bash
npm install --legacy-peer-deps
```

### Step 4: Launch Local Development Server
Boot the local engine. The terminal will provide a local address (typically http://localhost:5173):
```bash
npm run dev
```

### Step 5: Build for Production
To compile and optimize the production bundle into the static `/dist` directory for web hosting environments (such as Render):
```bash
npm run build
```

---

## 4. Architectural Assumptions Made

During development, several strategic engineering decisions were made to streamline the system layout and ensure robust performance under high evaluator testing volumes:

* Client-Side Integrity: The application relies entirely on client-side state evaluation and local routing. This removes heavy server-side rendering execution overhead and prevents production deployment infrastructure configuration conflicts.
* Decoupled Database Config: The core configuration assumes database schema mutations are managed directly through the centralized cloud data provider dashboard rather than local deployment scripts, minimizing runtime asset errors.
* Strict UI Layout Interception: Security gates and profile evaluations occur immediately upon application mounting, terminating unauthenticated or unverified activity before page layouts can render.

### Database Architecture: Why Supabase?
We opted for **Supabase** over traditional backend architectures (like a custom Node server) or NoSQL alternatives (like Firebase) for several critical reasons:
* **Relational Data Integrity**: Arc Mentor Connect relies heavily on interconnected data (Users -> Profiles -> Opportunities -> Applications). Supabase provides a true PostgreSQL database, allowing us to enforce strict foreign keys, cascading deletes, and data types (like custom Enums) at the lowest level.
* **Row Level Security (RLS)**: Because this is a Client-Side SPA, we needed a way to authorize data fetching securely without a middleman server. Supabase's native RLS policies let us write security rules directly into the database (e.g., *Students can only read their own applications*, *Mentors can only delete their own opportunities*).
* **Real-time Capabilities**: As the platform scales, announcement rooms and application status updates benefit from instant WebSockets without engineering a custom Socket.io backend.
* **Built-in Authentication Edge**: Handling JWT tokens and password hashing manually introduces massive security overhead. Supabase Auth natively binds to the Postgres `auth.users` schema, automatically injecting the user's secure cryptographic identity into every database query.

---

## 5. Additional Advanced Features Implemented

Beyond standard networking features, the application includes structural enhancements designed to increase platform security and prevent spam data entry:

### Mentor Verification Gateway
To preserve the professional credibility of the platform, an automated security intercept handles incoming mentor signups:
* Pending Queue Isolation: When a new user signs up under the "Mentor" designation, their database profile default status evaluates strictly to pending.
* Automated Interface Lock: A global layout condition evaluates the profile payload immediately upon authentication. If the role equals mentor and the status is pending, the standard application dashboard is completely unmounted and replaced with a clean, secure lock screen informing the user that their credentials are currently undergoing administrator review.
* Direct Administrative Controls: Administrators can instantly upgrade accounts to approved via the database dashboard, instantly giving the mentor access to creation views without requiring any system down-time.

### Graceful Connection Timeouts
The application includes custom connection listeners. If a network interruption or configuration bottleneck stalls a cloud database query for longer than 3000ms, the initialization sequence automatically breaks the loading state loop to render proper diagnostic layouts instead of keeping the user trapped on an infinite loading icon.
