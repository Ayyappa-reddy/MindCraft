'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Clock, FileText, AlertTriangle } from 'lucide-react'

interface Exam {
  id: string
  title: string
  topic?: string
  time_limit: number
  attempt_limit: number
}

export default function ExamInstructionsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string

  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [questionCount, setQuestionCount] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [extraAttempts, setExtraAttempts] = useState(0)

  useEffect(() => {
    loadExamData()
  }, [])

  async function loadExamData() {
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

    // Check attempt limits
    const { count } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('student_id', user.id)

    setAttemptCount(count || 0)

    // Check for extra attempts
    const { data: studentLimit } = await supabase
      .from('student_attempt_limits')
      .select('extra_attempts')
      .eq('student_id', user.id)
      .eq('exam_id', examId)
      .single()

    setExtraAttempts(studentLimit?.extra_attempts || 0)

    // Load question count
    const { count: qCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)

    setQuestionCount(qCount || 0)
    setLoading(false)
  }

  const handleBack = () => {
    router.push(`/exams/${examId}/details`)
  }

  const handleProceed = () => {
    router.push(`/exams/${examId}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  if (!exam) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Exam not found</div>
    </div>
  }

  const totalAttemptLimit = exam.attempt_limit + extraAttempts
  const currentAttemptNumber = attemptCount + 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
          {exam.topic && (
            <p className="text-gray-600 dark:text-gray-400">Topic: {exam.topic}</p>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Information</CardTitle>
            <CardDescription>Please read all instructions carefully before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Time Limit</p>
                  <p className="text-2xl font-bold">{exam.time_limit} minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Total Questions</p>
                  <p className="text-2xl font-bold">{questionCount}</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Attempt Information</p>
              <p className="text-lg">This is your <span className="font-bold text-blue-600">attempt #{currentAttemptNumber}</span> out of <span className="font-bold">{totalAttemptLimit}</span> allowed attempts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-800">Important Rules & Guidelines</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-yellow-600 mt-1">•</span>
                <span>You must stay in <span className="font-semibold">fullscreen mode</span> throughout the exam</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-yellow-600 mt-1">•</span>
                <span><span className="font-semibold">Do not switch tabs</span> or open other applications during the exam</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-yellow-600 mt-1">•</span>
                <span><span className="font-semibold">Copy-paste is disabled</span> for coding questions</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-red-600 mt-1">⚠️</span>
                <span>Any violation of the above rules will result in a warning. After <span className="font-bold text-red-600">2 warnings, the exam will be auto-submitted immediately</span></span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-blue-600 mt-1">•</span>
                <span>Review your answers before submitting. Once submitted, you cannot change your answers</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-blue-600 mt-1">•</span>
                <span>Use the question navigator on the right to jump between questions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-between space-x-4">
          <Button variant="outline" size="lg" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button size="lg" onClick={handleProceed}>
            Proceed to Exam
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

