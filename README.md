# MindCraft - Online Learning & Exam Platform

A comprehensive full-stack online learning and examination platform built with Next.js, Supabase, and TypeScript.

## Features

### Admin Features
- **Student Management**: Add, edit, delete students and reset passwords
- **Subscription Management**: Create and manage learning subscriptions
- **Teaching Tools**: Create topics with explanations and visualization links
- **Exam Management**: Build exams with MCQ and coding questions
- **Request Management**: Handle student requests (password resets, extra attempts, etc.)
- **Result Management**: Release or withhold exam results

### Student Features
- **Learning**: Access topics under approved subscriptions
- **Exams**: Attempt exams with timer and attempt limits
- **Results**: View detailed results with explanations (when released)
- **Dashboard**: Track attempts, scores, and subscriptions
- **Profile Management**: Update name, display picture, and password
- **Requests**: Submit requests for help or additional attempts

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Code Execution**: Judge0 API
- **Styling**: Tailwind CSS, ShadCN UI
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- A Supabase account
- Judge0 API access (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MindCraft
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JUDGE0_API_ENDPOINT=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key
```

4. Set up Supabase database:
- Create a new project on Supabase
- Run the migration file `supabase/migrations/001_initial_schema.sql` in the SQL Editor
- Create an admin user with email `admin@mindcraft.app`
- Update the user's role to `admin` in the users table

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Detailed Setup

See [SETUP.md](./SETUP.md) for comprehensive setup instructions.

## Project Structure

```
MindCraft/
├── app/
│   ├── admin/          # Admin panel pages
│   │   ├── students/   # Student management
│   │   ├── teach/      # Topic management
│   │   ├── exams/      # Exam management
│   │   ├── requests/   # Request handling
│   │   └── settings/   # Admin settings
│   ├── api/            # API routes
│   ├── login/          # Login page
│   ├── report/         # Request/report page
│   └── register-request/ # Registration request
├── components/
│   └── ui/             # ShadCN UI components
├── lib/
│   ├── supabase/       # Supabase clients
│   └── auth.ts         # Auth helpers
├── supabase/
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

## Usage

### Admin Login
- Email: `admin@mindcraft.app`
- Password: (set during setup)

### Creating Students
1. Go to Admin Panel → Students
2. Click "Add Student"
3. Enter student email, name, and initial password
4. Student can change password after first login

### Creating Exams
1. Go to Admin Panel → Exams
2. Create a subscription
3. Add exams to the subscription
4. Add MCQ or coding questions to each exam
5. Set time limits and attempt limits
6. Choose release mode (auto or manual)

### Student Workflow
1. Student logs in with provided credentials
2. Subscribes to available subscriptions
3. Admin approves subscription
4. Student can access topics and take exams
5. View results (when released by admin)

## Key Features in Detail

### Exam System
- **MCQ Questions**: Multiple choice with 4+ options
- **Coding Questions**: Code execution via Judge0 API
- **Timer**: Automatic submission when time expires
- **Attempt Limits**: Configurable per exam
- **Result Release**: Immediate or manual by admin

### Security
- Row Level Security (RLS) policies in Supabase
- Role-based access control (Admin vs Student)
- Protected routes with middleware
- Secure authentication via Supabase Auth

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is for educational purposes.

## Support

For issues and questions, please open an issue on the repository.
