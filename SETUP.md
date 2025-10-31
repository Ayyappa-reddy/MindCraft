# MindCraft Platform Setup Guide

## Prerequisites

- Node.js 20.9.0 or higher (required for Next.js 16)
- npm or yarn
- A Supabase account
- Judge0 API access (free tier or self-hosted)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2.2 Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Server-side admin (required for admin to create/reset users in-app)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.3 Run Database Migrations

1. In Supabase Dashboard, go to SQL Editor
2. Run migrations in this exact order:
   - Open `supabase/migrations/001_initial_schema.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/002_extend_users_and_policies.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/003_fix_rls_circular_reference.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/004_fix_student_subscriptions_rls.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/005_fix_questions_rls.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/006_add_released_to_attempts.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/007_add_student_attempt_limits.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/008_add_attempts_admin_update.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/009_dashboard_enhancements.sql`, copy and paste, click "Run"
   - Open `supabase/migrations/010_add_violations_to_attempts.sql`, copy and paste, click "Run"
3. Verify all migrations ran successfully (check for errors in the SQL Editor console)

### 2.4 Create Admin User

1. In Supabase Dashboard, go to Authentication > Users
2. Click "Add user" → "Create new user"
3. Set:
   - Email: `admin@mindcraft.app`
   - Password: (choose a secure password)
   - Auto Confirm User: Yes
4. After creating, go to Table Editor > `users` table
5. Find the user with email `admin@mindcraft.app`
6. Update the `role` field to `admin`
7. Set the `name` field (e.g., "Admin User")

## Step 3: Configure Supabase Storage (Optional)

If you want to upload display pictures:

1. Go to Storage in Supabase Dashboard
2. Create a bucket named `avatars`
3. Set it to public
4. Add a storage policy for authenticated users

## Step 4: Set Up Judge0 for Code Execution

### Option A: Use Judge0 Cloud (Free Tier)

1. Sign up at [judge0.com](https://judge0.com) or use the free endpoint
2. Note down your API endpoint and RapidAPI key (if using RapidAPI)

Add to `.env.local`:
```env
JUDGE0_API_ENDPOINT=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key
```

### Option B: Self-Host Judge0

1. Follow the [Judge0 documentation](https://github.com/judge0/judge0) to set up your own instance
2. Update the endpoint in your environment variables

## Step 5: Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Step 6: Login

- Admin: `admin@mindcraft.app` (use the password you set)
- Students: Create them through the admin panel

## Troubleshooting

### Node Version Issues

If you see engine warnings, upgrade Node.js:
```bash
# Using nvm
nvm install 20
nvm use 20
```

### Database Connection Issues

- Verify your Supabase URL and keys are correct
- Check that migrations ran successfully
- Ensure RLS policies are active

### Authentication Issues

- Clear browser cookies
- Check that admin user has `role = 'admin'` in the users table
- Verify Supabase auth is enabled in your project

## Project Structure

```
MindCraft/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── login/             # Auth pages
│   └── page.tsx           # Landing page
├── components/            # React components
│   └── ui/                # ShadCN UI components
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase clients
│   └── auth.ts            # Auth helpers
├── supabase/
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## Next Steps

1. Login as admin
2. Create your first subscription
3. Add students through the admin panel
4. Create topics and exams
5. Students can subscribe and attempt exams

