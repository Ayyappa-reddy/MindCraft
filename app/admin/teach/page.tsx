'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react'

interface Subscription {
  id: string
  name: string
}

interface Topic {
  id: string
  title: string
  explanation: string
  visualization_links: string[]
}

export default function TeachPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    explanation: '',
    links: '',
  })

  useEffect(() => {
    loadSubscriptions()
  }, [])

  useEffect(() => {
    if (selectedSubscription) {
      loadTopics()
    }
  }, [selectedSubscription])

  async function loadSubscriptions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('subscriptions')
      .select('id, name')
      .order('name')

    if (data) {
      setSubscriptions(data)
      if (data.length > 0) {
        setSelectedSubscription(data[0].id)
      }
    }
    setLoading(false)
  }

  async function loadTopics() {
    const supabase = createClient()
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('subscription_id', selectedSubscription)
      .order('created_at', { ascending: false })

    setTopics(data || [])
  }

  const handleAddTopic = async () => {
    const supabase = createClient()

    const links = formData.links
      .split('\n')
      .map(link => link.trim())
      .filter(link => link.length > 0)

    const { error } = await supabase
      .from('topics')
      .insert({
        subscription_id: selectedSubscription,
        title: formData.title,
        explanation: formData.explanation,
        visualization_links: links,
      })

    if (error) {
      alert(error.message)
      return
    }

    setIsAddDialogOpen(false)
    setFormData({ title: '', explanation: '', links: '' })
    loadTopics()
  }

  const handleUpdateTopic = async () => {
    if (!selectedTopic) return

    const supabase = createClient()

    const links = formData.links
      .split('\n')
      .map(link => link.trim())
      .filter(link => link.length > 0)

    const { error } = await supabase
      .from('topics')
      .update({
        title: formData.title,
        explanation: formData.explanation,
        visualization_links: links,
      })
      .eq('id', selectedTopic.id)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedTopic(null)
    setFormData({ title: '', explanation: '', links: '' })
    loadTopics()
  }

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    loadTopics()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Teach - Topics & Content</h1>
        <Button onClick={() => setIsAddDialogOpen(true)} disabled={!selectedSubscription}>
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </div>

      <div className="mb-6">
        <Label>Select Subscription</Label>
        <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
          <SelectTrigger className="w-full md:w-96 mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subscriptions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSubscription ? (
        topics.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p>No topics yet. Create your first topic for this subscription.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {topics.map((topic) => (
              <Card key={topic.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{topic.title}</CardTitle>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTopic(topic)
                          setFormData({
                            title: topic.title,
                            explanation: topic.explanation,
                            links: topic.visualization_links.join('\n'),
                          })
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTopic(topic.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{topic.explanation}</p>
                  </div>
                  {topic.visualization_links.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Visualization Links:</h4>
                      <ul className="space-y-1">
                        {topic.visualization_links.map((link, idx) => (
                          <li key={idx}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please create a subscription first in the Exams page.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!selectedTopic} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setSelectedTopic(null)
          setFormData({ title: '', explanation: '', links: '' })
        }
      }}>
        <DialogContent className="bg-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTopic ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
            <DialogDescription>
              {selectedTopic ? 'Update topic content' : 'Create educational content for students'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Topic Title</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Sorting Algorithms"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation</Label>
              <Textarea
                id="explanation"
                placeholder="Detailed explanation of the topic..."
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={10}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">Supports markdown formatting</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="links">Visualization Links (one per line)</Label>
              <Textarea
                id="links"
                placeholder="https://example.com/visualization1&#10;https://example.com/visualization2"
                value={formData.links}
                onChange={(e) => setFormData({ ...formData, links: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-gray-500">Add links to interactive visualizations or demos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedTopic(null)
            }}>Cancel</Button>
            <Button onClick={selectedTopic ? handleUpdateTopic : handleAddTopic}>
              {selectedTopic ? 'Save Changes' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

