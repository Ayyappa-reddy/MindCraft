'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'admin' | 'student' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole((data?.role as any) || null)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">MindCraft</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" onClick={() => router.push(role === 'admin' ? '/admin' : '/dashboard')}>
                    Dashboard
                  </Button>
                  <Button variant="outline" onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    router.push('/login')
                  }}>
                    Logout
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">Login</Button>
                  </Link>
                  <Link href="/register-request">
                    <Button>Request Registration</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to MindCraft
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your comprehensive online learning and examination platform
          </p>
          {!user && (
            <div className="flex justify-center space-x-4">
              <Link href="/login">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="/register-request">
                <Button size="lg" variant="outline">Request Account</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Learn Anywhere</CardTitle>
              <CardDescription>
                Access comprehensive learning materials with interactive visualizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Study topics at your own pace with detailed explanations and visual aids.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exam Platform</CardTitle>
              <CardDescription>
                Take exams with automatic evaluation and instant feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Test your knowledge with MCQ and coding questions with detailed results.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Track Progress</CardTitle>
              <CardDescription>
                Monitor your performance and improve over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                View your attempts, scores, and subscription status all in one place.
              </p>
            </CardContent>
          </Card>
        </div>

        {user && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="flex justify-center space-x-4">
              {role === 'admin' ? (
                <>
                  <Link href="/admin">
                    <Button variant="outline">Admin Dashboard</Button>
                  </Link>
                  <Link href="/admin/students">
                    <Button variant="outline">Manage Students</Button>
                  </Link>
                  <Link href="/admin/exams">
                    <Button variant="outline">Manage Exams</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/learn">
                    <Button variant="outline">Learn</Button>
                  </Link>
                  <Link href="/exams">
                    <Button variant="outline">Take Exam</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">My Dashboard</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
