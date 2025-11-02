'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Clock, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Maximize2 } from 'lucide-react'
import CodingExamLayout from '@/components/coding/CodingExamLayout'

interface Question {
  id: string
  type: 'mcq' | 'coding'
  question_text: string
  options?: string[]
  correct_answer: string
  explanation?: string
  marks: number
  test_cases?: any
  title?: string
  input_format?: string
  output_format?: string
  examples?: Array<{
    input: string
    output: string
    explanation?: string
  }>
  constraints?: string
}

interface Violation {
  type: 'fullscreen_exit' | 'tab_switch' | 'copy_paste' | 'key_shortcut'
  timestamp: string
  count: number
}

export default function ExamAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [canAttempt, setCanAttempt] = useState(true)
  const [attemptCount, setAttemptCount] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]))
  const [violations, setViolations] = useState<Violation[]>([])
  const [violationCount, setViolationCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenRef = useRef<boolean>(false)
  const violationRef = useRef<number>(0)
  const violationsRef = useRef<Violation[]>([])
  const questionsRef = useRef<Question[]>([])
  const submittedRef = useRef<boolean>(false)
  const handleSubmitRef = useRef<((autoSubmit?: boolean) => Promise<void>) | null>(null)
  const requestFullscreenRef = useRef<(() => Promise<void>) | null>(null)


  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  useEffect(() => {
    violationsRef.current = violations
  }, [violations])

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  useEffect(() => {
    loadExam()
  }, [])

  useEffect(() => {
    if (exam && timeRemaining > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            if (handleSubmitRef.current) {
              handleSubmitRef.current()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [exam, timeRemaining, submitted])

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submittedRef.current) return

    submittedRef.current = true
    setSubmitted(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Calculate score
    let totalScore = 0
    let maxScore = 0

    for (const question of questionsRef.current) {
      maxScore += question.marks
      const studentAnswer = answers[question.id]

      if (!studentAnswer) continue

      if (question.type === 'mcq') {
        if (studentAnswer.answer === question.correct_answer) {
          totalScore += question.marks
        }
      } else if (question.type === 'coding') {
        // For coding questions, calculate score based on test case results
        const totalTestCases = question.test_cases?.length || 0
        
        if (totalTestCases === 0) {
          // If no test cases exist, give full marks
          totalScore += question.marks
        } else if (studentAnswer.testResults && Array.isArray(studentAnswer.testResults)) {
          const passedCount = studentAnswer.testResults.filter((r: any) => r.passed).length
          const partialScore = (passedCount / totalTestCases) * question.marks
          totalScore += partialScore
        }
      }
    }

    const score = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    // Create attempt
    const { data: attemptData, error } = await supabase
      .from('attempts')
      .insert({
        exam_id: examId,
        student_id: user.id,
        answers,
        score,
        status: 'completed',
        released: exam.release_mode === 'auto',
        violations: violationsRef.current.length > 0 ? violationsRef.current : null,
      })
      .select()
      .single()

    if (error) {
      alert('Error submitting exam: ' + error.message)
      return
    }

    setAttemptId(attemptData.id)

    if (exam.release_mode === 'auto') {
      router.push(`/exams/${examId}/results/${attemptData.id}`)
    } else {
      alert('Exam submitted successfully! Results will be released by admin.')
      router.push('/dashboard')
    }
  }, [submitted, answers, examId, exam, router])

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  const addViolation = useCallback((type: 'fullscreen_exit' | 'tab_switch' | 'copy_paste' | 'key_shortcut') => {
    const newCount = violationRef.current + 1
    violationRef.current = newCount
    setViolationCount(newCount)

    const violation: Violation = {
      type,
      timestamp: new Date().toISOString(),
      count: newCount,
    }

    setViolations(prev => [...prev, violation])

    if (newCount < 4) {
      alert(`Violation detected! Warning ${newCount}/3`)
    } else {
      alert('Maximum violations reached. Auto-submitting exam...')
      setTimeout(() => {
        handleSubmit(true)
      }, 1000)
    }
  }, [handleSubmit])

  // Fullscreen enforcement
  useEffect(() => {
    if (questions.length > 0 && !submitted) {
      // Add CSS to hide navigation when in fullscreen
      const style = document.createElement('style')
      style.textContent = `
        :fullscreen nav,
        :-webkit-full-screen nav,
        :-moz-full-screen nav,
        :-ms-fullscreen nav {
          display: none !important;
        }
      `
      document.head.appendChild(style)

      const requestFullscreen = async () => {
        const elem = document.documentElement
        if (!document.fullscreenElement) {
          try {
            await elem.requestFullscreen()
          } catch (err: any) {
            console.error('Fullscreen request failed:', err)
            // Don't block exam if fullscreen fails (e.g., user denies permission)
          }
        }
      }

      requestFullscreenRef.current = requestFullscreen

      const handleFullscreenChange = () => {
        const isFullscreenState = !!document.fullscreenElement
        fullscreenRef.current = isFullscreenState
        setIsFullscreen(isFullscreenState)
        
        if (!isFullscreenState && questionsRef.current.length > 0 && !submittedRef.current) {
          // Don't auto-request fullscreen anymore - just show the button
        }
      }

      const handleVisibilityChange = () => {
        if (document.hidden && questionsRef.current.length > 0 && !submittedRef.current) {
          addViolation('tab_switch')
        }
      }

      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault()
      }

      const preventCopyPaste = (e: ClipboardEvent) => {
        const activeElement = document.activeElement as HTMLElement
        const isTextarea = activeElement?.tagName === 'TEXTAREA'
        const currentQ = questionsRef.current[currentQuestionIndex]
        if (isTextarea && currentQ?.type === 'coding') {
          addViolation('copy_paste')
          e.preventDefault()
        }
      }

      const preventKeyboardShortcuts = (e: KeyboardEvent) => {
        // Detect Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
        if (e.ctrlKey || e.metaKey) {
          const activeElement = document.activeElement as HTMLElement
          const isTextarea = activeElement?.tagName === 'TEXTAREA'
          const currentQ = questionsRef.current[currentQuestionIndex]
          if (isTextarea && currentQ?.type === 'coding') {
            const key = e.key.toLowerCase()
            if (key === 'c' || key === 'v' || key === 'x' || key === 'a') {
              addViolation('key_shortcut')
              e.preventDefault()
              e.stopPropagation()
            }
          }
        }
      }

      window.addEventListener('fullscreenchange', handleFullscreenChange)
      window.addEventListener('visibilitychange', handleVisibilityChange)
      document.addEventListener('contextmenu', preventContextMenu)
      document.addEventListener('copy', preventCopyPaste)
      document.addEventListener('cut', preventCopyPaste)
      document.addEventListener('paste', preventCopyPaste)
      document.addEventListener('keydown', preventKeyboardShortcuts)

      return () => {
        window.removeEventListener('fullscreenchange', handleFullscreenChange)
        window.removeEventListener('visibilitychange', handleVisibilityChange)
        document.removeEventListener('contextmenu', preventContextMenu)
        document.removeEventListener('copy', preventCopyPaste)
        document.removeEventListener('cut', preventCopyPaste)
        document.removeEventListener('paste', preventCopyPaste)
        document.removeEventListener('keydown', preventKeyboardShortcuts)
        if (document.head.contains(style)) {
          document.head.removeChild(style)
        }
      }
    }
  }, [questions, submitted, addViolation, currentQuestionIndex])

  async function loadExam() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Load exam details
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

    // Check if exam is available based on schedule
    const now = new Date()
    if (examData.scheduled_start) {
      const startTime = new Date(examData.scheduled_start)
      if (now < startTime) {
        alert('This exam is not yet available. Please check the scheduled start time.')
        router.push('/exams')
        return
      }
    }
    if (examData.scheduled_end) {
      const endTime = new Date(examData.scheduled_end)
      if (now > endTime) {
        alert('This exam is no longer available. The exam period has ended.')
        router.push('/exams')
        return
      }
    }

    setExam(examData)

    // Check attempt limits
    const { count } = await supabase
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('student_id', user.id)

    // Check for extra attempts
    const { data: studentLimit } = await supabase
      .from('student_attempt_limits')
      .select('extra_attempts')
      .eq('student_id', user.id)
      .eq('exam_id', examId)
      .single()

    const extraAttempts = studentLimit?.extra_attempts || 0
    const totalAttemptLimit = examData.attempt_limit + extraAttempts

    setAttemptCount(count || 0)

    if (count && count >= totalAttemptLimit) {
      setCanAttempt(false)
      setLoading(false)
      return
    }

    setTimeRemaining(examData.time_limit * 60) // Convert to seconds

    // Load questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at')

    setQuestions(questionsData || [])
    setLoading(false)
  }

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    
    // Mark question as answered
    const questionIndex = questions.findIndex(q => q.id === questionId)
    if (questionIndex !== -1) {
      setVisitedQuestions(prev => new Set([...prev, questionIndex]))
    }
  }

  const handleQuestionNavigation = (index: number) => {
    setCurrentQuestionIndex(index)
    setVisitedQuestions(prev => new Set([...prev, index]))
  }

  const getQuestionStatus = (index: number) => {
    if (index === currentQuestionIndex) return 'current'
    if (answers[questions[index]?.id]) return 'answered'
    if (visitedQuestions.has(index)) return 'visited'
    return 'unvisited'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleRequestExtraAttempt = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from('requests')
      .insert({
        student_id: user.id,
        subscription_id: exam?.subscription_id,
        type: 'extra_attempt',
        message: `Request for extra attempt for exam: ${exam?.title}`,
      })

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    alert('Request submitted! Admin will review and respond soon.')
    router.push('/dashboard')
  }


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading exam...</div>
    </div>
  }

  if (!canAttempt) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Attempt Limit Reached</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You have reached the maximum attempts ({attemptCount}/{exam?.attempt_limit || 'N/A'}) for this exam.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button onClick={handleRequestExtraAttempt}>
                Request Extra Attempt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed timer header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-blue-600">MindCraft</h1>
            <div className="flex items-center space-x-4">
              {!isFullscreen && !submitted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (requestFullscreenRef.current) {
                      requestFullscreenRef.current()
                    }
                  }}
                  className="flex items-center space-x-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>Enter Fullscreen</span>
                </Button>
              )}
              {violationCount > 0 && (
                <span className="text-sm text-red-600 font-semibold">
                  Violations: {violationCount}/3
                </span>
              )}
              <div className="flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-700" />
                <span className="font-bold text-yellow-700">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submitted && !attemptId ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Exam Submitted!</h2>
              <p>Processing your results...</p>
            </CardContent>
          </Card>
        ) : questions.length > 0 ? (
          <CodingExamLayout
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            onNavigate={handleQuestionNavigation}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            visitedQuestions={visitedQuestions}
          />
        ) : null}

        {/* Final Submit Button */}
        {!submitted && questions.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => handleSubmit()}
              disabled={submitted}
              className="bg-red-600 hover:bg-red-700 px-12"
              size="lg"
            >
              {submitted ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Answered: {Object.keys(answers).length} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      <div className="h-16"></div>
    </div>
  )
}
