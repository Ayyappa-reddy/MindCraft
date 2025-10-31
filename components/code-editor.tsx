'use client'

import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  onLanguageChange: (language: string) => void
}

const SUPPORTED_LANGUAGES = [
  { value: 'python', label: 'Python', defaultCode: 'def solution():\n    # Write your code here\n    pass\n\nsolution()' },
  { value: 'javascript', label: 'JavaScript', defaultCode: 'function solution() {\n    // Write your code here\n    \n}\n\nsolution();' },
  { value: 'java', label: 'Java', defaultCode: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}' },
  { value: 'cpp', label: 'C++', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}' },
  { value: 'c', label: 'C', defaultCode: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}' },
]

export default function CodeEditor({ value, onChange, language, onLanguageChange }: CodeEditorProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleEditorChange = (newValue: string | undefined) => {
    setLocalValue(newValue || '')
    onChange(newValue || '')
  }

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange(newLanguage)
    // Optionally set default code for new language
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.value === newLanguage)
    if (langConfig && localValue.trim() === '') {
      setLocalValue(langConfig.defaultCode)
      onChange(langConfig.defaultCode)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Language Selector */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Language:</span>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-40 h-8 bg-gray-700 text-white border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                  className="text-white hover:bg-gray-700 focus:bg-gray-700"
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-gray-400">
          {localValue.length.toLocaleString()} characters
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={localValue}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
          }}
        />
      </div>
    </div>
  )
}


