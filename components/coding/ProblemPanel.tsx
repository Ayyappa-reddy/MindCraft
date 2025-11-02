'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import MarkdownText from '@/components/MarkdownText'

interface Example {
  input: string
  output: string
  explanation?: string
}

interface ProblemPanelProps {
  title?: string
  description: string
  inputFormat?: string
  outputFormat?: string
  examples?: Example[]
  constraints?: string
  marks: number
}

export default function ProblemPanel({
  title,
  description,
  inputFormat,
  outputFormat,
  examples,
  constraints,
  marks,
}: ProblemPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    input: true,
    output: true,
    examples: true,
    constraints: true,
  })
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="h-full bg-[#f9fafb] border-r border-gray-200">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-[#1f2937] mb-2">
              {title || 'Problem Statement'}
            </h1>
            <div className="text-sm text-gray-600">{marks} mark{marks !== 1 ? 's' : ''}</div>
          </div>

          {/* Description */}
          <Card className="p-4 bg-white border-gray-200">
            <div className="text-[#1f2937] leading-relaxed">
              <MarkdownText>{description}</MarkdownText>
            </div>
          </Card>

          {/* Input Format */}
          {inputFormat && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('input')}
                className="flex items-center space-x-2 text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition-colors"
              >
                {expandedSections.input ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Input Format</span>
              </button>
              <AnimatePresence>
                {expandedSections.input && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-4 bg-white border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{inputFormat}</p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Output Format */}
          {outputFormat && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('output')}
                className="flex items-center space-x-2 text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition-colors"
              >
                {expandedSections.output ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Output Format</span>
              </button>
              <AnimatePresence>
                {expandedSections.output && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-4 bg-white border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{outputFormat}</p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Examples */}
          {examples && examples.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('examples')}
                className="flex items-center space-x-2 text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition-colors"
              >
                {expandedSections.examples ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Examples</span>
              </button>
              <AnimatePresence>
                {expandedSections.examples && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {examples.map((example, index) => (
                      <Card key={index} className="p-4 bg-white border-gray-200 space-y-3">
                        <div className="font-semibold text-[#1f2937]">Example {index + 1}</div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Input:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(example.input, index * 2)}
                              className="h-6 px-2"
                            >
                              {copiedIndex === index * 2 ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="bg-gray-50 p-3 rounded border border-gray-200 text-sm font-mono overflow-x-auto">
                            {example.input}
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Output:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(example.output, index * 2 + 1)}
                              className="h-6 px-2"
                            >
                              {copiedIndex === index * 2 + 1 ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="bg-gray-50 p-3 rounded border border-gray-200 text-sm font-mono overflow-x-auto">
                            {example.output}
                          </pre>
                        </div>

                        {example.explanation && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Explanation:</span>
                            <div className="mt-1 text-gray-700 text-sm">
                              <MarkdownText>{example.explanation}</MarkdownText>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Constraints */}
          {constraints && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('constraints')}
                className="flex items-center space-x-2 text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition-colors"
              >
                {expandedSections.constraints ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Constraints</span>
              </button>
              <AnimatePresence>
                {expandedSections.constraints && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-4 bg-white border-gray-200">
                      <p className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
                        {constraints}
                      </p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

