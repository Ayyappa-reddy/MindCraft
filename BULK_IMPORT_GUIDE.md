# Bulk Import Questions Guide

This guide explains how to use the bulk import feature to add multiple MCQ or Coding questions at once to your exams.

## Overview

Instead of manually entering questions one by one, you can prepare questions in JSON format and import them in bulk. This is especially useful when:
- You have many questions to add
- You're migrating questions from another system
- You want to version control your questions
- You're generating questions programmatically

## Access Bulk Import

1. Navigate to Admin Panel → Exams → Select an Exam
2. Click **"Bulk Import MCQ"** or **"Bulk Import Coding"** button
3. A dialog will open where you can paste JSON

## JSON Format

### MCQ Questions

```json
[
  {
    "type": "mcq",
    "question_text": "What is the output of the following Python code?\n\nx = 5\ny = 3\nprint(x + y * 2)",
    "options": ["8", "11", "13", "16"],
    "correct_answer": "11",
    "explanation": "According to operator precedence, multiplication happens before addition.\n\nStep 1: y * 2 = 3 * 2 = 6\nStep 2: x + 6 = 5 + 6 = 11",
    "marks": 2
  },
  {
    "type": "mcq",
    "question_text": "Which data structure follows LIFO?",
    "options": ["Array", "Stack", "Queue", "Linked List"],
    "correct_answer": "Stack",
    "explanation": "Stack follows Last In First Out (LIFO) principle.",
    "marks": 1
  }
]
```

#### MCQ with Multi-line Options

```json
[
  {
    "type": "mcq",
    "question_text": "Which code snippet correctly implements a for loop?",
    "options": [
      "for i in range(10):\n    print(i)",
      "for (int i=0; i<10; i++)\n    console.log(i);",
      "for i := 0; i < 10; i++ {\n    fmt.Println(i)\n}",
      "None of the above"
    ],
    "correct_answer": "for i in range(10):\n    print(i)",
    "explanation": "The first option is valid Python syntax.",
    "marks": 2
  }
]
```

#### Required Fields for MCQ
- `type`: Must be `"mcq"`
- `question_text`: The question (string, can include `\n` for newlines)
- `options`: Array of at least 2 options (strings, can include `\n` for multi-line)
- `correct_answer`: Exact text of correct option (must match exactly, including newlines)
- `marks`: Number (must be >= 1)

#### Optional Fields for MCQ
- `explanation`: Explanation text (string, can include `\n`)

---

### Coding Questions

```json
[
  {
    "type": "coding",
    "title": "Sum of Two Numbers",
    "question_text": "Write a Python program that takes two integers as input and prints their sum.",
    "input_format": "Two integers separated by space",
    "output_format": "Single integer (the sum)",
    "examples": [
      {
        "input": "5 3",
        "output": "8",
        "explanation": "5 + 3 = 8"
      },
      {
        "input": "10 20",
        "output": "30"
      }
    ],
    "constraints": "1 <= n <= 10^9",
    "test_cases": "5 3\n===\n8\n---\n10 20\n===\n30\n---\n[HIDDEN]\n100 200\n===\n300",
    "explanation": "This problem tests basic arithmetic operations and input/output in Python.",
    "marks": 5
  }
]
```

#### Coding Question with Multi-line Input/Output

```json
[
  {
    "type": "coding",
    "title": "Matrix Addition",
    "question_text": "Given two matrices, add them element-wise and print the result.",
    "input_format": "First line: dimensions (rows cols)\nNext lines: elements of first matrix\nNext lines: elements of second matrix",
    "output_format": "Resulting matrix (one row per line)",
    "examples": [
      {
        "input": "2 2\n1 2\n3 4\n5 6\n7 8",
        "output": "6 8\n10 12",
        "explanation": "Add corresponding elements: (1+5, 2+6) and (3+7, 4+8)"
      }
    ],
    "constraints": "1 <= rows, cols <= 100",
    "test_cases": "2 2\n1 2\n3 4\n5 6\n7 8\n===\n6 8\n10 12\n---\n[HIDDEN]\n3 3\n1 1 1\n2 2 2\n3 3 3\n4 4 4\n5 5 5\n6 6 6\n===\n5 5 5\n7 7 7\n9 9 9",
    "explanation": "This problem demonstrates multi-dimensional array processing and nested loops in Python.",
    "marks": 10
  }
]
```

#### Required Fields for Coding Questions
- `type`: Must be `"coding"`
- `title`: Short title for the problem (string)
- `question_text`: Full problem description (string, can include `\n`)
- `test_cases`: Test cases in special format (see below)
- `marks`: Number (must be >= 1)

#### Optional Fields for Coding Questions
- `input_format`: Description of input format (string)
- `output_format`: Description of output format (string)
- `examples`: Array of example objects with `input`, `output`, and optional `explanation`
- `constraints`: Problem constraints (string)
- `explanation`: General explanation (string)

---

## Test Cases Format

Test cases use a special format with separators:

```
input_line_1
input_line_2
===
output_line_1
output_line_2
---
[HIDDEN]
another_input
===
another_output
```

### Rules:
- `===` separates input from output
- `---` separates different test cases
- `[HIDDEN]` on its own line marks the following test cases as hidden from students
- Use `\n` in JSON strings to represent newlines

### Example:
```json
"test_cases": "5\n===\nEven\n---\n7\n===\nOdd\n---\n[HIDDEN]\n100\n===\nEven"
```

This creates:
- Test 1 (visible): input `5`, output `Even`
- Test 2 (visible): input `7`, output `Odd`
- Test 3 (hidden): input `100`, output `Even`

---

## Import Workflow

### Step 1: Prepare JSON
Create a JSON array with your questions. You can:
- Write it in a text editor (VS Code, Notepad++, etc.)
- Generate it from a spreadsheet (Excel → JSON converter)
- Export from another system
- Use a JSON validator (jsonlint.com) to check syntax

### Step 2: Copy JSON
Copy your entire JSON array to clipboard

### Step 3: Open Import Dialog
Click "Bulk Import MCQ" or "Bulk Import Coding" in the admin panel

### Step 4: Paste and Parse
1. Paste JSON into the textarea
2. Click **"Parse & Preview"**
3. System validates all questions

### Step 5: Review Preview
A table shows all questions with:
- ✅ Green checkmark = Valid
- ❌ Red X = Invalid (hover to see errors)
- Question details (truncated)
- Remove button (to exclude specific questions)

### Step 6: Import
Click **"Import X Question(s)"** to save valid questions to database

---

## Common Errors and Fixes

### JSON Parse Error
**Error:** `Unexpected token } in JSON at position 45`

**Fix:** Check for:
- Missing commas between objects
- Extra commas after last item
- Unescaped quotes in strings
- Missing closing brackets

Use a JSON validator: paste your JSON at https://jsonlint.com

### Missing Required Fields
**Error:** `Question 3: Missing or invalid 'question_text'`

**Fix:** Ensure every question has all required fields for its type (see above)

### Invalid Options Array
**Error:** `Question 1: 'options' must be an array with at least 2 items`

**Fix:** MCQ options must be:
```json
"options": ["Option 1", "Option 2", "Option 3"]
```
Not:
```json
"options": "Option 1, Option 2"  // Wrong! Must be array
```

### Correct Answer Mismatch
**Error:** Student selects correct option but marked wrong

**Issue:** `correct_answer` doesn't exactly match option text

**Fix:** Copy-paste the option text into `correct_answer`:
```json
"options": ["Option A\nLine 2", "Option B"],
"correct_answer": "Option A\nLine 2"  // Must match exactly including \n
```

### Invalid Test Cases Format
**Error:** Test cases not parsing correctly

**Fix:** Ensure you use:
- `\n` for newlines in JSON
- `===` to separate input from output
- `---` to separate test cases
- `[HIDDEN]` on its own line

Example:
```json
"test_cases": "input1\n===\noutput1\n---\ninput2\n===\noutput2"
```

---

## Tips and Best Practices

### 1. Start Small
Test with 1-2 questions first to ensure your JSON format is correct

### 2. Use a JSON Editor
Use VS Code or an online JSON editor with syntax highlighting

### 3. Validate Before Import
Run your JSON through jsonlint.com before importing

### 4. Version Control
Save your JSON files in Git to track question changes over time

### 5. Multi-line Content
For readability in your JSON file, you can use:
- `\n` for newlines (works everywhere)
- Template literals if generating JSON with JavaScript

### 6. Generate from Spreadsheet
If you have questions in Excel/Google Sheets:
1. Export as CSV
2. Use an online CSV-to-JSON converter
3. Adjust field names to match format
4. Import

### 7. Backup First
Always export existing questions before bulk importing to avoid data loss

### 8. Test Your Questions
After importing, test the exam as a student to ensure:
- MCQ options display correctly
- Coding test cases work as expected
- Multi-line content renders properly

---

## Example: Complete Import

Here's a complete example with both MCQ and Coding questions:

**For MCQ Import:**
```json
[
  {
    "type": "mcq",
    "question_text": "What is Python?",
    "options": [
      "A snake",
      "A programming language",
      "A framework",
      "An IDE"
    ],
    "correct_answer": "A programming language",
    "explanation": "Python is a high-level, interpreted programming language.",
    "marks": 1
  },
  {
    "type": "mcq",
    "question_text": "Which is valid Python syntax?",
    "options": [
      "print(\"Hello\")",
      "console.log(\"Hello\")",
      "System.out.println(\"Hello\")",
      "echo \"Hello\""
    ],
    "correct_answer": "print(\"Hello\")",
    "marks": 1
  }
]
```

**For Coding Import:**
```json
[
  {
    "type": "coding",
    "title": "Even or Odd",
    "question_text": "Write a program that reads an integer and prints 'Even' if it's even, otherwise 'Odd'.",
    "input_format": "Single integer n",
    "output_format": "Either 'Even' or 'Odd'",
    "examples": [
      {
        "input": "4",
        "output": "Even"
      },
      {
        "input": "7",
        "output": "Odd"
      }
    ],
    "constraints": "1 <= n <= 10^9",
    "test_cases": "4\n===\nEven\n---\n7\n===\nOdd\n---\n[HIDDEN]\n100\n===\nEven\n---\n[HIDDEN]\n999\n===\nOdd",
    "marks": 5
  }
]
```

---

## Support

If you encounter issues:
1. Check this guide for common errors
2. Validate your JSON syntax
3. Test with a single question first
4. Check browser console for detailed errors
5. Contact system administrator

---

## Advanced: Programmatic Generation

You can generate questions programmatically in any language:

**Python Example:**
```python
import json

questions = []

for i in range(1, 11):
    question = {
        "type": "mcq",
        "question_text": f"What is {i} + {i}?",
        "options": [str(i*2-1), str(i*2), str(i*2+1), str(i*2+2)],
        "correct_answer": str(i*2),
        "explanation": f"{i} + {i} = {i*2}",
        "marks": 1
    }
    questions.append(question)

print(json.dumps(questions, indent=2))
```

Save output to file, then copy-paste into bulk import dialog.

---

## Changelog

- **v1.0** (Current): Initial bulk import feature
  - Support for MCQ and Coding questions
  - Multi-line options and test cases
  - Validation and preview
  - Invalid question handling

