/**
 * Piston API Client for code execution
 * Uses the free public Piston API at https://emkc.org
 */

export interface PistonRuntime {
  language: string
  version: string
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
  signal: string | null
  output: string
  executionTime: number
}

export interface TestCaseResult {
  passed: boolean
  actualOutput: string
  expectedOutput: string
  error?: string
  executionTime: number
}

export class PistonClient {
  private baseUrl = 'https://emkc.org/api/v2/piston'

  /**
   * Fetch all available runtimes (languages)
   */
  async getRuntimes(): Promise<PistonRuntime[]> {
    try {
      const response = await fetch(`${this.baseUrl}/runtimes`)
      if (!response.ok) {
        throw new Error(`Failed to fetch runtimes: ${response.statusText}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching runtimes:', error)
      return []
    }
  }

  /**
   * Execute code with given language and input
   */
  async executeCode(
    language: string,
    code: string,
    stdin: string = ''
  ): Promise<ExecuteResult> {
    try {
      const payload = {
        language,
        version: '*', // Use latest version
        files: [
          {
            content: code,
          },
        ],
        stdin,
        args: [],
        run_timeout: 10000, // 10 seconds timeout
        compile_timeout: 10000,
      }

      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        stdout: data.run.stdout || '',
        stderr: data.run.stderr || '',
        exitCode: data.run.code || 0,
        signal: data.run.signal || null,
        output: data.run.output || '',
        executionTime: data.run.time || 0,
      }
    } catch (error) {
      console.error('Error executing code:', error)
      throw error
    }
  }

  /**
   * Run code against multiple test cases
   */
  async executeTestCases(
    language: string,
    code: string,
    testCases: Array<{ input: string; output: string }>
  ): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = []

    // Execute test cases sequentially to avoid rate limiting
    for (const testCase of testCases) {
      try {
        const result = await this.executeCode(language, code, testCase.input)
        
        // Clean and normalize outputs for comparison
        const actualOutput = this.normalizeOutput(result.output || result.stdout)
        const expectedOutput = this.normalizeOutput(testCase.output)
        
        const passed = actualOutput === expectedOutput

        // Debug logging
        if (!passed) {
          console.log(`Test case failed:`)
          console.log(`  Input: "${testCase.input}"`)
          console.log(`  Expected: "${expectedOutput}"`)
          console.log(`  Actual: "${actualOutput}"`)
          console.log(`  Raw output: "${result.output}"`)
          console.log(`  Raw stdout: "${result.stdout}"`)
          console.log(`  Stderr: "${result.stderr}"`)
        }

        results.push({
          passed,
          actualOutput,
          expectedOutput,
          error: result.stderr || undefined,
          executionTime: result.executionTime,
        })

        // Add small delay between requests to avoid rate limiting
        if (testCase !== testCases[testCases.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error: any) {
        console.error(`Error executing test case with input "${testCase.input}":`, error)
        results.push({
          passed: false,
          actualOutput: '',
          expectedOutput: testCase.output,
          error: error.message || 'Execution failed',
          executionTime: 0,
        })

        // Add delay even on error
        if (testCase !== testCases[testCases.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 300))
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
}

// Export singleton instance
export const pistonClient = new PistonClient()


