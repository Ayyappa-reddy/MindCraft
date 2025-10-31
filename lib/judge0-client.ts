/**
 * Judge0 CE API Client for code execution
 * Uses Judge0 via RapidAPI
 */

export interface Judge0Language {
  id: number
  name: string
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  status: {
    id: number
    description: string
  }
  time: string
  memory: number
  compile_output?: string
}

export interface TestCaseResult {
  passed: boolean
  actualOutput: string
  expectedOutput: string
  error?: string
  executionTime: number
  memory?: number
}

// Language ID mapping for Judge0
export const LANGUAGE_IDS = {
  python: 71,      // Python 3
  cpp: 54,         // C++ (GCC 9.2.0)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  java: 62,        // Java (OpenJDK 13.0.1)
  c: 50,           // C (GCC 9.2.0)
} as const

export type SupportedLanguage = keyof typeof LANGUAGE_IDS

export class Judge0Client {
  private apiKey: string
  private host: string
  private baseUrl: string
  private isSelfHosted: boolean

  constructor() {
    // Check if using self-hosted Judge0
    this.isSelfHosted = process.env.NEXT_PUBLIC_JUDGE0_SELF_HOSTED === 'true'
    
    this.apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || ''
    this.host = process.env.NEXT_PUBLIC_JUDGE0_HOST || 'judge0-ce.p.rapidapi.com'
    
    // For self-hosted, use http:// (or https:// if configured with SSL)
    // For RapidAPI, always use https://
    if (this.isSelfHosted) {
      // Check if host already includes protocol
      if (this.host.startsWith('http://') || this.host.startsWith('https://')) {
        this.baseUrl = this.host
      } else {
        // Default to http for self-hosted (user can add https:// in env if needed)
        this.baseUrl = `http://${this.host}`
      }
      console.log('Using self-hosted Judge0:', this.baseUrl)
    } else {
      this.baseUrl = `https://${this.host}`
      if (!this.apiKey) {
        console.warn('Judge0 API key not found. Code execution will fail.')
      }
    }
  }

  /**
   * Execute code with given language and input
   */
  async executeCode(
    language: SupportedLanguage,
    code: string,
    stdin: string = ''
  ): Promise<ExecuteResult> {
    try {
      const languageId = LANGUAGE_IDS[language]

      const payload = {
        source_code: code,
        language_id: languageId,
        stdin: stdin,
        base64_encoded: false,
        wait: true, // Wait for execution to complete
      }

      // Build headers based on whether self-hosted or RapidAPI
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add RapidAPI headers only if not self-hosted
      if (!this.isSelfHosted) {
        headers['X-RapidAPI-Key'] = this.apiKey
        headers['X-RapidAPI-Host'] = this.host
      }

      const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Judge0 API error: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()

      return {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        status: data.status || { id: 0, description: 'Unknown' },
        time: data.time || '0',
        memory: data.memory || 0,
        compile_output: data.compile_output,
      }
    } catch (error) {
      console.error('Error executing code:', error)
      throw error
    }
  }

  /**
   * Run code against multiple test cases sequentially
   */
  async executeTestCases(
    language: SupportedLanguage,
    code: string,
    testCases: Array<{ input: string; output: string }>
  ): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = []

    // Execute test cases sequentially to avoid rate limiting
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      
      try {
        const result = await this.executeCode(language, code, testCase.input)

        // Check if compilation/execution was successful
        const statusId = result.status.id
        
        // Status codes: 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded, etc.
        // 6 = Compilation Error, 7+ = Runtime errors
        const hasError = statusId >= 6

        // Clean and normalize outputs for comparison
        const actualOutput = this.normalizeOutput(result.stdout)
        const expectedOutput = this.normalizeOutput(testCase.output)
        
        const passed = !hasError && actualOutput === expectedOutput

        // Build error message if exists
        let errorMessage: string | undefined
        if (result.stderr) {
          errorMessage = result.stderr
        } else if (result.compile_output) {
          errorMessage = `Compilation Error: ${result.compile_output}`
        } else if (hasError) {
          errorMessage = result.status.description
        }

        results.push({
          passed,
          actualOutput,
          expectedOutput,
          error: errorMessage,
          executionTime: parseFloat(result.time) * 1000 || 0, // Convert to ms
          memory: result.memory,
        })

        // Add delay between requests to avoid rate limiting (500ms)
        if (i < testCases.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error: any) {
        console.error(`Error executing test case ${i + 1}:`, error)
        results.push({
          passed: false,
          actualOutput: '',
          expectedOutput: testCase.output,
          error: error.message || 'Execution failed',
          executionTime: 0,
          memory: 0,
        })

        // Add delay even on error
        if (i < testCases.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    return results
  }

  /**
   * Normalize output for comparison (trim, remove trailing newlines)
   */
  private normalizeOutput(output: string): string {
    return output.trim().replace(/\r\n/g, '\n')
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): Array<{ id: number; name: string; key: SupportedLanguage }> {
    return [
      { id: LANGUAGE_IDS.python, name: 'Python 3', key: 'python' },
      { id: LANGUAGE_IDS.cpp, name: 'C++ (GCC 9.2.0)', key: 'cpp' },
      { id: LANGUAGE_IDS.javascript, name: 'JavaScript (Node.js)', key: 'javascript' },
      { id: LANGUAGE_IDS.java, name: 'Java (OpenJDK 13)', key: 'java' },
      { id: LANGUAGE_IDS.c, name: 'C (GCC 9.2.0)', key: 'c' },
    ]
  }
}

// Export singleton instance
export const judge0Client = new Judge0Client()

