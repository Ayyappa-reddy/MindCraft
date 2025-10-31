'use client'

import { useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Save, CheckCircle, XCircle, Loader2, Clock, Terminal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TestCaseResult {
  passed: boolean
  actualOutput: string
  expectedOutput: string
  error?: string
  executionTime: number
  memory?: number
}

interface TestCase {
  input: string
  output: string
  hidden: boolean
}

interface EditorPanelProps {
  language: string
  code: string
  onLanguageChange: (lang: string) => void
  onCodeChange: (code: string) => void
  onRun: () => Promise<void>
  onSave: () => void
  onSubmit: () => void
  testCases: TestCase[]
  testResults: TestCaseResult[]
  isRunning: boolean
  hasRun: boolean
  consoleOutput: string
  canSubmit: boolean
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python 3', monaco: 'python' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'c', label: 'C', monaco: 'c' },
]

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

export default function EditorPanel({
  language,
  code,
  onLanguageChange,
  onCodeChange,
  onRun,
  onSave,
  onSubmit,
  testCases,
  testResults,
  isRunning,
  hasRun,
  consoleOutput,
  canSubmit,
}: EditorPanelProps) {
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark')
  const [activeTab, setActiveTab] = useState<'testcases' | 'console'>('testcases')

  const selectedLang = LANGUAGE_OPTIONS.find(l => l.value === language) || LANGUAGE_OPTIONS[0]
  const visibleTestCases = testCases.filter(tc => !tc.hidden)
  const hiddenTestCases = testCases.filter(tc => tc.hidden)

  const passedVisible = testResults.slice(0, visibleTestCases.length).filter(r => r.passed).length
  const passedHidden = testResults.slice(visibleTestCases.length).filter(r => r.passed).length
  const totalPassed = passedVisible + passedHidden
  const totalTests = testCases.length

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Language selector and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-300">
              {LANGUAGE_OPTIONS.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditorTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark')}
          >
            {editorTheme === 'vs-dark' ? '🌙' : '☀️'}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={onRun}
            disabled={isRunning || !code.trim()}
            variant="outline"
            size="sm"
            className="bg-[#10b981] hover:bg-[#059669] text-white border-[#10b981]"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Code
              </>
            )}
          </Button>

          <Button
            onClick={onSave}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button
            onClick={onSubmit}
            disabled={!canSubmit || isRunning}
            className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-0 border-b border-gray-200">
        <Editor
          height="100%"
          language={selectedLang.monaco}
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          theme={editorTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Results Section */}
      <div className="h-[300px] border-t border-gray-200 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'testcases' | 'console')} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-gray-50">
            <TabsTrigger value="testcases" className="data-[state=active]:bg-white">
              Test Cases
              {hasRun && (
                <span className={`ml-2 text-xs ${totalPassed === totalTests ? 'text-green-600' : 'text-orange-600'}`}>
                  ({totalPassed}/{totalTests} passed)
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="console" className="data-[state=active]:bg-white">
              <Terminal className="h-3 w-3 mr-2" />
              Console
            </TabsTrigger>
          </TabsList>

          <TabsContent value="testcases" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {!hasRun && (
                  <div className="text-center py-8 text-gray-500">
                    Run your code to see test results
                  </div>
                )}

                {hasRun && (
                  <>
                    {/* Visible Test Cases */}
                    {visibleTestCases.map((testCase, index) => {
                      const result = testResults[index]
                      if (!result) return null

                      return (
                        <AnimatePresence key={index}>
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className={`p-4 ${result.passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {result.passed ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  )}
                                  <span className="font-semibold">
                                    Test Case {index + 1}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>{result.executionTime.toFixed(2)}ms</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Input:</span>
                                  <pre className="mt-1 bg-white p-2 rounded border text-xs font-mono overflow-x-auto">
                                    {testCase.input}
                                  </pre>
                                </div>

                                {!result.passed && (
                                  <>
                                    <div>
                                      <span className="font-medium text-gray-700">Expected:</span>
                                      <pre className="mt-1 bg-white p-2 rounded border text-xs font-mono overflow-x-auto">
                                        {result.expectedOutput}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Got:</span>
                                      <pre className="mt-1 bg-white p-2 rounded border text-xs font-mono overflow-x-auto">
                                        {result.actualOutput || '(empty)'}
                                      </pre>
                                    </div>
                                  </>
                                )}

                              </div>
                            </Card>
                          </motion.div>
                        </AnimatePresence>
                      )
                    })}

                    {/* Hidden Test Cases Summary */}
                    {hiddenTestCases.length > 0 && (
                      <Card className="p-4 bg-gray-50 border-gray-300">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">
                            Hidden Test Cases
                          </span>
                          <span className={`text-sm ${passedHidden === hiddenTestCases.length ? 'text-green-600' : 'text-orange-600'}`}>
                            {passedHidden}/{hiddenTestCases.length} passed
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Hidden test cases verify edge cases and special conditions
                        </p>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="console" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap">
                {consoleOutput || 'No output yet. Run your code to see results.'}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

