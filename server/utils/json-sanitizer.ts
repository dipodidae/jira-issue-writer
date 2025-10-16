function removeJsonCodeFences(jsonString: string) {
  return jsonString.replace(/```\w*\s*/g, '').replace(/```/g, '').trim()
}

function shouldEscapeCharacter(char: string): boolean {
  return char === '\n' || char === '\r' || char === '\t' || char < ' '
}

function escapeCharacter(char: string): string {
  if (char === '\n')
    return '\\n'
  if (char === '\r')
    return '\\r'
  if (char === '\t')
    return '\\t'
  if (char < ' ') {
    const hex = char.charCodeAt(0).toString(16).padStart(4, '0')
    return `\\u${hex}`
  }
  return char
}

function escapeControlCharacters(jsonString: string) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (const char of jsonString) {
    if (!inString) {
      result += char
      if (char === '"')
        inString = true
      continue
    }

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\') {
      result += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      result += char
      inString = false
      continue
    }

    if (shouldEscapeCharacter(char)) {
      result += escapeCharacter(char)
      continue
    }

    result += char
  }

  return result
}

export function sanitizeJsonResponse(jsonString: string) {
  return escapeControlCharacters(removeJsonCodeFences(jsonString))
}
