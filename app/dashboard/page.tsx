'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TrendingUp, BookOpen, Eye, Calendar, Clock, Sparkles, Trophy } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, formatDistanceToNow } from 'date-fns'

interface Attempt {
  id: string
  exam_id: string
  score: number
  submitted_at: string
  released: boolean
  exams: { title: string, id: string }
}

interface Subscription {
  id: string
  name: string
  status: string
  _count: { exams: number }
}

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  created_at: string
}

interface MotivationalQuote {
  id: string
  quote: string
  author: string | null
}

interface Exam {
  id: string
  title: string
  scheduled_start: string | null
}

interface ChartDataPoint {
  name: string
  score: number
  date: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuote | null>(null)
  const [user, setUser] = useState<any>(null)
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([])
  const [stats, setStats] = useState({
    modulesCompleted: 0,
    averageScore: 0,
    activeExams: 0,
  })
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/login')
      return
    }

    // Load user profile
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    setUser(userData)

    // Load all attempts
    const { data: allAttemptsData } = await supabase
      .from('attempts')
      .select(`
        *,
        exams:exam_id (id, title)
      `)
      .eq('student_id', authUser.id)
      .order('submitted_at', { ascending: false })

    // Load subscriptions
    const { data: subsData } = await supabase
      .from('student_subscriptions')
      .select(`
        *,
        subscriptions:subscription_id (id, name)
      `)
      .eq('student_id', authUser.id)

    if (subsData) {
      const subsWithCounts = await Promise.all(
        subsData.map(async (sub: any) => {
          const { count } = await supabase
            .from('exams')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_id', sub.subscription_id)
          return {
            ...sub.subscriptions,
            status: sub.status,
            _count: { exams: count || 0 }
          }
        })
      )
      setSubscriptions(subsWithCounts)
    }

    setAttempts((allAttemptsData as any) || [])

    // Load announcements
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(7)
    
    setAnnouncements(announcementsData || [])

    // Load random motivational quote
    const { data: quotesData } = await supabase
      .from('motivational_quotes')
      .select('*')
    
    if (quotesData && quotesData.length > 0) {
      const randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)]
      setMotivationalQuote(randomQuote)
    }

    // Calculate stats
    const releasedAttempts = (allAttemptsData || []).filter((a: any) => a.released)
    
    // Get unique exam IDs from released attempts
    const examIds = [...new Set(releasedAttempts.map((a: any) => a.exam_id))]
    const modulesCompleted = examIds.length
    
    // Calculate average from highest scores per exam
    let totalHighestScores = 0
    examIds.forEach(examId => {
      const examAttempts = releasedAttempts.filter((a: any) => a.exam_id === examId)
      const maxScore = Math.max(...examAttempts.map((a: any) => a.score))
      totalHighestScores += maxScore
    })
    const averageScore = modulesCompleted > 0 ? totalHighestScores / modulesCompleted : 0

    // Load upcoming exams
    const approvedSubIds = subsData?.filter((s: any) => s.status === 'approved').map((s: any) => s.subscription_id) || []
    const now = new Date().toISOString()
    
    const { data: upcomingData } = await supabase
      .from('exams')
      .select('id, title, scheduled_start')
      .in('subscription_id', approvedSubIds)
      .gt('scheduled_start', now)
      .order('scheduled_start', { ascending: true })
      .limit(5)

    setUpcomingExams(upcomingData || [])

    // Calculate active exams (exams student hasn't attempted yet + upcoming scheduled)
    const attemptedExamIds = new Set((allAttemptsData || []).map((a: any) => a.exam_id))
    
    const { data: allExamsData } = await supabase
      .from('exams')
      .select('id, scheduled_start')
      .in('subscription_id', approvedSubIds)
    
    const unAttemptedExams = (allExamsData || []).filter(exam => !attemptedExamIds.has(exam.id))
    const activeExams = unAttemptedExams.length + (upcomingData?.length || 0)

    setStats({
      modulesCompleted,
      averageScore,
      activeExams,
    })

    // Prepare chart data (highest scores per exam)
    const chartDataPoints: ChartDataPoint[] = []
    examIds.forEach(examId => {
      const examAttempts = releasedAttempts.filter((a: any) => a.exam_id === examId)
      const maxScoreAttempt = examAttempts.reduce((max, a) => (a.score > max.score ? a : max), examAttempts[0])
      if (maxScoreAttempt) {
        const exam = allAttemptsData?.find((a: any) => a.exam_id === examId && a.released)
        chartDataPoints.push({
          name: exam?.exams?.title?.substring(0, 15) || 'Exam',
          score: maxScoreAttempt.score,
          date: maxScoreAttempt.submitted_at,
        })
      }
    })
    // Sort by date and limit to last 6
    chartDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setChartData(chartDataPoints.slice(-6))

    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'Student'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              <a href="/learn" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Learn</a>
              <a href="/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
              <a href="/dashboard" className="text-blue-600 font-medium">Dashboard</a>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Hey, {firstName} 👋</h1>
              <p className="text-gray-600 dark:text-gray-400">Ready to conquer learning today?</p>
            </div>
            {motivationalQuote && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 max-w-md">
                <CardContent className="p-4">
                  <p className="text-sm italic text-gray-700">"{motivationalQuote.quote}"</p>
                  {motivationalQuote.author && (
                    <p className="text-xs text-gray-600 mt-2">— {motivationalQuote.author}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Progress Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">🧮 Total Modules Completed</CardTitle>
              <Trophy className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-800">{stats.modulesCompleted}</div>
              <p className="text-xs text-purple-600">Exams completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">🧠 Average Quiz Score</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">{stats.averageScore.toFixed(1)}%</div>
              <p className="text-xs text-green-600">Overall performance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">⏳ Active Exams</CardTitle>
              <Clock className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800">{stats.activeExams}</div>
              <p className="text-xs text-orange-600">Available for you</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Exams Widget */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>📅 Your Next Tasks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingExams.length === 0 ? (
              <p className="text-gray-600">No upcoming exams scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{exam.title}</p>
                      {exam.scheduled_start && (
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(exam.scheduled_start), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {exam.scheduled_start && (
                      <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                        {format(new Date(exam.scheduled_start), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Quiz Scores (Last 6 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-600">
                No exam scores to display yet. Start attempting exams!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Announcements / News Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Announcements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-gray-600">No announcements yet.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="flex items-start space-x-3 p-4 border-b last:border-0">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      announcement.type === 'auto' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{announcement.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

