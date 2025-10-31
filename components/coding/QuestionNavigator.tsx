'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export interface NavigatorQuestion {
  id: string
  number: number
  type: 'mcq' | 'coding'
  answered: boolean
  visited: boolean
  current: boolean
}

interface QuestionNavigatorProps {
  questions: NavigatorQuestion[]
  onNavigate: (questionId: string) => void
}

export default function QuestionNavigator({ questions, onNavigate }: QuestionNavigatorProps) {
  const mcqQuestions = questions.filter(q => q.type === 'mcq')
  const codingQuestions = questions.filter(q => q.type === 'coding')

  const renderQuestions = (questionsList: NavigatorQuestion[], label: string) => {
    if (questionsList.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {questionsList.map((question, index) => {
            let statusClass = ''
            let StatusIcon = Circle

            if (question.current) {
              statusClass = 'bg-[#2563eb] text-white border-[#2563eb] ring-2 ring-[#2563eb] ring-offset-2'
              StatusIcon = AlertCircle
            } else if (question.answered) {
              statusClass = 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
              StatusIcon = CheckCircle
            } else if (question.visited) {
              statusClass = 'bg-yellow-100 border-yellow-500 text-yellow-700 hover:bg-yellow-200'
              StatusIcon = Circle
            } else {
              statusClass = 'bg-white border-gray-400 text-gray-700 hover:bg-gray-100'
              StatusIcon = Circle
            }

            return (
              <motion.button
                key={question.id}
                onClick={() => onNavigate(question.id)}
                className={`
                  relative flex items-center justify-center
                  h-10 rounded-lg border-2 font-semibold text-sm
                  transition-all duration-200
                  ${statusClass}
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="z-10">{index + 1}</span>
                <StatusIcon className="absolute top-1 right-1 h-3 w-3 opacity-50" />
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full bg-gray-50 border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-bold text-gray-900">Question Navigator</h2>
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-4 space-y-6">
          {renderQuestions(mcqQuestions, 'Multiple Choice')}
          {renderQuestions(codingQuestions, 'Coding Problems')}

          {/* Legend */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Legend
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border-2 border-[#2563eb] bg-[#2563eb] ring-2 ring-[#2563eb] ring-offset-1" />
                <span className="text-gray-700">Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border-2 border-green-500 bg-green-100" />
                <span className="text-gray-700">Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border-2 border-yellow-500 bg-yellow-100" />
                <span className="text-gray-700">Visited</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded border-2 border-gray-400 bg-white" />
                <span className="text-gray-700">Not Visited</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  )
}

