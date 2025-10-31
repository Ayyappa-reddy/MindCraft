-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE subscription_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE question_type AS ENUM ('mcq', 'coding');
CREATE TYPE attempt_status AS ENUM ('completed', 'pending');
CREATE TYPE release_mode AS ENUM ('auto', 'manual');

-- Users table (extends Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    dp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student subscriptions (many-to-many with status)
CREATE TABLE student_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subscription_id)
);

-- Topics table
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    visualization_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT,
    time_limit INTEGER NOT NULL, -- in minutes
    attempt_limit INTEGER NOT NULL DEFAULT 1,
    release_mode release_mode NOT NULL DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    type question_type NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT[], -- For MCQ
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    marks INTEGER NOT NULL DEFAULT 1,
    test_cases JSONB, -- For coding questions: [{"input": "...", "output": "..."}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attempts table
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL, -- {"questionId": {"answer": "...", "type": "mcq/coding"}}
    score FLOAT,
    status attempt_status NOT NULL DEFAULT 'completed',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requests table
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'forgot_password', 'extra_attempt', 'exam_issue', 'general_issue', 'registration_request'
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
    email TEXT, -- For unauthenticated users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_student_subscriptions_student ON student_subscriptions(student_id);
CREATE INDEX idx_student_subscriptions_subscription ON student_subscriptions(subscription_id);
CREATE INDEX idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX idx_topics_subscription ON topics(subscription_id);
CREATE INDEX idx_exams_subscription ON exams(subscription_id);
CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_attempts_exam ON attempts(exam_id);
CREATE INDEX idx_attempts_student ON attempts(student_id);
CREATE INDEX idx_requests_student ON requests(student_id);
CREATE INDEX idx_requests_status ON requests(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for subscriptions table
CREATE POLICY "Anyone can view subscriptions"
    ON subscriptions FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage subscriptions"
    ON subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for student_subscriptions table
CREATE POLICY "Students can view their own subscriptions"
    ON student_subscriptions FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Admins can view all student subscriptions"
    ON student_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Students can request subscriptions"
    ON student_subscriptions FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage student subscriptions"
    ON student_subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for topics table
CREATE POLICY "Students can view topics from approved subscriptions"
    ON topics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM student_subscriptions
            WHERE subscription_id = topics.subscription_id
            AND student_id = auth.uid()
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage topics"
    ON topics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for exams table
CREATE POLICY "Students can view exams from approved subscriptions"
    ON exams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM student_subscriptions
            WHERE subscription_id = exams.subscription_id
            AND student_id = auth.uid()
            AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage exams"
    ON exams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for questions table
CREATE POLICY "Students can view questions from attempted exams"
    ON questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts
            WHERE exam_id = questions.exam_id
            AND student_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage questions"
    ON questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for attempts table
CREATE POLICY "Students can view their own attempts"
    ON attempts FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Students can create their own attempts"
    ON attempts FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all attempts"
    ON attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for requests table
CREATE POLICY "Students can view their own requests"
    ON requests FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Students can create requests"
    ON requests FOR INSERT
    WITH CHECK (student_id = auth.uid() OR email IS NOT NULL);

CREATE POLICY "Admins can view all requests"
    ON requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update requests"
    ON requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

