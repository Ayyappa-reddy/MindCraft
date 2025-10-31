import { NextRequest, NextResponse } from 'next/server'
import { pistonClient } from '@/lib/piston-client'

// Piston language names mapping
const PISTON_LANGUAGES = {
  python: 'python',
  cpp: 'cpp',
  javascript: 'javascript',
  java: 'java',
  c: 'c',
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { language, code, testCases } = body

    // Validate inputs
    if (!language || !code || !testCases || !Array.isArray(testCases)) {
      return NextResponse.json(
        { error: 'Invalid request. Missing language, code, or testCases.' },
        { status: 400 }
      )
    }

    // Validate language is supported
    if (!(language in PISTON_LANGUAGES)) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}. Supported: ${Object.keys(PISTON_LANGUAGES).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate test cases structure
    for (const testCase of testCases) {
      if (typeof testCase.input !== 'string' || typeof testCase.output !== 'string') {
        return NextResponse.json(
          { error: 'Invalid test case structure. Each test case must have input and output.' },
          { status: 400 }
        )
      }
    }

    // Execute code against all test cases using Piston
    const pistonLanguage = PISTON_LANGUAGES[language as keyof typeof PISTON_LANGUAGES]
    const results = await pistonClient.executeTestCases(pistonLanguage, code, testCases)

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Code execution error:', error)
    return NextResponse.json(
      { error: error.message || 'Code execution failed' },
      { status: 500 }
    )
  }
}


