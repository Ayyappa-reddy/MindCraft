'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, Key, Eye } from 'lucide-react'

interface Student {
  id: string
  email: string
  name: string
  dp?: string
  first_name?: string
  last_name?: string
  display_name?: string
  dob?: string
  phone?: string
  personal_email?: string
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    dob: '',
    phone: '',
    personalEmail: '',
  })

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, dp, first_name, last_name, display_name, dob, phone, personal_email')
      .eq('role', 'student')
      .order('name')

    if (data) {
      setStudents(data)
    }
    setLoading(false)
  }

  const handleAddStudent = async () => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob || undefined,
        phone: formData.phone || undefined,
        personalEmail: formData.personalEmail || undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to create user')
      return
    }
    setIsAddDialogOpen(false)
    setFormData({ email: '', firstName: '', lastName: '', password: '', dob: '', phone: '', personalEmail: '' })
    loadStudents()
  }

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return

    const res = await fetch(`/api/admin/users/${selectedStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        dob: formData.dob || undefined,
        phone: formData.phone || undefined,
        personalEmail: formData.personalEmail || undefined,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to update user')
      return
    }

    setIsEditDialogOpen(false)
    setSelectedStudent(null)
    setFormData({ email: '', firstName: '', lastName: '', password: '', dob: '', phone: '', personalEmail: '' })
    loadStudents()
  }

  const handleResetPassword = async () => {
    if (!selectedStudent) return

    const res = await fetch(`/api/admin/users/${selectedStudent.id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: formData.password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to reset password')
      return
    }

    setIsPasswordDialogOpen(false)
    setFormData({ email: '', firstName: '', lastName: '', password: '', dob: '', phone: '', personalEmail: '' })
    alert('Password reset successfully')
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })

    setIsEditDialogOpen(false)
    loadStudents()
  }

  const filteredStudents = students.filter(
    student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Students</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
              <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Create a new student account. The student can change their password after first login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@student.mindcraft.app"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Initial Password</Label>
                <Input
                  id="password"
                  type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+1 555 123 4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalEmail">Personal Email (Optional)</Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      placeholder="student.personal@gmail.com (optional)"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                    />
                  </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStudent}>Create Student</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p>Loading...</p>
        ) : filteredStudents.length === 0 ? (
          <p>No students found</p>
        ) : (
          filteredStudents.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/admin/students/${student.id}`)}
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {student.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog open={isViewDialogOpen && selectedStudent?.id === student.id} onOpenChange={(open) => {
                      setIsViewDialogOpen(open)
                      if (open) {
                        setSelectedStudent(student)
                      }
                    }}>
                      <DialogTrigger asChild onClick={() => setSelectedStudent(student)}>
                        <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-300 transition-colors">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Student Details</DialogTitle>
                          <DialogDescription>View student information</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">First Name</Label>
                              <p className="font-medium text-base">{student.first_name || 'Not provided'}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Last Name</Label>
                              <p className="font-medium text-base">{student.last_name || 'Not provided'}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Display Name</Label>
                              <p className="font-medium text-base">{student.display_name || student.name}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Email</Label>
                              <p className="font-medium text-base break-all">{student.email}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Date of Birth</Label>
                              <p className="font-medium text-base">{student.dob ? new Date(student.dob).toLocaleDateString() : 'Not provided'}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Phone</Label>
                              <p className="font-medium text-base">{student.phone || 'Not provided'}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-500">Personal Email</Label>
                              <p className="font-medium text-base break-all">{student.personal_email || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="hover:bg-gray-50">
                            Close
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isEditDialogOpen && selectedStudent?.id === student.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open)
                      if (open) {
                        setSelectedStudent(student)
                        setFormData({
                          email: student.email,
                          firstName: student.first_name || '',
                          lastName: student.last_name || '',
                          dob: student.dob || '',
                          phone: student.phone || '',
                          personalEmail: student.personal_email || '',
                          password: '',
                        })
                      }
                    }}>
                      <DialogTrigger asChild onClick={() => setSelectedStudent(student)}>
                        <Button variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300 transition-colors">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Edit Student</DialogTitle>
                          <DialogDescription>
                            Update student information
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-first">First Name</Label>
                              <Input
                                id="edit-first"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-last">Last Name</Label>
                              <Input
                                id="edit-last"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                              <Label htmlFor="edit-dob">Date of Birth</Label>
                              <Input
                                id="edit-dob"
                                type="date"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-phone">Phone</Label>
                              <Input
                                id="edit-phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2 mt-2">
                            <Label htmlFor="edit-personal">Personal Email (Optional)</Label>
                            <Input
                              id="edit-personal"
                              type="email"
                              value={formData.personalEmail}
                              onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                            />
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            Email: {student.email}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateStudent}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isPasswordDialogOpen && selectedStudent?.id === student.id} onOpenChange={(open) => {
                      setIsPasswordDialogOpen(open)
                      if (open) {
                        setSelectedStudent(student)
                        setFormData({ email: '', firstName: '', lastName: '', password: '', dob: '', phone: '', personalEmail: '' })
                      }
                    }}>
                      <DialogTrigger asChild onClick={() => setSelectedStudent(student)}>
                        <Button variant="outline" size="sm" className="hover:bg-yellow-50 hover:border-yellow-300 transition-colors">
                          <Key className="mr-2 h-4 w-4" />
                          Reset Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Set a new password for {student.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleResetPassword}>Reset Password</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStudent(student.id)}
                      className="hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

