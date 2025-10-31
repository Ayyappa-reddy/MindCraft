'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReportPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [type, setType] = useState('forgot_password')
  const [email, setEmail] = useState('')
  const [communicationEmail, setCommunicationEmail] = useState('')
  const [subscriptionId, setSubscriptionId] = useState('')
  const [examId, setExamId] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setUser(user)

      if (user) {
        // Load student subscriptions
        const { data } = await supabase
          .from('student_subscriptions')
          .select('subscription_id, subscriptions(*)')
          .eq('student_id', user.id)
          .eq('status', 'approved')
        
        if (data) {
          setSubscriptions(data.map((item: any) => item.subscriptions).filter(Boolean))
        }
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (subscriptionId) {
      loadExams()
    }
  }, [subscriptionId])

  async function loadExams() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('subscription_id', subscriptionId)
    
    if (data) {
      setExams(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      const requestData: any = {
        type,
        message,
        status: 'pending'
      }

      if (isAuthenticated && user) {
        requestData.student_id = user.id
        if (subscriptionId) {
          requestData.subscription_id = subscriptionId
        }
      } else {
        requestData.email = communicationEmail
        requestData.message = `Email: ${email}\nCommunication Email: ${communicationEmail}\nMessage: ${message}`
      }

      const { error: reqError } = await supabase
        .from('requests')
        .insert(requestData)

      if (reqError) {
        setError(reqError.message)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        if (isAuthenticated) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      }, 3000)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Request Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Your request has been submitted. The admin will review it and get back to you shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {isAuthenticated ? 'Report Issue / Request Help' : 'Forgot Password / Report Issue'}
            </CardTitle>
            <CardDescription className="text-center">
              {isAuthenticated 
                ? 'Submit a request for help or report an issue'
                : 'Submit a request for password reset or report an issue'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isAuthenticated && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Your Email on Platform</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@student.mindcraft.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="communicationEmail">Communication Email</Label>
                    <Input
                      id="communicationEmail"
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={communicationEmail}
                      onChange={(e) => setCommunicationEmail(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="type">Request Type</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="forgot_password">Forgot Password</option>
                  {isAuthenticated && (
                    <>
                      <option value="extra_attempt">Request Extra Attempt</option>
                      <option value="exam_issue">Issue During Exam</option>
                      <option value="general_issue">General Issue</option>
                    </>
                  )}
                </select>
              </div>

              {isAuthenticated && type === 'extra_attempt' && subscriptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subscription">Subscription</Label>
                  <select
                    id="subscription"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={subscriptionId}
                    onChange={(e) => setSubscriptionId(e.target.value)}
                    required
                  >
                    <option value="">Select a subscription</option>
                    {subscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isAuthenticated && subscriptionId && exams.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="exam">Exam</Label>
                  <select
                    id="exam"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={examId}
                    onChange={(e) => setExamId(e.target.value)}
                  >
                    <option value="">Select an exam (optional)</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>{exam.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder={type === 'forgot_password' 
                    ? 'Please describe your issue with accessing your account...'
                    : 'Please describe your issue or request...'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href={isAuthenticated ? "/dashboard" : "/login"} className="text-sm text-blue-600 hover:underline">
                {isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

