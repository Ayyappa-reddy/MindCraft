'use client'

import { useState, useCallback, useEffect } from 'react'
import ProblemPanel from './ProblemPanel'
import EditorPanel, { type TestCaseResult } from './EditorPanel'
import QuestionNavigator, { type NavigatorQuestion } from './QuestionNavigator'

interface TestCase {
  input: string
  output: string
  hidden: boolean
}

interface Question {
  id: string
  type: 'mcq' | 'coding'
  question_text: string
  options?: string[]
  correct_answer?: string
  marks: number
  test_cases?: TestCase[]
  title?: string
  input_format?: string
  output_format?: string
  examples?: Array<{
    input: string
    output: string
    explanation?: string
  }>
  constraints?: string
}

interface CodingExamLayoutProps {
  questions: Question[]
  currentQuestionIndex: number
  onNavigate: (index: number) => void
  answers: Record<string, any>
  onAnswerChange: (questionId: string, answer: any) => void
  visitedQuestions: Set<number>
  onAutoSave?: () => void
}

const DEFAULT_CODE_TEMPLATES: Record<string, string> = {
  python: `# Write your code here
def solve():
    pass

if __name__ == "__main__":
    solve()
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    return 0;
}
`,
  javascript: `// Write your code here
function solve() {
    
}

solve();
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}
`,
  c: `#include <stdio.h>

int main() {
    // Write your code here
    return 0;
}
`,
}

export default function CodingExamLayout({
  questions,
  currentQuestionIndex,
  onNavigate,
  answers,
  onAnswerChange,
  visitedQuestions,
  onAutoSave,
}: CodingExamLayoutProps) {
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion?.id] || {}

  const [code, setCode] = useState(currentAnswer.code || DEFAULT_CODE_TEMPLATES['python'])
  const [language, setLanguage] = useState(currentAnswer.language || 'python')
  const [testResults, setTestResults] = useState<TestCaseResult[]>(currentAnswer.testResults || [])
  const [isRunning, setIsRunning] = useState(false)
  const [hasRun, setHasRun] = useState(currentAnswer.hasRun || false)
  const [consoleOutput, setConsoleOutput] = useState('')

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
  }, [])

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage)
    // Reset code to template when language changes
    setCode(DEFAULT_CODE_TEMPLATES[newLanguage])
    setTestResults([])
    setHasRun(false)
    setConsoleOutput('')
  }, [])

  const handleRun = useCallback(async () => {
    if (!currentQuestion || !currentQuestion.test_cases) {
      alert('No test cases available')
      return
    }

    setIsRunning(true)
    setConsoleOutput('Running test cases...\n')

    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          testCases: currentQuestion.test_cases.map(tc => ({
            input: tc.input,
            output: tc.output,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Code execution failed')
      }

      const data = await response.json()
      const results: TestCaseResult[] = data.results

      setTestResults(results)
      setHasRun(true)

      // Generate console output
      const passed = results.filter(r => r.passed).length
      const total = results.length
      let output = `✅ Test Results: ${passed}/${total} passed\n\n`

      results.forEach((result, index) => {
        output += `Test Case ${index + 1}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`
        output += `Execution Time: ${result.executionTime.toFixed(2)}ms\n\n`
      })

      setConsoleOutput(output)

      // Save results to answers
      onAnswerChange(currentQuestion.id, {
        type: 'coding',
        code,
        language,
        testResults: results,
        hasRun: true,
        score: (passed / total) * currentQuestion.marks,
      })

      if (passed === total) {
        // All test cases passed!
      } else if (passed > 0) {
        // Some test cases passed
      }
    } catch (error: any) {
      console.error('Error running code:', error)
      setConsoleOutput(`Error: ${error.message}\n`)
      alert('Failed to run code: ' + error.message)
    } finally {
      setIsRunning(false)
    }
  }, [currentQuestion, code, language, onAnswerChange])

  const handleSave = useCallback(() => {
    if (!currentQuestion) return

    onAnswerChange(currentQuestion.id, {
      type: 'coding',
      code,
      language,
      testResults,
      hasRun,
      score: hasRun ? (testResults.filter(r => r.passed).length / testResults.length) * currentQuestion.marks : 0,
    })

  }, [currentQuestion, code, language, testResults, hasRun, onAnswerChange])

  const handleSubmit = useCallback(() => {
    if (!hasRun) {
      alert('Please run your code before submitting')
      return
    }

    const passed = testResults.filter(r => r.passed).length
    if (passed === 0) {
      alert('You must pass at least one test case to submit')
      return
    }

    handleSave()
  }, [hasRun, testResults, handleSave])

  const handleQuestionNavigate = useCallback((questionId: string) => {
    const index = questions.findIndex(q => q.id === questionId)
    if (index !== -1) {
      onNavigate(index)
    }
  }, [questions, onNavigate])

  // Sync state when question changes
  useEffect(() => {
    if (currentQuestion) {
      const answer = answers[currentQuestion.id] || {}
      setCode(answer.code || DEFAULT_CODE_TEMPLATES[answer.language || 'python'])
      setLanguage(answer.language || 'python')
      setTestResults(answer.testResults || [])
      setHasRun(answer.hasRun || false)
      setConsoleOutput('')
    }
  }, [currentQuestion?.id, answers])

  if (!currentQuestion) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>
  }

  const isCodingQuestion = currentQuestion.type === 'coding'
  const testCases = currentQuestion.test_cases || []
  const passed = testResults.filter(r => r.passed).length
  const canSubmit = hasRun && passed > 0

  // Build navigator questions
  const navigatorQuestions: NavigatorQuestion[] = questions.map((q, index) => ({
    id: q.id,
    number: index + 1,
    type: q.type,
    answered: !!answers[q.id] && (q.type === 'mcq' ? !!answers[q.id].answer : answers[q.id].hasRun),
    visited: visitedQuestions.has(index),
    current: index === currentQuestionIndex,
  }))

  return (
    <div className="h-[calc(100vh-100px)] flex">
      {/* Left: Problem Panel */}
      <div className="w-[30%]">
        <ProblemPanel
          title={currentQuestion.title}
          description={currentQuestion.question_text}
          inputFormat={currentQuestion.input_format}
          outputFormat={currentQuestion.output_format}
          examples={currentQuestion.examples}
          constraints={currentQuestion.constraints}
          marks={currentQuestion.marks}
        />
      </div>

      {/* Middle: Editor Panel (only for coding questions) */}
      {isCodingQuestion && (
        <div className="flex-1 min-h-0">
          <EditorPanel
            language={language}
            code={code}
            onLanguageChange={handleLanguageChange}
            onCodeChange={handleCodeChange}
            onRun={handleRun}
            onSave={handleSave}
            onSubmit={handleSubmit}
            testCases={testCases}
            testResults={testResults}
            isRunning={isRunning}
            hasRun={hasRun}
            consoleOutput={consoleOutput}
            canSubmit={canSubmit}
          />
        </div>
      )}

      {/* For MCQ questions, show a simple answer area */}
      {!isCodingQuestion && (
        <div className="flex-1 bg-white p-8">
          <div className="space-y-4">
            {currentQuestion.options?.map((option, optIdx) => (
              <label
                key={optIdx}
                className="flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id]?.answer === option}
                  onChange={() => onAnswerChange(currentQuestion.id, { type: 'mcq', answer: option })}
                  className="h-5 w-5"
                />
                <span className="text-lg">{String.fromCharCode(65 + optIdx)}. {option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Right: Question Navigator */}
      <div className="w-[18%]">
        <QuestionNavigator
          questions={navigatorQuestions}
          onNavigate={handleQuestionNavigate}
        />
      </div>
    </div>
  )
}

