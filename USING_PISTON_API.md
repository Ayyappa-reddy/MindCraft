# Using Piston API for Code Execution

## Overview

We're using **Piston API** (emkc.org) for code execution - it's completely free and requires no API keys or accounts!

## Features

✅ **Completely free** - No API keys, no accounts, no limits  
✅ **No setup required** - Just works out of the box  
✅ **Multiple languages** - Python, C++, JavaScript, Java, C, and more  
✅ **Fast execution** - Quick responses  
✅ **Sequential execution** - Test cases run with 300ms delays to avoid rate limits  

## Supported Languages

The exam system supports:
- **Python 3**
- **C++**
- **JavaScript (Node.js)**
- **Java**
- **C**

## How It Works

1. Student writes code in the exam
2. Clicks "Run Code"
3. Code is sent to `/api/execute-code` endpoint
4. Backend calls Piston API at `https://emkc.org/api/v2/piston/execute`
5. Test cases run sequentially (visible + hidden)
6. Results displayed with pass/fail status

## No Configuration Needed!

Unlike Judge0 which requires:
- API keys
- Rate limit management
- Self-hosting setup

**Piston works instantly with zero configuration!** 🎉

## Technical Details

- **API Endpoint**: `https://emkc.org/api/v2/piston`
- **Execution**: Sequential with 300ms delays between test cases
- **Timeout**: 10 seconds per execution
- **Client**: `lib/piston-client.ts`
- **Route**: `app/api/execute-code/route.ts`

## Rate Limits

Piston is free but does have rate limits. The system handles this by:
- Running test cases sequentially (not in parallel)
- Adding 300ms delay between test cases
- This prevents "Too Many Requests" errors

## Error Handling

- Compilation errors: Shown in test results
- Runtime errors: Displayed with stderr output
- Timeouts: Automatically handled (10s limit)
- Network errors: Caught and displayed to user

## Future Options

If needed later, you can switch to:
1. **Judge0 RapidAPI** (50 submissions/day free)
2. **Self-hosted Judge0** (unlimited, requires Oracle Cloud setup)

But for now, Piston works perfectly! 🚀

## Credits

Piston API is maintained by the Engineering Manager at Code Server.
Website: https://emkc.org
GitHub: https://github.com/engineer-man/piston

