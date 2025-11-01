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
import { Plus, Edit, Trash2, ArrowLeft, FileText, Clock, Users, CheckCircle, Eye, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

interface Exam {
  id: string
  title: string
  topic?: string
  time_limit: number
  attempt_limit: number
  release_mode: string
  created_at: string
  scheduled_start?: string | null
  scheduled_end?: string | null
  _count?: { questions: number, students: number }
}

interface Attempt {
  id: string
  student_id: string
  score: number
  released: boolean
  submitted_at: string
  violations?: any[]
  student: { name: string, email: string }
}

interface StudentAttempts {
  student_id: string
  student: { name: string, email: string }
  attempts: Attempt[]
  releasedCount: number
  pendingCount: number
}

export default function ExamsListPage() {
  const params = useParams()
  const router = useRouter()
  const subscriptionId = params.id as string

  const [subscription, setSubscription] = useState<any>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [viewingAttemptsFor, setViewingAttemptsFor] = useState<Exam | null>(null)
  const [studentAttempts, setStudentAttempts] = useState<StudentAttempts[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    time_limit: 60,
    attempt_limit: 1,
    release_mode: 'auto',
    scheduled_start: '',
    scheduled_end: '',
  })

  // Helper function to convert UTC ISO string to local datetime-local format
  const utcToLocal = (utcString: string | null): string => {
    if (!utcString) return ''
    const date = new Date(utcString)
    // Get local date components
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Helper function to convert local datetime-local format to UTC ISO string
  const localToUtc = (localString: string): string | null => {
    if (!localString) return null
    const date = new Date(localString)
    return date.toISOString()
  }

  useEffect(() => {
    loadSubscription()
    loadExams()
  }, [])

  async function loadSubscription() {
    const supabase = createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    setSubscription(data)
  }

  async function loadExams() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })

    if (data) {
      const examsWithCounts = await Promise.all(
        data.map(async (exam) => {
          const [questions, students] = await Promise.all([
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id),
            supabase.from('attempts').select('student_id').eq('exam_id', exam.id),
          ])
          
          // Count unique students
          const uniqueStudents = new Set(students.data?.map(s => s.student_id) || [])
          
          return {
            ...exam,
            _count: { questions: questions.count || 0, students: uniqueStudents.size }
          }
        })
      )
      setExams(examsWithCounts)
    }
    setLoading(false)
  }

  async function loadStudentAttempts(examId: string) {
    setLoadingStudents(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('attempts')
      .select(`
        id,
        student_id,
        score,
        released,
        submitted_at,
        violations,
        student:student_id (name, email)
      `)
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false })

    if (data) {
      // Group by student
      const grouped: { [key: string]: { student: any, attempts: Attempt[] } } = {}
      data.forEach((attempt: any) => {
        if (!grouped[attempt.student_id]) {
          grouped[attempt.student_id] = {
            student: attempt.student,
            attempts: []
          }
        }
        grouped[attempt.student_id].attempts.push(attempt)
      })

      const studentsWithAttempts: StudentAttempts[] = Object.entries(grouped).map(([student_id, data]) => ({
        student_id,
        student: data.student,
        attempts: data.attempts,
        releasedCount: data.attempts.filter(a => a.released).length,
        pendingCount: data.attempts.filter(a => !a.released).length
      }))

      setStudentAttempts(studentsWithAttempts)
    }
    setLoadingStudents(false)
  }

  const handleReleaseAttempt = async (attemptId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('attempts')
      .update({ released: true })
      .eq('id', attemptId)

    if (error) {
      alert(error.message)
      return
    }

    if (viewingAttemptsFor) {
      loadStudentAttempts(viewingAttemptsFor.id)
    }
  }

  const handleReleaseAll = async () => {
    if (!confirm('Release all pending results for this exam?')) return

    const supabase = createClient()
    if (viewingAttemptsFor) {
      const { error } = await supabase
        .from('attempts')
        .update({ released: true })
        .eq('exam_id', viewingAttemptsFor.id)
        .eq('released', false)

      if (error) {
        alert(error.message)
        return
      }

      loadStudentAttempts(viewingAttemptsFor.id)
      alert('All results released successfully!')
    }
  }

  const handleAddExam = async () => {
    const supabase = createClient()

    const { error } = await supabase
      .from('exams')
      .insert({
        subscription_id: subscriptionId,
        title: formData.title,
        topic: formData.topic || null,
        time_limit: formData.time_limit,
        attempt_limit: formData.attempt_limit,
        release_mode: formData.release_mode,
        scheduled_start: localToUtc(formData.scheduled_start),
        scheduled_end: localToUtc(formData.scheduled_end),
      })

    if (error) {
      alert(error.message)
      return
    }

    setIsAddDialogOpen(false)
    setFormData({ title: '', topic: '', time_limit: 60, attempt_limit: 1, release_mode: 'auto', scheduled_start: '', scheduled_end: '' })
    loadExams()
  }

  const handleUpdateExam = async () => {
    if (!selectedExam) return

    const supabase = createClient()
    const { error } = await supabase
      .from('exams')
      .update({
        title: formData.title,
        topic: formData.topic || null,
        time_limit: formData.time_limit,
        attempt_limit: formData.attempt_limit,
        release_mode: formData.release_mode,
        scheduled_start: localToUtc(formData.scheduled_start),
        scheduled_end: localToUtc(formData.scheduled_end),
      })
      .eq('id', selectedExam.id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedExam(null)
    setFormData({ title: '', topic: '', time_limit: 60, attempt_limit: 1, release_mode: 'auto', scheduled_start: '', scheduled_end: '' })
    loadExams()
  }

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure? This will delete all questions in this exam.')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    loadExams()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" asChild>
          <Link href="/admin/exams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{subscription?.name} - Exams</h1>
      </div>

      <div className="flex justify-between items-center mb-8">
        <p className="text-gray-600 dark:text-gray-400">Manage exams for this subscription</p>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p>No exams yet. Create your first exam to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <CardTitle>{exam.title}</CardTitle>
                      {(exam.scheduled_start || exam.scheduled_end) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                          Scheduled
                        </span>
                      )}
                    </div>
                    {exam.topic && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Topic: {exam.topic}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                      className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <Link href={`/admin/exams/${subscriptionId}/${exam.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Manage Questions
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingAttemptsFor(exam)
                        loadStudentAttempts(exam.id)
                      }}
                      className="hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      View Students ({exam._count?.students || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedExam(exam)
                        setFormData({
                          title: exam.title,
                          topic: exam.topic || '',
                          time_limit: exam.time_limit,
                          attempt_limit: exam.attempt_limit,
                          release_mode: exam.release_mode,
                          scheduled_start: utcToLocal(exam.scheduled_start),
                          scheduled_end: utcToLocal(exam.scheduled_end),
                        })
                      }}
                      className="hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteExam(exam.id)}
                      className="hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span>{exam._count?.questions || 0} Questions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span>{exam.time_limit} mins</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Attempts: </span>
                    <span>{exam.attempt_limit}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Release: </span>
                    <span className="capitalize">{exam.release_mode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!selectedExam} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setSelectedExam(null)
          setFormData({ title: '', topic: '', time_limit: 60, attempt_limit: 1, release_mode: 'auto', scheduled_start: '', scheduled_end: '' })
        }
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
            <DialogDescription>
              {selectedExam ? 'Update exam details' : 'Set up a new exam for this subscription'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exam Title</Label>
              <Input
                id="title"
                placeholder="e.g., Python Basics Quiz"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic (Optional)</Label>
              <Input
                id="topic"
                placeholder="Related topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attempt_limit">Attempt Limit</Label>
                <Input
                  id="attempt_limit"
                  type="number"
                  value={formData.attempt_limit}
                  onChange={(e) => setFormData({ ...formData, attempt_limit: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="release_mode">Result Release Mode</Label>
              <select
                id="release_mode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.release_mode}
                onChange={(e) => setFormData({ ...formData, release_mode: e.target.value })}
              >
                <option value="auto">Auto (Immediate)</option>
                <option value="manual">Manual (Admin Release)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scheduled_start">Scheduled Start (Optional)</Label>
                  {formData.scheduled_start && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, scheduled_start: '' })}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Input
                  id="scheduled_start"
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                />
                <p className="text-xs text-gray-500">Exam will be available from this time</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scheduled_end">Scheduled End (Optional)</Label>
                  {formData.scheduled_end && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, scheduled_end: '' })}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Input
                  id="scheduled_end"
                  type="datetime-local"
                  value={formData.scheduled_end}
                  onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                />
                <p className="text-xs text-gray-500">Exam unavailable after this time (deadline)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedExam(null)
            }}>Cancel</Button>
            <Button onClick={selectedExam ? handleUpdateExam : handleAddExam}>
              {selectedExam ? 'Save Changes' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Attempts Dialog */}
      {viewingAttemptsFor && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            setViewingAttemptsFor(null)
            setStudentAttempts([])
          }
        }}>
          <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Attempts - {viewingAttemptsFor.title}</DialogTitle>
              <DialogDescription>
                View and manage student attempts for this exam
              </DialogDescription>
            </DialogHeader>
            {loadingStudents ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : studentAttempts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No attempts yet for this exam.
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleReleaseAll}
                    disabled={studentAttempts.every(s => s.pendingCount === 0)}
                    className="hover:bg-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Release All Results
                  </Button>
                </div>
                <div className="space-y-4">
                  {studentAttempts.map((studentAttempt) => {
                    const isExpanded = expandedStudents.has(studentAttempt.student_id)
                    return (
                      <Card key={studentAttempt.student_id}>
                        <CardHeader 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setExpandedStudents(prev => {
                              const newSet = new Set(prev)
                              if (newSet.has(studentAttempt.student_id)) {
                                newSet.delete(studentAttempt.student_id)
                              } else {
                                newSet.add(studentAttempt.student_id)
                              }
                              return newSet
                            })
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-600" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-600" />
                              )}
                              <div className="flex-1">
                                <CardTitle className="text-lg">{studentAttempt.student.name}</CardTitle>
                                <p className="text-sm text-gray-600">{studentAttempt.student.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {studentAttempt.attempts.length} attempt{studentAttempt.attempts.length !== 1 ? 's' : ''}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  studentAttempt.releasedCount > 0 ? 'bg-green-100 text-green-700' : ''
                                }`}>
                                  {studentAttempt.releasedCount} released
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  studentAttempt.pendingCount > 0 ? 'bg-yellow-100 text-yellow-700' : ''
                                }`}>
                                  {studentAttempt.pendingCount} pending
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent>
                            <div className="space-y-3">
                              {studentAttempt.attempts.map((attempt) => (
                            <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {new Date(attempt.submitted_at).toLocaleString()}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    attempt.released ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {attempt.released ? 'Released' : 'Pending'}
                                  </span>
                                  <span className="font-bold">{attempt.score.toFixed(1)}%</span>
                                  {attempt.violations && attempt.violations.length > 0 && (
                                    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 flex items-center space-x-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>{attempt.violations.length} violations</span>
                                    </span>
                                  )}
                                </div>
                                {attempt.violations && attempt.violations.length > 0 && (
                                  <div className="mt-2 text-xs text-gray-600 bg-red-50 rounded p-2">
                                    <p className="font-semibold mb-1">Violations:</p>
                                    <div className="space-y-1">
                                      {attempt.violations.map((v: any, idx: number) => (
                                        <p key={idx}>
                                          {idx + 1}. {v.type.replace('_', ' ')} at {new Date(v.timestamp).toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                {!attempt.released && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleReleaseAttempt(attempt.id)}
                                    className="hover:bg-green-600"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Release
                                  </Button>
                                )}
                                {attempt.released && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push(`/exams/${viewingAttemptsFor.id}/results/${attempt.id}`)}
                                    className="hover:bg-blue-50"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setViewingAttemptsFor(null)
                setStudentAttempts([])
              }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
