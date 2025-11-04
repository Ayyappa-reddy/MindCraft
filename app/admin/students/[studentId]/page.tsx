'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, TrendingUp, TrendingDown, Award, FileText, BarChart3, Download, Filter, Calendar, AlertCircle, Activity, Target, BookOpen, Code, CheckCircle2, XCircle, Eye, X, Clock } from 'lucide-react'
import { LineChart as RechartsLineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Student {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  display_name?: string
  dob?: string
  phone?: string
  personal_email?: string
  created_at?: string
}

interface Attempt {
  id: string
  exam_id: string
  score: number
  status: string
  submitted_at: string
  released: boolean
  violations?: any[]
  answers?: Record<string, any>
  exam?: {
    title: string
    topic?: string
    time_limit: number
  }
}

interface DetailedAttempt extends Attempt {
  questions?: Question[]
  questionPerformance?: QuestionPerformance[]
}

interface Question {
  id: string
  type: 'mcq' | 'coding'
  question_text: string
  options?: string[]
  correct_answer: string
  marks: number
  test_cases?: any[]
}

interface QuestionPerformance {
  question_id: string
  question_type: 'mcq' | 'coding'
  is_correct: boolean
  marks_earned: number
  marks_total: number
}

interface ExamStats {
  exam_id: string
  exam_title: string
  attempts: number
  average_score: number
  best_score: number
  latest_score: number
}

interface TopicPerformance {
  topic: string
  total_attempts: number
  average_score: number
  best_score: number
  exams_count: number
}

interface TimelineEvent {
  id: string
  type: 'attempt' | 'violation'
  timestamp: string
  exam_title?: string
  score?: number
  violation_type?: string
  description: string
}

export default function StudentPerformancePage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const [student, setStudent] = useState<Student | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [detailedAttempts, setDetailedAttempts] = useState<DetailedAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 100,
    examsCompleted: 0,
    recentExams: [] as Attempt[],
  })
  
  // Interactive features state
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [selectedAttempt, setSelectedAttempt] = useState<DetailedAttempt | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showTimelineView, setShowTimelineView] = useState(false)
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null })
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedChartData, setSelectedChartData] = useState<any>(null)
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null)

  useEffect(() => {
    loadStudentData()
  }, [studentId])

  async function loadStudentData() {
    const supabase = createClient()

    // Load student info
    const { data: studentData } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (!studentData) {
      alert('Student not found')
      router.push('/admin/students')
      return
    }

    setStudent(studentData)

    // Load all attempts with exam details and violations
    const { data: attemptsData } = await supabase
      .from('attempts')
      .select(`
        *,
        exam:exams (
          title,
          topic,
          time_limit
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })

    if (attemptsData) {
      const formattedAttempts = attemptsData.map((attempt: any) => ({
        ...attempt,
        exam: attempt.exam || null,
      }))

      setAttempts(formattedAttempts)

      // Load detailed attempts with questions
      const detailedAttemptsData: DetailedAttempt[] = await Promise.all(
        formattedAttempts.map(async (attempt: any) => {
          // Load questions for this exam
          const { data: questionsData } = await supabase
            .from('questions')
            .select('*')
            .eq('exam_id', attempt.exam_id)
            .order('created_at')

          // Calculate question-level performance
          const questionPerformance: QuestionPerformance[] = []
          if (questionsData && attempt.answers) {
            questionsData.forEach((question: Question) => {
              const studentAnswer = attempt.answers[question.id]
              if (studentAnswer) {
                let isCorrect = false
                let marksEarned = 0

                if (question.type === 'mcq') {
                  isCorrect = studentAnswer.answer === question.correct_answer
                  marksEarned = isCorrect ? question.marks : 0
                } else if (question.type === 'coding') {
                  const testResults = studentAnswer.testResults
                  if (testResults && Array.isArray(testResults)) {
                    const totalTestCases = question.test_cases?.length || 0
                    if (totalTestCases > 0) {
                      const passedCount = testResults.filter((r: any) => r.passed).length
                      marksEarned = (passedCount / totalTestCases) * question.marks
                      isCorrect = passedCount === totalTestCases
                    }
                  }
                }

                questionPerformance.push({
                  question_id: question.id,
                  question_type: question.type,
                  is_correct: isCorrect,
                  marks_earned: marksEarned,
                  marks_total: question.marks,
                })
              }
            })
          }

          return {
            ...attempt,
            questions: questionsData || [],
            questionPerformance,
          }
        })
      )

      setDetailedAttempts(detailedAttemptsData)

      // Calculate topic performance
      const topicMap = new Map<string, TopicPerformance>()
      formattedAttempts.forEach((attempt: any) => {
        if (attempt.exam?.topic && attempt.released && attempt.score !== null) {
          const topic = attempt.exam.topic
          if (!topicMap.has(topic)) {
            topicMap.set(topic, {
              topic,
              total_attempts: 0,
              average_score: 0,
              best_score: 0,
              exams_count: 0,
            })
          }
          const perf = topicMap.get(topic)!
          perf.total_attempts++
          perf.average_score = (perf.average_score * (perf.total_attempts - 1) + attempt.score) / perf.total_attempts
          perf.best_score = Math.max(perf.best_score, attempt.score)
        }
      })

      // Count unique exams per topic
      const examTopicMap = new Map<string, Set<string>>()
      formattedAttempts.forEach((attempt: any) => {
        if (attempt.exam?.topic) {
          const topic = attempt.exam.topic
          if (!examTopicMap.has(topic)) {
            examTopicMap.set(topic, new Set())
          }
          examTopicMap.get(topic)!.add(attempt.exam_id)
        }
      })
      topicMap.forEach((perf, topic) => {
        perf.exams_count = examTopicMap.get(topic)?.size || 0
      })

      setTopicPerformance(Array.from(topicMap.values()))

      // Build timeline events
      const events: TimelineEvent[] = []
      formattedAttempts.forEach((attempt: any) => {
        events.push({
          id: attempt.id,
          type: 'attempt',
          timestamp: attempt.submitted_at,
          exam_title: attempt.exam?.title,
          score: attempt.released && attempt.score !== null ? attempt.score : undefined,
          description: `Attempted ${attempt.exam?.title || 'Unknown Exam'}${attempt.released && attempt.score !== null ? ` - Score: ${attempt.score.toFixed(1)}%` : ' (Pending Review)'}`,
        })

        // Add violation events
        if (attempt.violations && Array.isArray(attempt.violations)) {
          attempt.violations.forEach((violation: any, idx: number) => {
            events.push({
              id: `${attempt.id}-violation-${idx}`,
              type: 'violation',
              timestamp: violation.timestamp || attempt.submitted_at,
              exam_title: attempt.exam?.title,
              violation_type: violation.type,
              description: `Violation: ${violation.type} during ${attempt.exam?.title || 'exam'} (Count: ${violation.count || 1})`,
            })
          })
        }
      })

      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTimelineEvents(events)

      // Calculate statistics
      const releasedAttempts = formattedAttempts.filter(a => a.released && a.score !== null)
      const scores = releasedAttempts.map(a => a.score).filter(s => s !== null) as number[]

      const totalAttempts = formattedAttempts.length
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0
      const worstScore = scores.length > 0 ? Math.min(...scores) : 100
      
      // Get unique exam IDs
      const uniqueExamIds = new Set(formattedAttempts.map(a => a.exam_id))
      const examsCompleted = uniqueExamIds.size

      // Get recent 5 exams
      const recentExams = formattedAttempts.slice(0, 5)

      setStats({
        totalAttempts,
        averageScore,
        bestScore,
        worstScore,
        examsCompleted,
        recentExams,
      })
    }

    setLoading(false)
  }

  // Prepare data for score trend chart
  const getScoreTrendData = () => {
    const releasedAttempts = attempts.filter(a => a.released && a.score !== null).slice(0, 10).reverse()
    return releasedAttempts.map((attempt, index) => ({
      name: `Attempt ${index + 1}`,
      score: attempt.score,
      date: new Date(attempt.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }

  // Prepare data for exam performance chart
  const getExamPerformanceData = () => {
    const examMap = new Map<string, ExamStats>()

    attempts.forEach(attempt => {
      if (!attempt.exam || !attempt.released || attempt.score === null) return

      const examId = attempt.exam_id
      const examTitle = attempt.exam.title || 'Unknown Exam'

      if (!examMap.has(examId)) {
        examMap.set(examId, {
          exam_id: examId,
          exam_title: examTitle,
          attempts: 0,
          average_score: 0,
          best_score: 0,
          latest_score: 0,
        })
      }

      const stats = examMap.get(examId)!
      stats.attempts++
      stats.average_score = (stats.average_score * (stats.attempts - 1) + attempt.score) / stats.attempts
      stats.best_score = Math.max(stats.best_score, attempt.score)
      stats.latest_score = attempt.score
    })

    return Array.from(examMap.values())
      .sort((a, b) => b.latest_score - a.latest_score)
      .slice(0, 5)
  }

  // Prepare data for score distribution pie chart
  const getScoreDistributionData = () => {
    const releasedAttempts = attempts.filter(a => a.released && a.score !== null)
    const excellent = releasedAttempts.filter(a => a.score >= 90).length
    const good = releasedAttempts.filter(a => a.score >= 70 && a.score < 90).length
    const average = releasedAttempts.filter(a => a.score >= 50 && a.score < 70).length
    const needsImprovement = releasedAttempts.filter(a => a.score < 50).length

    return [
      { name: 'Excellent (90-100%)', value: excellent, color: '#10b981' },
      { name: 'Good (70-89%)', value: good, color: '#3b82f6' },
      { name: 'Average (50-69%)', value: average, color: '#f59e0b' },
      { name: 'Needs Improvement (<50%)', value: needsImprovement, color: '#ef4444' },
    ].filter(item => item.value > 0)
  }

  // Get filtered attempts based on current filters
  const getFilteredAttempts = () => {
    let filtered = attempts

    if (topicFilter !== 'all') {
      filtered = filtered.filter(a => a.exam?.topic === topicFilter)
    }

    if (scoreFilter !== 'all') {
      filtered = filtered.filter(a => {
        if (!a.released || a.score === null) return false
        const score = a.score
        if (scoreFilter === 'excellent') return score >= 90
        if (scoreFilter === 'good') return score >= 70 && score < 90
        if (scoreFilter === 'average') return score >= 50 && score < 70
        if (scoreFilter === 'poor') return score < 50
        return true
      })
    }

    if (dateRange.start) {
      filtered = filtered.filter(a => new Date(a.submitted_at) >= dateRange.start!)
    }

    if (dateRange.end) {
      filtered = filtered.filter(a => new Date(a.submitted_at) <= dateRange.end!)
    }

    return filtered
  }

  // Handle exam attempt click
  const handleAttemptClick = (attemptId: string) => {
    const detailed = detailedAttempts.find(a => a.id === attemptId)
    if (detailed) {
      setSelectedAttempt(detailed)
      setShowDetailModal(true)
    }
  }

  // Handle chart click
  const handleChartClick = (data: any, chartType: string) => {
    setSelectedChartData(data)
    setSelectedChartType(chartType)
  }

  // Get question breakdown for an attempt
  const getQuestionBreakdown = (attempt: DetailedAttempt) => {
    if (!attempt.questionPerformance) return { total: 0, correct: 0, incorrect: 0, unattempted: 0 }
    
    const total = attempt.questions?.length || 0
    const correct = attempt.questionPerformance.filter(q => q.is_correct).length
    const incorrect = attempt.questionPerformance.filter(q => !q.is_correct).length
    const unattempted = total - attempt.questionPerformance.length

    return { total, correct, incorrect, unattempted }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading student data...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Student not found</div>
      </div>
    )
  }

  const scoreTrendData = getScoreTrendData()
  const examPerformanceData = getExamPerformanceData()
  const scoreDistributionData = getScoreDistributionData()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/students')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {student.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{student.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedStat('average')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Across all exams
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedStat('best')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bestScore.toFixed(1)}%</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Highest achievement
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedStat('attempts')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {stats.examsCompleted} unique exams
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedStat('trend')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
              {stats.averageScore >= 70 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageScore >= 90 ? 'Excellent' : stats.averageScore >= 70 ? 'Good' : stats.averageScore >= 50 ? 'Average' : 'Needs Improvement'}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Overall performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topicPerformance.map((tp) => (
                    <SelectItem key={tp.topic} value={tp.topic}>
                      {tp.topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="excellent">Excellent (90-100%)</SelectItem>
                  <SelectItem value="good">Good (70-89%)</SelectItem>
                  <SelectItem value="average">Average (50-69%)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;50%)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTopicFilter('all')
                  setScoreFilter('all')
                  setDateRange({ start: null, end: null })
                }}
              >
                Clear Filters
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTimelineView(!showTimelineView)}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  {showTimelineView ? 'Card View' : 'Timeline View'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic Performance Section */}
        {topicPerformance.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance by Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {topicPerformance.map((tp) => (
                  <div
                    key={tp.topic}
                    onClick={() => setTopicFilter(tp.topic)}
                    className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                      topicFilter === tp.topic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{tp.topic}</h3>
                      {tp.average_score >= 70 ? (
                        <Target className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Avg: <span className="font-semibold">{tp.average_score.toFixed(1)}%</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Best: <span className="font-semibold">{tp.best_score.toFixed(1)}%</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {tp.total_attempts} attempts • {tp.exams_count} exams
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {topicPerformance.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topicPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="average_score" fill="#3b82f6" name="Average Score (%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Trend Chart */}
          {scoreTrendData.length > 0 && (
            <Card className="cursor-pointer" onClick={() => handleChartClick(scoreTrendData, 'trend')}>
              <CardHeader>
                <CardTitle>Score Trend (Last 10 Attempts)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart 
                    data={scoreTrendData}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        const attemptIndex = data.activePayload[0].payload.name.replace('Attempt ', '') - 1
                        const releasedAttempts = attempts.filter(a => a.released && a.score !== null).slice(0, 10).reverse()
                        if (releasedAttempts[attemptIndex]) {
                          handleAttemptClick(releasedAttempts[attemptIndex].id)
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      name="Score (%)"
                      dot={{ r: 5, fill: '#3b82f6', cursor: 'pointer' }}
                      activeDot={{ r: 7 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Score Distribution Pie Chart */}
          {scoreDistributionData.length > 0 && (
            <Card className="cursor-pointer" onClick={() => handleChartClick(scoreDistributionData, 'distribution')}>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={scoreDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data: any, index: number) => {
                        if (data && data.name) {
                          const scoreRange = data.name.split('(')[1]?.split(')')[0] || ''
                          if (scoreRange.includes('90-100')) setScoreFilter('excellent')
                          else if (scoreRange.includes('70-89')) setScoreFilter('good')
                          else if (scoreRange.includes('50-69')) setScoreFilter('average')
                          else if (scoreRange.includes('<50')) setScoreFilter('poor')
                          handleChartClick(data, 'distribution')
                        }
                      }}
                    >
                      {scoreDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Exam Performance Bar Chart */}
        {examPerformanceData.length > 0 && (
          <Card className="mb-8 cursor-pointer" onClick={() => handleChartClick(examPerformanceData, 'exam-performance')}>
            <CardHeader>
              <CardTitle>Top 5 Exam Performances</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={examPerformanceData}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const examId = data.activePayload[0].payload.exam_id
                      const examAttempts = attempts.filter(a => a.exam_id === examId)
                      if (examAttempts.length > 0) {
                        handleChartClick({ examId, attempts: examAttempts, examData: data.activePayload[0].payload }, 'exam-detail')
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam_title" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="latest_score" fill="#3b82f6" name="Latest Score (%)" />
                  <Bar dataKey="average_score" fill="#10b981" name="Average Score (%)" />
                  <Bar dataKey="best_score" fill="#f59e0b" name="Best Score (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Exams / Timeline View */}
        <Card>
          <CardHeader>
            <CardTitle>{showTimelineView ? 'Activity Timeline' : 'Recent Exam Attempts'}</CardTitle>
          </CardHeader>
          <CardContent>
            {showTimelineView ? (
              timelineEvents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity recorded</p>
              ) : (
                <div className="space-y-4">
                  {timelineEvents.map((event, idx) => (
                    <div
                      key={event.id}
                      className={`flex items-start space-x-4 p-4 border-l-4 rounded ${
                        event.type === 'attempt'
                          ? event.score !== undefined
                            ? event.score >= 70
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : event.score >= 50
                              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-400 bg-gray-50 dark:bg-gray-800'
                          : 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {event.type === 'attempt' ? (
                          event.score !== undefined ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-gray-500" />
                          )
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {event.type === 'attempt' && event.score !== undefined && (
                        <div className="text-lg font-bold">
                          {event.score.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              getFilteredAttempts().length === 0 ? (
                <p className="text-center text-gray-500 py-8">No exam attempts found</p>
              ) : (
                <div className="space-y-4">
                  {getFilteredAttempts().slice(0, 10).map((attempt) => (
                  <div
                    key={attempt.id}
                    onClick={() => handleAttemptClick(attempt.id)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{attempt.exam?.title || 'Unknown Exam'}</h3>
                      {attempt.exam?.topic && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Topic: {attempt.exam.topic}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(attempt.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {attempt.released && attempt.score !== null ? (
                        <>
                          <div className={`text-2xl font-bold ${attempt.score >= 70 ? 'text-green-600' : attempt.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {attempt.score.toFixed(1)}%
                          </div>
                          <p className="text-xs text-gray-500">{attempt.status}</p>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Pending Review</div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {/* Stat Detail Modals */}
        <Dialog open={selectedStat === 'average'} onOpenChange={(open) => !open && setSelectedStat(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Average Score Details</DialogTitle>
              <DialogDescription>Comprehensive breakdown of average performance</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attempts">All Attempts</TabsTrigger>
                <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Average Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Attempts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Exams Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.examsCompleted}</div>
                    </CardContent>
                  </Card>
                </div>
                {scoreDistributionData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoreDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {scoreDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </TabsContent>
              <TabsContent value="attempts" className="space-y-2">
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {attempts.filter(a => a.released && a.score !== null).map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-semibold">{attempt.exam?.title || 'Unknown Exam'}</p>
                        <p className="text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</p>
                      </div>
                      <div className="text-xl font-bold">{attempt.score?.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="trend">
                {scoreTrendData.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={scoreTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Score (%)" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button onClick={() => setSelectedStat(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={selectedStat === 'best'} onOpenChange={(open) => !open && setSelectedStat(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Best Score Details</DialogTitle>
              <DialogDescription>Details of the highest achievement</DialogDescription>
            </DialogHeader>
            {(() => {
              const bestAttempt = attempts.find(a => a.released && a.score === stats.bestScore)
              return bestAttempt ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{bestAttempt.exam?.title || 'Unknown Exam'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><strong>Score:</strong> {stats.bestScore.toFixed(1)}%</p>
                      <p><strong>Topic:</strong> {bestAttempt.exam?.topic || 'N/A'}</p>
                      <p><strong>Submitted:</strong> {new Date(bestAttempt.submitted_at).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        handleAttemptClick(bestAttempt.id)
                        setSelectedStat(null)
                      }}
                    >
                      View Full Results
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedStat(null)}>Close</Button>
                  </div>
                </div>
              ) : (
                <p>No best attempt found</p>
              )
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={selectedStat === 'attempts'} onOpenChange={(open) => !open && setSelectedStat(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>All Attempts History</DialogTitle>
              <DialogDescription>Complete attempt history with filters</DialogDescription>
            </DialogHeader>
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {attempts.map((attempt, idx) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                  <div>
                    <p className="font-semibold">#{attempts.length - idx}: {attempt.exam?.title || 'Unknown Exam'}</p>
                    <p className="text-sm text-gray-500">{new Date(attempt.submitted_at).toLocaleString()}</p>
                    {attempt.exam?.topic && (
                      <p className="text-xs text-gray-400">Topic: {attempt.exam.topic}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {attempt.released && attempt.score !== null ? (
                      <div className="text-xl font-bold">{attempt.score.toFixed(1)}%</div>
                    ) : (
                      <div className="text-sm text-gray-400">Pending</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => setSelectedStat(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={selectedStat === 'trend'} onOpenChange={(open) => !open && setSelectedStat(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Performance Trend Analysis</DialogTitle>
              <DialogDescription>Detailed trend analysis and predictions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Current Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.averageScore >= 90 ? 'Excellent' : stats.averageScore >= 70 ? 'Good' : stats.averageScore >= 50 ? 'Average' : 'Needs Improvement'}
                  </div>
                  <p className="text-gray-600">Average Score: {stats.averageScore.toFixed(1)}%</p>
                </CardContent>
              </Card>
              {scoreTrendData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={scoreTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Score (%)" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  {topicPerformance.filter(tp => tp.average_score < 70).length > 0 ? (
                    <ul className="space-y-2">
                      {topicPerformance
                        .filter(tp => tp.average_score < 70)
                        .sort((a, b) => a.average_score - b.average_score)
                        .map(tp => (
                          <li key={tp.topic} className="flex items-center justify-between">
                            <span>{tp.topic}</span>
                            <span className="text-red-600 font-semibold">{tp.average_score.toFixed(1)}%</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-green-600">All topics are performing well!</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button onClick={() => setSelectedStat(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attempt Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {selectedAttempt && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedAttempt.exam?.title || 'Exam Details'}</DialogTitle>
                  <DialogDescription>
                    Submitted: {new Date(selectedAttempt.submitted_at).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {selectedAttempt.released && selectedAttempt.score !== null
                            ? `${selectedAttempt.score.toFixed(1)}%`
                            : 'Pending'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg">{selectedAttempt.status}</div>
                        <div className="text-xs text-gray-500">
                          {selectedAttempt.released ? 'Released' : 'Pending Review'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Topic</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg">{selectedAttempt.exam?.topic || 'N/A'}</div>
                      </CardContent>
                    </Card>
                  </div>
                  {(() => {
                    const breakdown = getQuestionBreakdown(selectedAttempt)
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle>Question Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Total</p>
                              <p className="text-2xl font-bold">{breakdown.total}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-600">Correct</p>
                              <p className="text-2xl font-bold text-green-600">{breakdown.correct}</p>
                            </div>
                            <div>
                              <p className="text-sm text-red-600">Incorrect</p>
                              <p className="text-2xl font-bold text-red-600">{breakdown.incorrect}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Unattempted</p>
                              <p className="text-2xl font-bold text-gray-600">{breakdown.unattempted}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                  {selectedAttempt.violations && selectedAttempt.violations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span>Violations ({selectedAttempt.violations.length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedAttempt.violations.map((violation: any, idx: number) => (
                            <div key={idx} className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <p className="font-semibold">{violation.type}</p>
                              <p className="text-sm text-gray-600">
                                Count: {violation.count || 1} • {violation.timestamp ? new Date(violation.timestamp).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <DialogFooter>
                  {selectedAttempt.released && (
                    <Button
                      onClick={() => {
                        router.push(`/exams/${selectedAttempt.exam_id}/results/${selectedAttempt.id}`)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Full Results
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Export Data</DialogTitle>
              <DialogDescription>Choose export format and options</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Export Format</p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // CSV export
                      const csv = [
                        ['Exam', 'Topic', 'Score', 'Status', 'Submitted At'].join(','),
                        ...attempts.map(a => [
                          a.exam?.title || 'Unknown',
                          a.exam?.topic || 'N/A',
                          a.score?.toFixed(1) || 'N/A',
                          a.released ? 'Released' : 'Pending',
                          new Date(a.submitted_at).toLocaleString()
                        ].join(','))
                      ].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `student-performance-${student?.name}-${new Date().toISOString()}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                      setShowExportDialog(false)
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
