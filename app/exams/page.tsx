'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, Search, X, Filter, SortAsc } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  attemptCount?: number
}

export default function ExamsPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string>('')
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string[]>([])
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSubscription) {
      loadExams()
      // Reset filters when changing subscription
      setSearchQuery('')
      setStatusFilter('all')
      setSortBy('recent')
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('subscription_id', selectedSubscription)
      .order('created_at', { ascending: false })

    if (!data) {
      setExams([])
      return
    }

    // Load attempt counts for each exam
    const examsWithAttempts = await Promise.all(
      data.map(async (exam) => {
        const { count } = await supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('student_id', user.id)

        return {
          ...exam,
          attemptCount: count || 0,
        }
      })
    )

    // Show all exams - visibility is not restricted by schedule
    // Schedule only controls when students can attempt exams
    setExams(examsWithAttempts)
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

  const getExamAvailability = (exam: Exam) => {
    const now = new Date()
    
    // Check if before start time
    if (exam.scheduled_start) {
      const startTime = new Date(exam.scheduled_start)
      if (now < startTime) {
        return {
          available: false,
          reason: 'Exam not yet started',
          deadline: startTime
        }
      }
    }
    
    // Check if after deadline
    if (exam.scheduled_end) {
      const endTime = new Date(exam.scheduled_end)
      if (now > endTime) {
        return {
          available: false,
          reason: 'Exam deadline has passed',
          deadline: endTime
        }
      }
    }
    
    return { available: true }
  }

  const selectedSub = subscriptions.find(s => s.id === selectedSubscription)

  // Filter and sort exams
  const getFilteredAndSortedExams = () => {
    let filtered = [...exams]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(exam =>
        exam.title.toLowerCase().includes(query) ||
        exam.topic?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(exam => {
        const availability = getExamAvailability(exam)
        const now = new Date()

        switch (statusFilter) {
          case 'available':
            return availability.available
          case 'upcoming':
            return exam.scheduled_start && new Date(exam.scheduled_start) > now
          case 'past':
            return exam.scheduled_end && new Date(exam.scheduled_end) < now
          case 'attempted':
            return (exam.attemptCount || 0) > 0
          case 'not_attempted':
            return (exam.attemptCount || 0) === 0
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'deadline':
          // Sort by scheduled_end, nulls last
          if (!a.scheduled_end && !b.scheduled_end) return 0
          if (!a.scheduled_end) return 1
          if (!b.scheduled_end) return -1
          return new Date(a.scheduled_end).getTime() - new Date(b.scheduled_end).getTime()
        case 'time':
          return a.time_limit - b.time_limit
        case 'recent':
        default:
          // Already sorted by created_at DESC from database
          return 0
      }
    })

    return filtered
  }

  const filteredExams = getFilteredAndSortedExams()

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
            
            {/* Search and Filter Section */}
            {selectedSub.status === 'approved' && exams.length > 0 && (
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search exams by title or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filter and Sort */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all">All Exams</SelectItem>
                        <SelectItem value="attempted">Attempted</SelectItem>
                        <SelectItem value="not_attempted">Not Attempted</SelectItem>
                        <SelectItem value="available">Available Now</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past Deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full">
                        <SortAsc className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="deadline">By Deadline</SelectItem>
                        <SelectItem value="title">By Title (A-Z)</SelectItem>
                        <SelectItem value="time">By Duration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Results Count */}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredExams.length} of {exams.length} exam{exams.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

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
            ) : filteredExams.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="mb-2 font-semibold">No exams found</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setSortBy('recent')
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredExams.map((exam) => {
                  const availability = getExamAvailability(exam)
                  return (
                    <Card key={exam.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle>{exam.title}</CardTitle>
                              {(exam.attemptCount || 0) > 0 && (
                                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 text-xs font-medium">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Attempted</span>
                                </span>
                              )}
                            </div>
                            {exam.topic && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Topic: {exam.topic}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => router.push(`/exams/${exam.id}/details`)}
                          >
                            View Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{exam.time_limit} minutes</span>
                          </div>
                          <div>
                            <span>{exam.attempt_limit} attempt{exam.attempt_limit !== 1 ? 's' : ''}</span>
                          </div>
                          {(exam.attemptCount || 0) > 0 && (
                            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle className="h-4 w-4" />
                              <span>{exam.attemptCount} attempt{(exam.attemptCount || 0) !== 1 ? 's' : ''} completed</span>
                            </div>
                          )}
                        </div>
                        {!availability.available && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                              {availability.reason}
                            </p>
                            {availability.deadline && (
                              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                {exam.scheduled_start && availability.reason.includes('not yet') 
                                  ? `Starts: ${format(availability.deadline, 'PPpp')}`
                                  : `Deadline: ${format(availability.deadline, 'PPpp')}`}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
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

