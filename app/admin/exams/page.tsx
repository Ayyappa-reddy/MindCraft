'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, FileText, Edit, Trash2, Users, Clock } from 'lucide-react'

interface Subscription {
  id: string
  name: string
  description: string
  created_at: string
  _count?: { exams: number, student_subscriptions: number }
}

interface StudentSubscription {
  id: string
  student: { id: string, name: string, email: string }
  status: string
}

export default function ExamsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [studentSubscriptions, setStudentSubscriptions] = useState<StudentSubscription[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    loadSubscriptions()
  }, [])

  async function loadSubscriptions() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      // Load counts
      const subscriptionsWithCounts = await Promise.all(
        data.map(async (sub) => {
          const [exams, studentSubs] = await Promise.all([
            supabase.from('exams').select('id', { count: 'exact', head: true }).eq('subscription_id', sub.id),
            supabase.from('student_subscriptions').select('id', { count: 'exact', head: true }).eq('subscription_id', sub.id),
          ])
          return {
            ...sub,
            _count: { exams: exams.count || 0, student_subscriptions: studentSubs.count || 0 }
          }
        })
      )
      setSubscriptions(subscriptionsWithCounts)
    }
    setLoading(false)
  }

  async function loadStudentSubscriptions(subscriptionId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('student_subscriptions')
      .select(`
        id,
        status,
        student:student_id (id, name, email)
      `)
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })

    if (data) {
      setStudentSubscriptions(data as any)
    }
  }

  const handleAddSubscription = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('subscriptions')
      .insert({
        name: formData.name,
        description: formData.description,
        created_by: user?.id,
      })

    if (error) {
      alert(error.message)
      return
    }

    setIsAddDialogOpen(false)
    setFormData({ name: '', description: '' })
    loadSubscriptions()
  }

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return

    const supabase = createClient()
    const { error } = await supabase
      .from('subscriptions')
      .update({
        name: formData.name,
        description: formData.description,
      })
      .eq('id', selectedSubscription.id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedSubscription(null)
    setFormData({ name: '', description: '' })
    loadSubscriptions()
  }

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure? This will delete all exams and topics in this subscription.')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    loadSubscriptions()
  }

  const handleApproveSubscription = async (studentSubscriptionId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('student_subscriptions')
      .update({ status: 'approved' })
      .eq('id', studentSubscriptionId)

    if (error) {
      alert(error.message)
      return
    }

    loadStudentSubscriptions(selectedSubscription!.id)
  }

  const handleDenySubscription = async (studentSubscriptionId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('student_subscriptions')
      .update({ status: 'denied' })
      .eq('id', studentSubscriptionId)

    if (error) {
      alert(error.message)
      return
    }

    loadStudentSubscriptions(selectedSubscription!.id)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Subscriptions & Exams</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button asChild>
            <Link href="#" onClick={(e) => { e.preventDefault(); setIsAddDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Link>
          </Button>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Create New Subscription</DialogTitle>
              <DialogDescription>
                Create a new subscription plan that students can subscribe to
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Python Programming, GRE Prep"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the subscription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSubscription}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p>No subscriptions yet. Create your first subscription to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{sub.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{sub.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSubscription(sub)
                        setIsEditMode(false)
                        loadStudentSubscriptions(sub.id)
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Requests
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/exams/${sub.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Manage Exams
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSubscription(sub)
                        setIsEditMode(true)
                        setFormData({ name: sub.name, description: sub.description })
                        setStudentSubscriptions([])
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSubscription(sub.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span>{sub._count?.exams || 0} Exams</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span>{sub._count?.student_subscriptions || 0} Students</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {selectedSubscription && isEditMode && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            setSelectedSubscription(null)
            setIsEditMode(false)
            setFormData({ name: '', description: '' })
          }
        }}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedSubscription(null)
                setFormData({ name: '', description: '' })
              }}>Cancel</Button>
              <Button onClick={handleUpdateSubscription}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Subscriptions Dialog */}
      {selectedSubscription && !isEditMode && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            setSelectedSubscription(null)
            setIsEditMode(false)
            setStudentSubscriptions([])
          }
        }}>
          <DialogContent className="bg-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Student Subscription Requests - {selectedSubscription.name}</DialogTitle>
              <DialogDescription>
                Approve or deny student subscription requests
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {studentSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No student subscriptions found for this subscription.
                </div>
              ) : (
                studentSubscriptions.map((ss: any) => (
                  <Card key={ss.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{ss.student.name}</p>
                          <p className="text-sm text-gray-600">{ss.student.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            ss.status === 'approved' ? 'bg-green-100 text-green-700' :
                            ss.status === 'denied' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {ss.status}
                          </span>
                          {ss.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveSubscription(ss.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDenySubscription(ss.id)}
                              >
                                Deny
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSelectedSubscription(null)
                setIsEditMode(false)
                setStudentSubscriptions([])
              }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

