'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, ArrowLeft, FileText, Code, HelpCircle } from 'lucide-react'

interface Question {
  id: string
  type: 'mcq' | 'coding'
  question_text: string
  options?: string[]
  correct_answer: string
  explanation?: string
  marks: number
  test_cases?: any
}

export default function QuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const subscriptionId = params.id as string
  const examId = params.examId as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [questionType, setQuestionType] = useState<'mcq' | 'coding'>('mcq')

  const [formData, setFormData] = useState({
    type: 'mcq' as 'mcq' | 'coding',
    question_text: '',
    options: '',
    correct_answer: '',
    explanation: '',
    marks: 1,
    test_cases: '',
  })

  useEffect(() => {
    loadExam()
    loadQuestions()
  }, [])

  async function loadExam() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exams')
      .select(`
        *,
        subscriptions (id, name)
      `)
      .eq('id', examId)
      .single()

    setExam(data)
  }

  async function loadQuestions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at')

    setQuestions(data || [])
    setLoading(false)
  }

  const handleAddQuestion = async () => {
    const supabase = createClient()

    const questionData: any = {
      exam_id: examId,
      type: formData.type,
      question_text: formData.question_text,
      correct_answer: formData.correct_answer,
      explanation: formData.explanation || null,
      marks: formData.marks,
    }

    if (formData.type === 'mcq') {
      const options = formData.options.split('\n[OPTION]\n').map(o => o.trim()).filter(o => o)
      questionData.options = options
    } else {
      // Parse test cases with hidden flag support
      const testCases = formData.test_cases.split('\n---\n').map(tc => {
        const lines = tc.trim().split('\n')
        let hidden = false
        let startIdx = 0
        
        // Check if first line is [HIDDEN]
        if (lines[0].trim() === '[HIDDEN]') {
          hidden = true
          startIdx = 1
        }
        
        // Find the === separator
        const fullText = lines.slice(startIdx).join('\n')
        const [input, output] = fullText.split('\n===\n')
        
        return { 
          input: input?.trim() || '', 
          output: output?.trim() || '',
          hidden 
        }
      }).filter(tc => tc.input && tc.output)
      questionData.test_cases = testCases
    }

    const { error } = await supabase
      .from('questions')
      .insert(questionData)

    if (error) {
      alert(error.message)
      return
    }

    setIsAddDialogOpen(false)
    resetFormData()
    loadQuestions()
  }

  const handleUpdateQuestion = async () => {
    if (!selectedQuestion) return

    const supabase = createClient()

    const questionData: any = {
      type: formData.type,
      question_text: formData.question_text,
      correct_answer: formData.correct_answer,
      explanation: formData.explanation || null,
      marks: formData.marks,
    }

    if (formData.type === 'mcq') {
      const options = formData.options.split('\n[OPTION]\n').map(o => o.trim()).filter(o => o)
      questionData.options = options
    } else {
      // Parse test cases with hidden flag support
      const testCases = formData.test_cases.split('\n---\n').map(tc => {
        const lines = tc.trim().split('\n')
        let hidden = false
        let startIdx = 0
        
        // Check if first line is [HIDDEN]
        if (lines[0].trim() === '[HIDDEN]') {
          hidden = true
          startIdx = 1
        }
        
        // Find the === separator
        const fullText = lines.slice(startIdx).join('\n')
        const [input, output] = fullText.split('\n===\n')
        
        return { 
          input: input?.trim() || '', 
          output: output?.trim() || '',
          hidden 
        }
      }).filter(tc => tc.input && tc.output)
      questionData.test_cases = testCases
    }

    const { error } = await supabase
      .from('questions')
      .update(questionData)
      .eq('id', selectedQuestion.id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedQuestion(null)
    resetFormData()
    loadQuestions()
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    loadQuestions()
  }

  const resetFormData = () => {
    setFormData({
      type: 'mcq',
      question_text: '',
      options: '',
      correct_answer: '',
      explanation: '',
      marks: 1,
      test_cases: '',
    })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" asChild>
          <Link href={`/admin/exams/${subscriptionId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Exams
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{exam?.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">{exam?.subscriptions?.name}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <p className="text-gray-600 dark:text-gray-400">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={isAddDialogOpen || !!selectedQuestion} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setSelectedQuestion(null)
            setQuestionType('mcq')
            resetFormData()
          }
        }}>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
          <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
              <DialogDescription>Create questions for this exam</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value as 'mcq' | 'coding' })
                    setQuestionType(e.target.value as 'mcq' | 'coding')
                  }}
                  disabled={!!selectedQuestion}
                >
                  <option value="mcq">MCQ (Multiple Choice)</option>
                  <option value="coding">Coding Question</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question_text">Question</Label>
                <Textarea
                  id="question_text"
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={3}
                />
              </div>

              {formData.type === 'mcq' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="options">Options (separate with [OPTION])</Label>
                    <Textarea
                      id="options"
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                      rows={8}
                      placeholder="Option 1&#10;[OPTION]&#10;Option 2&#10;[OPTION]&#10;Option 3&#10;[OPTION]&#10;Option 4"
                    />
                    <p className="text-xs text-gray-500">Use &quot;[OPTION]&quot; on a new line to separate options. Each option can have multiple lines.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcq_answer">Correct Answer</Label>
                    <Input
                      id="mcq_answer"
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      placeholder="Enter the exact correct option text"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="expected_output">Expected Output</Label>
                    <Textarea
                      id="expected_output"
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      rows={3}
                      placeholder="Expected output or answer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test_cases">Test Cases</Label>
                    <Textarea
                      id="test_cases"
                      value={formData.test_cases}
                      onChange={(e) => setFormData({ ...formData, test_cases: e.target.value })}
                      rows={10}
                      placeholder="Sample Test Case 1 (Visible):&#10;Input 1&#10;===&#10;Output 1&#10;---&#10;Hidden Test Case 1:&#10;[HIDDEN]&#10;Input 2&#10;===&#10;Output 2"
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500">
                      Format: Input === Output --- Input === Output. Add [HIDDEN] on its own line before a test case to mark it as hidden.
                    </p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={3}
                  placeholder="Explain the correct answer..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false)
                setSelectedQuestion(null)
              }}>Cancel</Button>
              <Button onClick={selectedQuestion ? handleUpdateQuestion : handleAddQuestion}>
                {selectedQuestion ? 'Save Changes' : 'Add Question'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p>No questions yet. Add questions to this exam.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <CardTitle>{q.question_text}</CardTitle>
                        {q.type === 'mcq' ? (
                          <HelpCircle className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Code className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {q.type === 'mcq' ? 'MCQ' : 'Coding'} • {q.marks} mark{q.marks !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQuestion(q)
                        setQuestionType(q.type)
                        if (q.type === 'mcq') {
                          setFormData({
                            type: 'mcq',
                            question_text: q.question_text,
                            options: q.options?.join('\n[OPTION]\n') || '',
                            correct_answer: q.correct_answer,
                            explanation: q.explanation || '',
                            marks: q.marks,
                            test_cases: '',
                          })
                        } else {
                          setFormData({
                            type: 'coding',
                            question_text: q.question_text,
                            options: '',
                            correct_answer: q.correct_answer,
                            explanation: q.explanation || '',
                            marks: q.marks,
                            test_cases: q.test_cases?.map((tc: any) => 
                              tc.hidden 
                                ? `[HIDDEN]\n${tc.input}\n===\n${tc.output}`
                                : `${tc.input}\n===\n${tc.output}`
                            ).join('\n---\n') || '',
                          })
                        }
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {q.type === 'mcq' && q.options && (
                  <div>
                    <p className="font-semibold mb-2">Options:</p>
                    <ul className="space-y-1">
                      {q.options.map((opt, i) => (
                        <li key={i} className={opt === q.correct_answer ? 'text-green-600 font-semibold' : ''}>
                          {String.fromCharCode(65 + i)}. {opt} {opt === q.correct_answer && '(Correct)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {q.type === 'coding' && (
                  <div>
                    <p className="font-semibold mb-2">Expected Output:</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded">{q.correct_answer}</pre>
                  </div>
                )}
                {q.explanation && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2">Explanation:</p>
                    <p className="text-sm">{q.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

