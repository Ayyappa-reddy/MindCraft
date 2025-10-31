'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, ArrowLeft, AlertTriangle, HelpCircle, CheckCircle2 } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface Question {
  id: string
  type: 'mcq' | 'coding'
  question_text: string
  options?: string[]
  correct_answer: string
  explanation?: string
  marks: number
  test_cases?: any[]
}

interface Attempt {
  id: string
  score: number
  answers: Record<string, any>
  submitted_at: string
  released: boolean
  violations?: any[]
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string
  const attemptId = params.attemptId as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    const supabase = createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsAdmin(userData?.role === 'admin')
    }

    const [examData, questionsData, attemptData] = await Promise.all([
      supabase.from('exams').select('*').eq('id', examId).single(),
      supabase.from('questions').select('*').eq('exam_id', examId).order('created_at'),
      supabase.from('attempts').select('*').eq('id', attemptId).single(),
    ])

    setExam(examData.data)
    setQuestions(questionsData.data || [])
    setAttempt(attemptData.data)
    setLoading(false)
  }

  const getAnswerStatus = (question: Question, studentAnswer: any) => {
    if (!studentAnswer) return null // Not attempted
    
    if (question.type === 'mcq') {
      return studentAnswer?.answer === question.correct_answer
    } else if (question.type === 'coding') {
      // For coding questions, check if all test cases passed
      const testResults = studentAnswer?.testResults
      if (!testResults || !Array.isArray(testResults)) return false
      return testResults.every((r: any) => r.passed)
    }
    
    return false
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading results...</div>
    </div>
  }

  if (!attempt || !exam) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Results not found</div>
    </div>
  }

  if (!attempt.released && !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Results Not Yet Released</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Your exam results are pending. The admin will release them soon.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              {isAdmin ? (
                <>
                  <a href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Admin Dashboard</a>
                  <a href="/admin/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
                  <a href="/admin/students" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Students</a>
                  <a href="/admin/requests" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Requests</a>
                </>
              ) : (
                <>
                  <a href="/learn" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Learn</a>
                  <a href="/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
                  <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
                  <a href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Profile</a>
                </>
              )}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push(isAdmin ? '/admin/exams' : '/dashboard')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {isAdmin ? 'Admin' : 'Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold mb-2">{exam.title} - Results</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Submitted: {new Date(attempt.submitted_at).toLocaleString()}
          </p>
        </div>

        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{attempt.score.toFixed(1)}%</div>
              <div className="text-gray-600 dark:text-gray-400">Score</div>
              {attempt.violations && attempt.violations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-center space-x-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">{attempt.violations.length} Violation{attempt.violations.length !== 1 ? 's' : ''} Detected</span>
                  </div>
                  <div className="mt-2 text-sm space-y-1">
                    {attempt.violations.map((v: any, idx: number) => (
                      <p key={idx} className="text-gray-700">
                        {idx + 1}. {v.type.replace('_', ' ')} at {new Date(v.timestamp).toLocaleString()}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {questions.map((question, idx) => {
            const studentAnswer = attempt.answers[question.id]
            const isCorrect = getAnswerStatus(question, studentAnswer)

            return (
              <Card key={question.id} className={isCorrect === true ? 'border-green-500' : isCorrect === false ? 'border-red-500' : 'border-gray-400'}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-start space-x-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        {idx + 1}
                      </span>
                      <span>{question.question_text}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {isCorrect === true ? (
                        <>
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <span className="text-green-600 font-semibold">Correct</span>
                        </>
                      ) : isCorrect === false ? (
                        <>
                          <XCircle className="h-6 w-6 text-red-600" />
                          <span className="text-red-600 font-semibold">Incorrect</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="h-6 w-6 text-gray-600" />
                          <span className="text-gray-600 font-semibold">Not Attempted</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {question.marks} mark{question.marks !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {question.type === 'mcq' && (
                    <div>
                      <p className="font-semibold mb-2">Options:</p>
                      <div className="space-y-2">
                        {question.options?.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-lg ${
                              option === question.correct_answer
                                ? 'bg-green-100 border-2 border-green-500'
                                : option === studentAnswer?.answer
                                ? 'bg-red-100 border-2 border-red-500'
                                : 'bg-gray-50 border'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}. {option}
                            {option === question.correct_answer && ' ✓ Correct Answer'}
                            {option === studentAnswer?.answer && option !== question.correct_answer && ' ✗ Your Answer'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {question.type === 'coding' && (
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold mb-2">Submitted Code ({studentAnswer?.language || 'N/A'}):</p>
                        <div className="border rounded-lg overflow-hidden">
                          <Editor
                            height="300px"
                            language={studentAnswer?.language || 'plaintext'}
                            value={studentAnswer?.code || 'No code submitted'}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                            }}
                          />
                        </div>
                      </div>
                      
                      {studentAnswer?.testResults && Array.isArray(studentAnswer.testResults) && (
                        <div>
                          <p className="font-semibold mb-2">Test Case Results:</p>
                          <div className="space-y-2">
                            {studentAnswer.testResults.map((result: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-3 rounded border ${
                                  result.passed
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-red-50 border-red-500'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    {result.passed ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <span className="font-semibold">
                                      Test Case {idx + 1}
                                      {question.test_cases?.[idx]?.hidden && ' (Hidden)'}
                                    </span>
                                  </div>
                                </div>
                                {!result.passed && !question.test_cases?.[idx]?.hidden && (
                                  <div className="mt-2 text-sm space-y-1">
                                    <div>
                                      <span className="font-semibold">Expected:</span>
                                      <pre className="mt-1 p-2 bg-white rounded text-xs">
                                        {result.expectedOutput || '(empty)'}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="font-semibold">Got:</span>
                                      <pre className="mt-1 p-2 bg-white rounded text-xs">
                                        {result.actualOutput || '(no output)'}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                                {result.error && (
                                  <div className="mt-2 text-xs text-red-600">
                                    Error: {result.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            Score: {studentAnswer.testResults.filter((r: any) => r.passed).length} / {studentAnswer.testResults.length} test cases passed
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {question.explanation && (
                    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="font-semibold mb-2">Explanation:</p>
                      <p className="text-sm">{question.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Button onClick={() => router.push(isAdmin ? '/admin/exams' : '/dashboard')} size="lg">
            Back to {isAdmin ? 'Admin' : 'Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  )
}

