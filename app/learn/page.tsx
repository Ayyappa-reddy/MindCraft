'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, ExternalLink } from 'lucide-react'

interface Subscription {
  id: string
  name: string
  description: string
}

interface Topic {
  id: string
  title: string
  explanation: string
  visualization_links: string[]
}

export default function LearnPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<string>('')
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('student_subscriptions')
      .select('subscriptions:subscription_id (*)')
      .eq('student_id', user.id)
      .eq('status', 'approved')

    if (data) {
      const approvedSubs = data.map((item: any) => item.subscriptions).filter(Boolean)
      setSubscriptions(approvedSubs)
      if (approvedSubs.length > 0) {
        setSelectedSubscription(approvedSubs[0].id)
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              <a href="/learn" className="text-blue-600 font-medium">Learn</a>
              <a href="/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
              <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
              <a href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Profile</a>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Learning Materials</h1>
          <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
            <SelectTrigger className="w-full md:w-96">
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

        {selectedSubscription && (
          <>
            {subscriptions.find(s => s.id === selectedSubscription) && (
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  {subscriptions.find(s => s.id === selectedSubscription)?.description}
                </p>
              </div>
            )}

            {topics.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No topics available yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {topics.map((topic) => (
                  <Card key={topic.id}>
                    <CardHeader>
                      <CardTitle>{topic.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none mb-6">
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {topic.explanation}
                        </p>
                      </div>
                      {topic.visualization_links.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Interactive Visualizations:</h4>
                          <div className="space-y-2">
                            {topic.visualization_links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {subscriptions.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="mb-4">You haven't subscribed to any subscriptions yet.</p>
              <Button asChild>
                <a href="/exams">Browse Subscriptions</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

