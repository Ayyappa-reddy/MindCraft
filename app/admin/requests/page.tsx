'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, CheckCircle, Clock, Key, UserPlus } from 'lucide-react'

interface Request {
  id: string
  type: string
  message: string
  status: string
  email?: string
  created_at: string
  student_id?: string
  subscription_id?: string
  student?: { id: string, name: string, email: string }
  subscription?: { id: string, name: string }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState('')
  const [extraAttempts, setExtraAttempts] = useState(1)

  const [students, setStudents] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [newStudentData, setNewStudentData] = useState({ email: '', name: '', password: '' })

  useEffect(() => {
    loadRequests()
    loadStudents()
    loadSubscriptions()
  }, [filter])

  async function loadRequests() {
    const supabase = createClient()
    let query = supabase
      .from('requests')
      .select(`
        *,
        student:student_id (id, name, email),
        subscription:subscription_id (id, name)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setRequests((data as any) || [])
    setLoading(false)
  }

  async function loadStudents() {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'student')
      .order('name')
    setStudents(data || [])
  }

  async function loadSubscriptions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('id, name')
      .order('name')
    setSubscriptions(data || [])
  }

  const handleResolveRequest = async (id: string, action?: string) => {
    const supabase = createClient()

    if (action === 'reset_password') {
      // Reset student's password
      if (newStudentData.password && selectedRequest?.student_id) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          selectedRequest.student_id,
          { password: newStudentData.password }
        )

        if (authError) {
          alert(authError.message)
          return
        }
      }
      setNewStudentData({ email: '', name: '', password: '' })
    }

    if (action === 'approve_registration') {
      // Create student account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newStudentData.email,
        password: newStudentData.password,
        email_confirm: true,
      })

      if (authError) {
        alert(authError.message)
        return
      }

      const { error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newStudentData.email,
          name: newStudentData.name,
          role: 'student',
        })

      if (error) {
        alert(error.message)
        return
      }

      setNewStudentData({ email: '', name: '', password: '' })
    }

    if (action === 'give_extra_attempt') {
      // For extra attempts, grant additional attempts to the student
      // Parse the message to find the exam title
      const match = selectedRequest?.message.match(/exam: (.+)/i)
      if (match && selectedRequest?.student_id && selectedRequest?.subscription_id) {
        // Find the exam
        const { data: exams } = await supabase
          .from('exams')
          .select('id, title')
          .eq('subscription_id', selectedRequest.subscription_id)
        
        const exam = exams?.find(e => e.title === match[1].trim())
        
        if (exam && selectedRequest?.student_id) {
          // Grant extra attempts in student_attempt_limits table
          const { data: existing } = await supabase
            .from('student_attempt_limits')
            .select('extra_attempts')
            .eq('student_id', selectedRequest.student_id)
            .eq('exam_id', exam.id)
            .single()

          if (existing) {
            // Update existing
            await supabase
              .from('student_attempt_limits')
              .update({ extra_attempts: existing.extra_attempts + extraAttempts })
              .eq('student_id', selectedRequest.student_id)
              .eq('exam_id', exam.id)
          } else {
            // Insert new
            await supabase
              .from('student_attempt_limits')
              .insert({
                student_id: selectedRequest.student_id,
                exam_id: exam.id,
                extra_attempts: extraAttempts
              })
          }
        }
      }
    }

    // Mark request as resolved
    const { error } = await supabase
      .from('requests')
      .update({ status: 'resolved' })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setActionDialogOpen(false)
    setSelectedRequest(null)
    loadRequests()
  }

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'forgot_password':
        return <Key className="h-5 w-5" />
      case 'registration_request':
        return <UserPlus className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  const getRequestTitle = (type: string) => {
    switch (type) {
      case 'forgot_password':
        return 'Forgot Password'
      case 'extra_attempt':
        return 'Request Extra Attempt'
      case 'exam_issue':
        return 'Exam Issue'
      case 'general_issue':
        return 'General Issue'
      case 'registration_request':
        return 'Registration Request'
      default:
        return type
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const resolvedRequests = requests.filter(r => r.status === 'resolved')

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Requests</h1>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p>No requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={request.status === 'pending' ? 'border-yellow-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {getRequestIcon(request.type)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{getRequestTitle(request.type)}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {request.status}
                        </span>
                      </CardTitle>
                      {request.student ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {request.student.name} ({request.student.email})
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {request.email}
                        </p>
                      )}
                      {request.subscription && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Subscription: {request.subscription.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setActionType(request.type)
                          setActionDialogOpen(true)
                        }}
                      >
                        Take Action
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{request.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>
              Take Action - {selectedRequest && getRequestTitle(selectedRequest.type)}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && actionType === 'forgot_password' && (
                'Reset this student\'s password. They can use the new password to login.'
              )}
              {selectedRequest && actionType === 'registration_request' && (
                'Create an account for this student'
              )}
              {selectedRequest && actionType === 'extra_attempt' && (
                'Grant extra attempts to this student'
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && actionType === 'forgot_password' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Student Email</Label>
                <Input value={selectedRequest.student?.email || selectedRequest.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newStudentData.password}
                  onChange={(e) => setNewStudentData({ ...newStudentData, password: e.target.value })}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will reset the student's password without requiring verification.
              </p>
            </div>
          )}

          {selectedRequest && actionType === 'registration_request' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Student Email</Label>
                <Input
                  value={newStudentData.email}
                  onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                  placeholder="student@student.mindcraft.app"
                />
              </div>
              <div className="space-y-2">
                <Label>Student Name</Label>
                <Input
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  placeholder="Student Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input
                  type="password"
                  value={newStudentData.password}
                  onChange={(e) => setNewStudentData({ ...newStudentData, password: e.target.value })}
                  placeholder="Initial password"
                />
              </div>
            </div>
          )}

          {selectedRequest && actionType === 'extra_attempt' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Extra Attempts</Label>
                <Input
                  type="number"
                  value={extraAttempts}
                  onChange={(e) => setExtraAttempts(parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Grant additional attempts for this student
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequest) {
                  let action = 'mark_resolved'
                  if (actionType === 'registration_request') {
                    action = 'approve_registration'
                  } else if (actionType === 'extra_attempt') {
                    action = 'give_extra_attempt'
                  } else if (actionType === 'forgot_password') {
                    action = 'reset_password'
                  }
                  handleResolveRequest(selectedRequest.id, action)
                }
              }}
            >
              {actionType === 'forgot_password' && 'Reset Password'}
              {actionType === 'registration_request' && 'Create Account'}
              {actionType === 'extra_attempt' && 'Grant Attempts'}
              {!['forgot_password', 'registration_request', 'extra_attempt'].includes(actionType) && 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

