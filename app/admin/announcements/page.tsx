'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  created_by?: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    message: '',
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    const supabase = createClient()
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    setAnnouncements(data || [])
    setLoading(false)
  }

  const handleAddAnnouncement = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: formData.title,
        message: formData.message,
        type: 'manual',
        created_by: user.id,
      })

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setIsAddDialogOpen(false)
    setFormData({ title: '', message: '' })
    loadAnnouncements()
  }

  const handleUpdateAnnouncement = async () => {
    if (!selectedAnnouncement) return

    const supabase = createClient()
    const { error } = await supabase
      .from('announcements')
      .update({
        title: formData.title,
        message: formData.message,
      })
      .eq('id', selectedAnnouncement.id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setSelectedAnnouncement(null)
    setFormData({ title: '', message: '' })
    loadAnnouncements()
  }

  const handleDeleteAnnouncement = async (id: string) => {
    // Don't allow deletion of auto-generated announcements
    const announcement = announcements.find(a => a.id === id)
    if (announcement?.type === 'auto') {
      alert('Cannot delete auto-generated announcements.')
      return
    }

    if (!confirm('Are you sure you want to delete this announcement?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    loadAnnouncements()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage announcements for students</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No announcements yet. Create your first announcement!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle>{announcement.title}</CardTitle>
                      <span className={`text-xs px-2 py-1 rounded ${
                        announcement.type === 'auto' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {announcement.type === 'auto' ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {announcement.message}
                    </p>
                  </div>
                  {announcement.type === 'manual' && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAnnouncement(announcement)
                          setFormData({
                            title: announcement.title,
                            message: announcement.message,
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
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">
                  Created: {new Date(announcement.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!selectedAnnouncement} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setSelectedAnnouncement(null)
          setFormData({ title: '', message: '' })
        }
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement ? 'Update announcement details' : 'Create a new announcement for students'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., New Practice Test Available"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter announcement message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedAnnouncement(null)
            }}>Cancel</Button>
            <Button onClick={selectedAnnouncement ? handleUpdateAnnouncement : handleAddAnnouncement}>
              {selectedAnnouncement ? 'Save Changes' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

