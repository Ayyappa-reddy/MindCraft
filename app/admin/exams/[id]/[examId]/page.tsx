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
import { Plus, Edit, Trash2, ArrowLeft, FileText, Code, HelpCircle, Upload, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  
  // Bulk import states
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [bulkImportType, setBulkImportType] = useState<'mcq' | 'coding'>('mcq')
  const [bulkImportText, setBulkImportText] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const [formData, setFormData] = useState({
    type: 'mcq' as 'mcq' | 'coding',
    title: '',
    question_text: '',
    input_format: '',
    output_format: '',
    constraints: '',
    examples: '',
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
      // Add structured fields for coding questions
      if (formData.title) questionData.title = formData.title
      if (formData.input_format) questionData.input_format = formData.input_format
      if (formData.output_format) questionData.output_format = formData.output_format
      if (formData.constraints) questionData.constraints = formData.constraints
      
      // Parse examples if provided
      if (formData.examples) {
        try {
          questionData.examples = JSON.parse(formData.examples)
        } catch (e) {
          console.error('Invalid examples JSON:', e)
        }
      }
      
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
      // Add structured fields for coding questions
      questionData.title = formData.title || null
      questionData.input_format = formData.input_format || null
      questionData.output_format = formData.output_format || null
      questionData.constraints = formData.constraints || null
      
      // Parse examples if provided
      if (formData.examples) {
        try {
          questionData.examples = JSON.parse(formData.examples)
        } catch (e) {
          console.error('Invalid examples JSON:', e)
          questionData.examples = null
        }
      } else {
        questionData.examples = null
      }
      
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
      title: '',
      question_text: '',
      input_format: '',
      output_format: '',
      constraints: '',
      examples: '',
      options: '',
      correct_answer: '',
      explanation: '',
      marks: 1,
      test_cases: '',
    })
  }

  const parseBulkQuestions = () => {
    const errors: string[] = []
    const parsed: any[] = []

    try {
      const jsonData = JSON.parse(bulkImportText)
      
      if (!Array.isArray(jsonData)) {
        setImportErrors(['JSON must be an array of questions'])
        return
      }

      jsonData.forEach((item, index) => {
        const questionErrors: string[] = []
        const questionNum = index + 1

        // Common validation
        if (!item.type || !['mcq', 'coding'].includes(item.type)) {
          questionErrors.push(`Question ${questionNum}: Invalid or missing 'type' (must be 'mcq' or 'coding')`)
        }
        if (!item.question_text || typeof item.question_text !== 'string') {
          questionErrors.push(`Question ${questionNum}: Missing or invalid 'question_text'`)
        }
        if (!item.marks || typeof item.marks !== 'number' || item.marks < 1) {
          questionErrors.push(`Question ${questionNum}: Invalid 'marks' (must be a number >= 1)`)
        }

        // MCQ specific validation
        if (item.type === 'mcq') {
          if (!Array.isArray(item.options) || item.options.length < 2) {
            questionErrors.push(`Question ${questionNum}: 'options' must be an array with at least 2 items`)
          }
          if (!item.correct_answer || typeof item.correct_answer !== 'string') {
            questionErrors.push(`Question ${questionNum}: Missing or invalid 'correct_answer'`)
          }
        }

        // Coding specific validation
        if (item.type === 'coding') {
          if (!item.title || typeof item.title !== 'string') {
            questionErrors.push(`Question ${questionNum}: Missing or invalid 'title'`)
          }
          if (!item.test_cases || typeof item.test_cases !== 'string') {
            questionErrors.push(`Question ${questionNum}: Missing or invalid 'test_cases'`)
          }
        }

        if (questionErrors.length > 0) {
          errors.push(...questionErrors)
          parsed.push({ ...item, _errors: questionErrors, _valid: false })
        } else {
          parsed.push({ ...item, _valid: true })
        }
      })

      setParsedQuestions(parsed)
      setImportErrors(errors)
      setShowPreview(true)

    } catch (e: any) {
      setImportErrors([`JSON Parse Error: ${e.message}`])
      setParsedQuestions([])
      setShowPreview(false)
    }
  }

  const handleBulkImport = async () => {
    const validQuestions = parsedQuestions.filter(q => q._valid)
    
    if (validQuestions.length === 0) {
      alert('No valid questions to import')
      return
    }

    const supabase = createClient()
    
    // Prepare questions for database
    const questionsToInsert = validQuestions.map(q => {
      const baseData: any = {
        exam_id: examId,
        type: q.type,
        question_text: q.question_text,
        marks: q.marks,
        explanation: q.explanation || null,
      }

      if (q.type === 'mcq') {
        baseData.options = q.options
        baseData.correct_answer = q.correct_answer
      } else if (q.type === 'coding') {
        baseData.title = q.title
        baseData.input_format = q.input_format || null
        baseData.output_format = q.output_format || null
        baseData.constraints = q.constraints || null
        baseData.test_cases = q.test_cases
        baseData.correct_answer = '' // Required field, empty for coding

        // Handle examples
        if (q.examples) {
          baseData.examples = Array.isArray(q.examples) ? q.examples : null
        }
      }

      return baseData
    })

    const { error } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (error) {
      alert('Error importing questions: ' + error.message)
      return
    }

    alert(`Successfully imported ${validQuestions.length} question(s)!`)
    
    // Reset and close
    setBulkImportText('')
    setParsedQuestions([])
    setImportErrors([])
    setShowPreview(false)
    setIsBulkImportOpen(false)
    
    loadQuestions()
  }

  const removeQuestionFromPreview = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const openBulkImport = (type: 'mcq' | 'coding') => {
    setBulkImportType(type)
    setBulkImportText('')
    setParsedQuestions([])
    setImportErrors([])
    setShowPreview(false)
    setIsBulkImportOpen(true)
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openBulkImport('mcq')}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import MCQ
          </Button>
          <Button variant="outline" onClick={() => openBulkImport('coding')}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import Coding
          </Button>
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
                    <Textarea
                      id="mcq_answer"
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                      placeholder="Enter the exact correct option text"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Sum of Two Numbers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="input_format">Input Format (Optional)</Label>
                    <Textarea
                      id="input_format"
                      value={formData.input_format}
                      onChange={(e) => setFormData({ ...formData, input_format: e.target.value })}
                      rows={2}
                      placeholder="First line contains an integer n..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output_format">Output Format (Optional)</Label>
                    <Textarea
                      id="output_format"
                      value={formData.output_format}
                      onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                      rows={2}
                      placeholder="Print a single integer..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="examples">Examples (Optional, JSON Format)</Label>
                    <Textarea
                      id="examples"
                      value={formData.examples}
                      onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                      rows={4}
                      placeholder='[{"input":"5","output":"Even","explanation":"..."},{"input":"7","output":"Odd"}]'
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">JSON array with input, output, and optional explanation</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraints">Constraints (Optional)</Label>
                    <Textarea
                      id="constraints"
                      value={formData.constraints}
                      onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                      rows={2}
                      placeholder="1 ≤ n ≤ 10^9"
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
      </div>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="bg-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import {bulkImportType === 'mcq' ? 'MCQ' : 'Coding'} Questions</DialogTitle>
            <DialogDescription>
              Paste JSON array of questions below. Click "Parse & Preview" to validate before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* JSON Input Textarea */}
            <div className="space-y-2">
              <Label>JSON Input</Label>
              <Textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder={bulkImportType === 'mcq' 
                  ? '[\n  {\n    "type": "mcq",\n    "question_text": "What is 2+2?",\n    "options": ["2", "3", "4", "5"],\n    "correct_answer": "4",\n    "explanation": "Basic math",\n    "marks": 1\n  }\n]'
                  : '[\n  {\n    "type": "coding",\n    "title": "Sum of Two Numbers",\n    "question_text": "Write a program...",\n    "test_cases": "5 3\\n===\\n8\\n---\\n[HIDDEN]\\n10 20\\n===\\n30",\n    "marks": 5\n  }\n]'
                }
              />
            </div>

            {/* Parse Button */}
            <Button onClick={parseBulkQuestions}>
              <AlertCircle className="mr-2 h-4 w-4" />
              Parse & Preview
            </Button>

            {/* Error Display */}
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Validation Errors:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {importErrors.map((err, idx) => (
                      <li key={idx} className="text-sm">{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            {showPreview && parsedQuestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Preview ({parsedQuestions.length} questions)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left w-8">#</th>
                          <th className="p-2 text-left">Question</th>
                          {bulkImportType === 'mcq' ? (
                            <>
                              <th className="p-2 text-left">Options</th>
                              <th className="p-2 text-left">Answer</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2 text-left">Title</th>
                              <th className="p-2 text-left">Test Cases</th>
                            </>
                          )}
                          <th className="p-2 text-center w-16">Marks</th>
                          <th className="p-2 text-center w-20">Status</th>
                          <th className="p-2 text-center w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedQuestions.map((q, idx) => (
                          <tr key={idx} className={`border-t ${!q._valid ? 'bg-red-50' : ''}`}>
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2">
                              <div className="max-w-xs truncate whitespace-pre-wrap">
                                {q.question_text?.substring(0, 60)}...
                              </div>
                            </td>
                            {bulkImportType === 'mcq' ? (
                              <>
                                <td className="p-2">{q.options?.length || 0} options</td>
                                <td className="p-2">
                                  <div className="max-w-xs truncate">
                                    {q.correct_answer?.substring(0, 30)}
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-2">
                                  <div className="max-w-xs truncate">
                                    {q.title?.substring(0, 40)}
                                  </div>
                                </td>
                                <td className="p-2">
                                  {q.test_cases ? (
                                    <span className="text-xs">
                                      {q.test_cases.split('---').length} cases
                                    </span>
                                  ) : '0'}
                                </td>
                              </>
                            )}
                            <td className="p-2 text-center">{q.marks}</td>
                            <td className="p-2 text-center">
                              {q._valid ? (
                                <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 mx-auto" title={q._errors?.join(', ')} />
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestionFromPreview(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    Valid: {parsedQuestions.filter(q => q._valid).length} / {parsedQuestions.length}
                  </span>
                  <span className="text-xs">
                    Invalid questions will not be imported. Remove or fix them.
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
              Cancel
            </Button>
            {showPreview && parsedQuestions.filter(q => q._valid).length > 0 && (
              <Button onClick={handleBulkImport}>
                Import {parsedQuestions.filter(q => q._valid).length} Question(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                            title: '',
                            question_text: q.question_text,
                            input_format: '',
                            output_format: '',
                            constraints: '',
                            examples: '',
                            options: q.options?.join('\n[OPTION]\n') || '',
                            correct_answer: q.correct_answer,
                            explanation: q.explanation || '',
                            marks: q.marks,
                            test_cases: '',
                          })
                        } else {
                          setFormData({
                            type: 'coding',
                            title: q.title || '',
                            question_text: q.question_text,
                            input_format: q.input_format || '',
                            output_format: q.output_format || '',
                            constraints: q.constraints || '',
                            examples: q.examples ? JSON.stringify(q.examples) : '',
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
                          <span className="font-semibold">{String.fromCharCode(65 + i)}. </span>
                          <span className="whitespace-pre-wrap">{opt}</span> {opt === q.correct_answer && '(Correct)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {q.type === 'coding' && (
                  <div className="space-y-4">
                    {q.title && (
                      <div>
                        <p className="font-semibold mb-2">Title:</p>
                        <p className="text-sm">{q.title}</p>
                      </div>
                    )}
                    {q.input_format && (
                      <div>
                        <p className="font-semibold mb-2">Input Format:</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap">{q.input_format}</pre>
                      </div>
                    )}
                    {q.output_format && (
                      <div>
                        <p className="font-semibold mb-2">Output Format:</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap">{q.output_format}</pre>
                      </div>
                    )}
                    {q.examples && Array.isArray(q.examples) && q.examples.length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Examples:</p>
                        {q.examples.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            <p className="font-medium mb-2">Example {exIdx + 1}:</p>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium">Input:</span>
                                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm whitespace-pre-wrap">{ex.input}</pre>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Output:</span>
                                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm whitespace-pre-wrap">{ex.output}</pre>
                              </div>
                              {ex.explanation && (
                                <div>
                                  <span className="text-sm font-medium">Explanation:</span>
                                  <p className="text-sm mt-1">{ex.explanation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.constraints && (
                      <div>
                        <p className="font-semibold mb-2">Constraints:</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap">{q.constraints}</pre>
                      </div>
                    )}
                    {q.test_cases && Array.isArray(q.test_cases) && q.test_cases.length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Test Cases:</p>
                        {q.test_cases.map((tc: any, tcIdx: number) => (
                          <div key={tcIdx} className={`mb-2 p-3 rounded ${tc.hidden ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">Test Case {tcIdx + 1}</span>
                              {tc.hidden && <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 px-2 py-1 rounded">HIDDEN</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Input:</span>
                                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 whitespace-pre-wrap">{tc.input}</pre>
                              </div>
                              <div>
                                <span className="font-medium">Output:</span>
                                <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 whitespace-pre-wrap">{tc.output}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

