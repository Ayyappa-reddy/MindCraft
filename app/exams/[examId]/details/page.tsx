'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, FileText, TrendingUp, Trophy, AlertCircle, CheckCircle, RefreshCw, BarChart3, Eye, ArrowRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Exam {
  id: string
  title: string
  topic?: string
  time_limit: number
  attempt_limit: number
  release_mode: string
  subscription_id: string
  scheduled_start?: string | null
  scheduled_end?: string | null
}

interface Attempt {
  id: string
  score: number
  released: boolean
  submitted_at: string
}

export default function ExamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string

  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [stats, setStats] = useState({
    average: 0,
    highest: 0,
    lowest: 0,
    highestAttemptId: null as string | null,
  })
  const [loading, setLoading] = useState(true)
  const [extraAttempts, setExtraAttempts] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Load exam
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (!examData) {
      alert('Exam not found')
      router.push('/exams')
      return
    }

    setExam(examData)

    // Load attempts
    const { data: attemptsData } = await supabase
      .from('attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })

    setAttempts(attemptsData || [])
    setAttemptCount(attemptsData?.length || 0)

    // Load extra attempts
    const { data: studentLimit } = await supabase
      .from('student_attempt_limits')
      .select('extra_attempts')
      .eq('student_id', user.id)
      .eq('exam_id', examId)
      .single()

    setExtraAttempts(studentLimit?.extra_attempts || 0)

    // Calculate stats (only from released attempts)
    const releasedAttempts = attemptsData?.filter(a => a.released) || []
    if (releasedAttempts.length > 0) {
      const scores = releasedAttempts.map(a => a.score)
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const highest = Math.max(...scores)
      const lowest = Math.min(...scores)
      const highestAttempt = releasedAttempts.find(a => a.score === highest)

      setStats({
        average: avg,
        highest,
        lowest,
        highestAttemptId: highestAttempt?.id || null,
      })
    }

    setLoading(false)
  }

  const handleRequestExtraAttempt = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !exam) return

    const { error } = await supabase
      .from('requests')
      .insert({
        student_id: user.id,
        subscription_id: exam.subscription_id,
        type: 'extra_attempt',
        message: `Request for extra attempt for exam: ${exam.title}`,
      })

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    alert('Request submitted! Admin will review and respond soon.')
  }

  const handleStartExam = () => {
    router.push(`/exams/${examId}/instructions`)
  }

  const handleViewAttempt = (attemptId: string) => {
    router.push(`/exams/${examId}/results/${attemptId}`)
  }

  const totalAttemptLimit = exam ? exam.attempt_limit + extraAttempts : 0
  const canTakeExam = attemptCount < totalAttemptLimit

  // Check if exam is within scheduled time
  const getExamAvailability = () => {
    if (!exam) return { available: true, reason: '' }
    const now = new Date()
    
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
    
    return { available: true, reason: '' }
  }

  const availability = getExamAvailability()
  const canAttemptNow = canTakeExam && availability.available

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  if (!exam) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              <a href="/learn" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Learn</a>
              <a href="/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
              <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
              <a href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Profile</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
          {exam.topic && (
            <p className="text-gray-600 dark:text-gray-400">Topic: {exam.topic}</p>
          )}
        </div>

        {/* Stats Cards */}
        {attempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attemptCount}/{totalAttemptLimit}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.average > 0 ? stats.average.toFixed(1) : '--'}%</div>
              </CardContent>
            </Card>

            <Card 
              className={stats.highestAttemptId ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
              onClick={() => stats.highestAttemptId && handleViewAttempt(stats.highestAttemptId)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.highest > 0 ? stats.highest.toFixed(1) : '--'}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lowest > 0 ? stats.lowest.toFixed(1) : '--'}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Exam Details</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{exam.time_limit} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>{attemptCount}/{totalAttemptLimit} attempts used</span>
                  </div>
                  {exam.scheduled_start && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Starts: {format(new Date(exam.scheduled_start), 'PPpp')}</span>
                    </div>
                  )}
                  {exam.scheduled_end && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Deadline: {format(new Date(exam.scheduled_end), 'PPpp')}</span>
                    </div>
                  )}
                  {exam.release_mode === 'auto' && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Results released immediately</span>
                    </div>
                  )}
                  {exam.release_mode === 'manual' && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span>Results released by admin</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-4">
                {canAttemptNow ? (
                  <Button size="lg" onClick={handleStartExam}>
                    {attemptCount === 0 ? 'Take Exam' : 'Retake Exam'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : !availability.available ? (
                  <div className="flex flex-col items-end space-y-2">
                    <Button size="lg" variant="outline" disabled>
                      {attemptCount === 0 ? 'Take Exam' : 'Retake Exam'}
                    </Button>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {availability.reason}
                    </span>
                  </div>
                ) : (
                  <Button size="lg" variant="outline" onClick={handleRequestExtraAttempt}>
                    Request Extra Attempt
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attempts List */}
        {attempts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">All Attempts</h2>
            <div className="space-y-4">
              {attempts.map((attempt, idx) => (
                <Card key={attempt.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Attempt #{attempts.length - idx}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(attempt.submitted_at).toLocaleString()}
                        </p>
                        <div className="mt-2 flex items-center space-x-2">
                          {attempt.released ? (
                            <span className="text-lg font-bold text-blue-600">
                              {attempt.score.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-lg font-bold text-gray-400">--%</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            attempt.released ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {attempt.released ? 'Released' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      {attempt.released && (
                        <Button variant="outline" onClick={() => handleViewAttempt(attempt.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Results
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {attempts.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="mb-4">No attempts yet</p>
              {canAttemptNow ? (
                <Button onClick={handleStartExam}>
                  Take Exam
                </Button>
              ) : !availability.available ? (
                <div>
                  <Button disabled>
                    Take Exam
                  </Button>
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {availability.reason}
                  </p>
                </div>
              ) : (
                <Button variant="outline" onClick={handleRequestExtraAttempt}>
                  Request Extra Attempt
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

