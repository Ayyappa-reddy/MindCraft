'use client'

import { useState, useMemo } from 'react'
import Split from 'react-split'
import { Button } from '@/components/ui/button'
import CodeEditor from '@/components/code-editor'
import { Play, Save, CheckCircle, XCircle, Loader2, Info } from 'lucide-react'

interface TestCase {
  input: string
  output: string
  hidden: boolean
}

interface TestCaseResult {
  passed: boolean
  actualOutput: string
  expectedOutput: string
  error?: string
  executionTime: number
}

interface CodingQuestionLayoutProps {
  question: {
    id: string
    question_text: string
    test_cases?: TestCase[]
    marks: number
  }
  code: string
  language: string
  onCodeChange: (code: string) => void
  onLanguageChange: (language: string) => void
  onRun: (results: TestCaseResult[]) => void
  onSave: () => void
  hasRunCode: boolean
  testResults?: TestCaseResult[]
  isRunning?: boolean
}

export default function CodingQuestionLayout({
  question,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onRun,
  onSave,
  hasRunCode,
  testResults,
  isRunning = false,
}: CodingQuestionLayoutProps) {
  const [consoleOutput, setConsoleOutput] = useState('')

  // Memoize gutterStyle to avoid recreating on each render
  const gutterStyle = useMemo(() => {
    return () => ({
      backgroundColor: '#4B5563', // gray-600
      cursor: 'col-resize',
    })
  }, [])

  const handleRun = async () => {
    setConsoleOutput('Running code...\n')
    
    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language,
          code,
          testCases: question.test_cases || [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        setConsoleOutput(`Error: ${error.error || 'Failed to execute code'}\n`)
        onRun([])
        return
      }

      const data = await response.json()
      const results: TestCaseResult[] = data.results

      // Update console with execution summary
      const passedCount = results.filter(r => r.passed).length
      const totalCount = results.length
      const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length

      setConsoleOutput(
        `✓ Execution completed!\n` +
        `Test cases passed: ${passedCount}/${totalCount}\n` +
        `Average time: ${avgTime.toFixed(0)}ms`
      )

      onRun(results)
    } catch (error: any) {
      setConsoleOutput(`✗ Error: ${error.message || 'Failed to execute code'}\n`)
      onRun([])
    }
  }

  const sampleTestCases = question.test_cases?.filter(tc => !tc.hidden) || []

  return (
    <div className="h-[calc(100vh-200px)] flex">
      <Split
        sizes={[20, 80]}
        minSize={[250, 600]}
        direction="horizontal"
        className="flex h-full"
        gutterSize={8}
        gutterStyle={gutterStyle}
      >
        {/* Left Pane: Compact Question Info */}
        <div className="h-full overflow-auto bg-gray-900 p-4">
          <div className="space-y-4 text-white">
            <div className="flex items-center space-x-2 mb-4">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400">Question</span>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {question.question_text}
              </p>
            </div>

            {sampleTestCases.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-semibold text-gray-400">Sample Tests</span>
                </div>
                <div className="space-y-2">
                  {sampleTestCases.map((testCase, index) => (
                    <div key={index} className="bg-gray-900 rounded p-2 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Test {index + 1}</div>
                      <div className="text-xs font-mono text-gray-300 space-y-1">
                        <div>In: <span className="text-white">{testCase.input}</span></div>
                        <div>Out: <span className="text-green-400">{testCase.output}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-xs text-gray-400">
              <div className="mb-1">
                <span className="text-gray-500">Total Tests:</span> {question.test_cases?.length || 0}
              </div>
              <div className="mb-1">
                <span className="text-gray-500">Hidden:</span> {question.test_cases?.filter(tc => tc.hidden).length || 0}
              </div>
              <div>
                <span className="text-gray-500">Marks:</span> {question.marks}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Code Editor and Results */}
        <div className="h-full flex flex-col bg-white dark:bg-gray-950">
          {/* Code Editor - Takes most space */}
          <div className="flex-1 min-h-0 border-b border-gray-200 dark:border-gray-800">
            <CodeEditor
              value={code}
              onChange={onCodeChange}
              language={language}
              onLanguageChange={onLanguageChange}
            />
          </div>

          {/* Bottom Panel: Controls and Results */}
          <div className="h-[300px] flex flex-col border-t-2 border-gray-300 dark:border-gray-700">
            {/* Action Buttons */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSave}
                  className="h-8 px-4"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={isRunning || !code.trim()}
                  className="h-8 px-4 bg-green-600 hover:bg-green-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                {hasRunCode && testResults && (
                  <span className="font-semibold">
                    {testResults.filter(r => r.passed).length}/{testResults.length} passed
                  </span>
                )}
              </div>
            </div>

            {/* Test Results and Console - Split vertically */}
            <div className="flex-1 flex">
              {/* Test Results */}
              <div className="flex-1 overflow-auto bg-white dark:bg-gray-950 p-3">
                {hasRunCode && testResults ? (
                  <div className="space-y-2">
                    {question.test_cases?.map((testCase, index) => {
                      const result = testResults[index]
                      if (!result) return null

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded text-xs border ${
                            result.passed
                              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                              : 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {result.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-semibold">
                              Test {index + 1}
                              {testCase.hidden && ' • Hidden'}
                            </span>
                          </div>
                          <span className="text-gray-500">{result.executionTime}ms</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Run your code to see test results
                  </div>
                )}
              </div>

              {/* Console Output */}
              <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-black text-green-400 font-mono text-xs p-3 overflow-auto">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {consoleOutput || 'Ready to execute...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Split>
    </div>
  )
}
