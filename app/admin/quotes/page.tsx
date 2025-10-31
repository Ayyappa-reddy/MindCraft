'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Lightbulb } from 'lucide-react'

interface Quote {
  id: string
  quote: string
  author?: string | null
  created_at: string
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

  const [formData, setFormData] = useState({
    quote: '',
    author: '',
  })

  useEffect(() => {
    loadQuotes()
  }, [])

  async function loadQuotes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('motivational_quotes')
      .select('*')
      .order('created_at', { ascending: false })

    setQuotes(data || [])
    setLoading(false)
  }

  const handleAddQuote = async () => {
    const supabase = createClient()

    const { error } = await supabase
      .from('motivational_quotes')
      .insert({
        quote: formData.quote,
        author: formData.author || null,
      })

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setIsAddDialogOpen(false)
    setFormData({ quote: '', author: '' })
    loadQuotes()
  }

  const handleUpdateQuote = async () => {
    if (!selectedQuote) return

    const supabase = createClient()
    const { error } = await supabase
      .from('motivational_quotes')
      .update({
        quote: formData.quote,
        author: formData.author || null,
      })
      .eq('id', selectedQuote.id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setSelectedQuote(null)
    setFormData({ quote: '', author: '' })
    loadQuotes()
  }

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('motivational_quotes')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    loadQuotes()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Motivational Quotes</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage motivational quotes displayed on student dashboard</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Quote
        </Button>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No quotes yet. Add your first motivational quote!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-lg italic">"{quote.quote}"</p>
                    {quote.author && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">— {quote.author}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(quote)
                        setFormData({
                          quote: quote.quote,
                          author: quote.author || '',
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
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!selectedQuote} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setSelectedQuote(null)
          setFormData({ quote: '', author: '' })
        }
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{selectedQuote ? 'Edit Quote' : 'Add New Quote'}</DialogTitle>
            <DialogDescription>
              {selectedQuote ? 'Update quote details' : 'Add a new motivational quote'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quote">Quote</Label>
              <Textarea
                id="quote"
                placeholder='e.g., "The only way to do great work is to love what you do."'
                value={formData.quote}
                onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author (Optional)</Label>
              <Input
                id="author"
                placeholder="e.g., Steve Jobs"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setSelectedQuote(null)
            }}>Cancel</Button>
            <Button onClick={selectedQuote ? handleUpdateQuote : handleAddQuote}>
              {selectedQuote ? 'Save Changes' : 'Add Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

