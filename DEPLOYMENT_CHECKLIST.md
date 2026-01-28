# Deployment Checklist

## Environment Variables (Critical)

### Vercel / Production

Ensure the following environment variable is set in your deployment platform:

- `NUXT_OPENAI_API_KEY` - Your OpenAI API key (starts with `sk-`)

**How to set in Vercel:**

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `NUXT_OPENAI_API_KEY` with your OpenAI API key
4. Set it for Production, Preview, and Development environments
5. Redeploy after adding the variable

## Common 500 Error Causes

### 1. Missing API Key

**Symptom:** 500 error with message "Missing OpenAI API key"
**Fix:** Set `NUXT_OPENAI_API_KEY` environment variable in your deployment platform

### 2. Invalid API Key

**Symptom:** 500 error with message "Invalid OpenAI API key"
**Fix:** Verify your OpenAI API key is correct and active at https://platform.openai.com/api-keys

### 3. OpenAI Rate Limit

**Symptom:** 429 error with message about rate limits
**Fix:**

- Wait a few minutes and try again
- Check your OpenAI usage at https://platform.openai.com/usage
- Upgrade your OpenAI plan if needed

### 4. Network Issues

**Symptom:** 503 error with message about network connectivity
**Fix:** Check if your deployment platform can reach api.openai.com

### 5. Invalid Model Name

**Symptom:** 502 error mentioning invalid request to OpenAI
**Fix:** Ensure the model name (default: `gpt-4o-mini`) is valid and available to your API key

## Debugging Live Issues

### Check Server Logs

1. In Vercel: Go to Deployments → Select deployment → Functions tab → View logs
2. Look for `[prompt]` prefix in logs for detailed error messages
3. Check for error codes and messages

### Test API Endpoint Directly

```bash
curl -X POST https://your-domain.vercel.app/api/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test prompt",
    "agent": "gpt-4o-mini",
    "scope": ["ui"],
    "previousClarifications": [],
    "stage": "initial"
  }'
```

### Verify Environment Variables

```bash
# In Vercel CLI
vercel env ls
```

## Recent Improvements (Current Deploy)

✅ Added comprehensive error handling for OpenAI API calls
✅ Better error messages with specific status codes:

- 400: Bad request / missing text
- 401: Invalid API key
- 429: Rate limit exceeded
- 502: OpenAI API errors / invalid responses
- 503: Network connectivity issues
- 500: Missing API key or unexpected errors

✅ Added request body validation
✅ Added detailed console logging for debugging
✅ Protected fallback clarification with try-catch

## Next Steps After Error

1. Check deployment logs for the exact error message
2. Verify environment variables are set correctly
3. Confirm OpenAI API key is valid and has credits
4. Check OpenAI service status: https://status.openai.com/
5. Review the error message in the browser console for client-side details

## Contact

If issues persist after checking all above items, provide:

- The exact error message from browser console
- Server logs from the deployment platform
- Timestamp of when the error occurred
- The prompt you tried to submit (if not sensitive)
