'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Subscription {
  id: string
  name: string
  description: string
  status?: string
  exam_count?: number
}

interface Exam {
  id: string
  title: string
  topic?: string
  time_limit: number
  attempt_limit: number
  scheduled_start?: string | null
  scheduled_end?: string | null
}

export default function ExamsPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string>('')
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSubscription) {
      loadExams()
    }
  }, [selectedSubscription])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Load all subscriptions
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .order('name')

    // Load student's subscriptions
    const { data: studentSubs } = await supabase
      .from('student_subscriptions')
      .select('subscription_id, status')
      .eq('student_id', user.id)

    if (allSubs && studentSubs) {
      const subsWithStatus = allSubs.map((sub: any) => {
        const studentSub = studentSubs.find(ss => ss.subscription_id === sub.id)
        return {
          ...sub,
          status: studentSub?.status || 'not_subscribed',
          exam_count: 0, // Will be loaded separately
        }
      })

      // Load exam counts
      const subsWithExamCounts = await Promise.all(
        subsWithStatus.map(async (sub) => {
          const { count } = await supabase
            .from('exams')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_id', sub.id)
          return { ...sub, exam_count: count || 0 }
        })
      )

      setSubscriptions(subsWithExamCounts)
      if (subsWithExamCounts.length > 0 && !selectedSubscription) {
        setSelectedSubscription(subsWithExamCounts[0].id)
      }
    }
    setLoading(false)
  }

  async function loadExams() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('subscription_id', selectedSubscription)
      .order('created_at', { ascending: false })

    if (!data) {
      setExams([])
      return
    }

    // Filter based on schedule: only show exams that are available now
    const now = new Date()
    const availableExams = data.filter(exam => {
      // If exam has no schedule, it's always available
      if (!exam.scheduled_start && !exam.scheduled_end) return true
      
      // Check if current time is after scheduled_start
      if (exam.scheduled_start) {
        const startTime = new Date(exam.scheduled_start)
        if (now < startTime) return false // Not yet available
      }
      
      // Check if current time is before scheduled_end
      if (exam.scheduled_end) {
        const endTime = new Date(exam.scheduled_end)
        if (now > endTime) return false // Already ended
      }
      
      return true
    })

    setExams(availableExams)
  }

  async function handleSubscribe(subscriptionId: string) {
    setSubscribing([...subscribing, subscriptionId])

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id: user.id,
        subscription_id: subscriptionId,
        status: 'pending',
      })

    setSubscribing(subscribing.filter(id => id !== subscriptionId))

    if (error) {
      alert(error.message)
      return
    }

    alert('Subscription request submitted. Waiting for admin approval.')
    loadData()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>Approved</span>
        </span>
      case 'pending':
        return <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">Pending</span>
      case 'denied':
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center space-x-1">
          <XCircle className="h-3 w-3" />
          <span>Denied</span>
        </span>
      default:
        return null
    }
  }

  const selectedSub = subscriptions.find(s => s.id === selectedSubscription)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              <a href="/learn" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Learn</a>
              <a href="/exams" className="text-blue-600 font-medium">Exams</a>
              <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
              <a href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Profile</a>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Exams</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {subscriptions.map((sub) => (
            <Card
              key={sub.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow ${selectedSubscription === sub.id ? 'border-blue-500' : ''}`}
              onClick={() => setSelectedSubscription(sub.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{sub.name}</CardTitle>
                  {getStatusBadge(sub.status!)}
                </div>
                <CardDescription>{sub.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {sub.exam_count} exam{sub.exam_count !== 1 ? 's' : ''}
                  </span>
                  {sub.status === 'not_subscribed' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubscribe(sub.id)
                      }}
                      disabled={subscribing.includes(sub.id)}
                    >
                      {subscribing.includes(sub.id) ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedSubscription && selectedSub && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">{selectedSub.name} - Available Exams</h2>
            {selectedSub.status !== 'approved' ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="mb-4">
                    {selectedSub.status === 'pending' && 'Your subscription request is pending approval.'}
                    {selectedSub.status === 'not_subscribed' && 'Please subscribe to access exams.'}
                    {selectedSub.status === 'denied' && 'Your subscription request was denied.'}
                  </p>
                  {selectedSub.status === 'not_subscribed' && (
                    <Button onClick={() => handleSubscribe(selectedSubscription)} disabled={subscribing.includes(selectedSubscription)}>
                      Subscribe Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : exams.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No exams available in this subscription yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {exams.map((exam) => (
                  <Card key={exam.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{exam.title}</CardTitle>
                          {exam.topic && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Topic: {exam.topic}</p>
                          )}
                        </div>
                        <Button onClick={() => router.push(`/exams/${exam.id}/details`)}>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{exam.time_limit} minutes</span>
                        </div>
                        <div>
                          <span>{exam.attempt_limit} attempt{exam.attempt_limit !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {subscriptions.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p>No subscriptions available yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

