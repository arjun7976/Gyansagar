# GyanSagar Test System

A scalable online quiz and test-management foundation for a coaching institute. Phase 1 provides the project setup, a responsive landing page, database schemas, and safe API health checks. Admin workflows, student test-taking, results UI, authentication, and Excel import are intentionally deferred.

## Requirements

- Node.js 20.9 or later
- npm 10 or later
- A MongoDB Atlas cluster (only required for database features)

## Installation

```bash
git clone <your-github-repository-url>
cd gyansagar-test-system
npm install
```

## Environment variables

Copy `.env.example` to `.env.local`, then add your actual Atlas connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/gyansagar-test-system?retryWrites=true&w=majority
```

Never commit `.env.local`; it is already included in `.gitignore`. No credentials are stored in this repository.

## MongoDB Atlas setup

1. Create a MongoDB Atlas project and free/shared cluster.
2. Create a database user with a strong password.
3. Add your development IP address under **Network Access**.
4. Choose **Connect > Drivers**, copy the Node.js URI, and put it in `.env.local` as `MONGODB_URI`.
5. Replace the placeholder password and database name as appropriate.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the homepage and [http://localhost:3000/api/health](http://localhost:3000/api/health) for the API health response.

The optional [http://localhost:3000/api/db-status](http://localhost:3000/api/db-status) endpoint validates the database connection. It returns `503` with a generic message if `MONGODB_URI` is missing or MongoDB cannot be reached; it never returns credentials.

## Project structure

```text
gyansagar-test-system/
├── app/
│   ├── api/
│   │   ├── health/route.js       # Public application health check
│   │   └── db-status/route.js    # Safe MongoDB connectivity check
│   ├── globals.css               # Global Tailwind styles
│   ├── layout.js                 # Root metadata and document shell
│   └── page.js                   # Responsive homepage
├── components/
│   ├── Header.js                 # Reusable site navigation
│   └── LoginCard.js              # Reusable placeholder login card
├── lib/
│   └── mongodb.js                # Cached Mongoose connection helper
├── models/
│   ├── User.js                   # Admin/student identity schema
│   ├── Test.js                   # Test metadata and marking settings
│   ├── Question.js               # Four-option MCQ schema
│   └── Result.js                 # Student test attempt summary
├── .env.example                  # Safe environment-variable template
├── .gitignore                    # Ignores secrets and generated files
├── postcss.config.mjs            # Tailwind/PostCSS configuration
└── package.json
```

## Phase 1 features

- Next.js App Router with JavaScript and Tailwind CSS
- Responsive, professional GyanSagar landing page
- Placeholder Student Login and Admin Login routes ready for Phase 2
- Reusable UI components
- Mongoose schemas for User, Test, Question, and Result
- Reusable cached MongoDB connection helper
- `/api/health` API endpoint
- `/api/db-status` endpoint with generic, safe failure responses
- Environment and secret handling through `.env.local`

## Future phases

- Authentication and role-based authorization
- Admin dashboard and test/question management
- Student test-taking interface, timer, and attempt storage
- Result calculation, rankings, and analytics
- Excel question import and validation

## Useful commands

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Phase 2: Admin authentication

Phase 2 adds an administrator-only control area at `/admin`. Authentication uses a signed HTTP-only cookie; the password remains hashed in MongoDB and is never returned by an API.

Add the following values to `.env.local` before creating the first administrator:

```env
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=a_random_secret_with_at_least_32_characters
ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a_strong_password_with_at_least_12_characters
```

Generate a secure `AUTH_SECRET` with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the initial admin account once:

```bash
npm run seed:admin
```

The seed command does not overwrite an existing account with the same email. Start development with `npm run dev`, then visit [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

Protected endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/dashboard`

Only an active user with the `admin` role can use the protected dashboard pages or admin dashboard API.
