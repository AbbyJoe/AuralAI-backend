import OpenAI from 'openai';

let xaiClient = null;

if (process.env.XAI_API_KEY) {
  xaiClient = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: process.env.XAI_BASE_URL
  });
} else {
  console.warn('⚠️ XAI_API_KEY not set — AI features disabled.');
}

export default xaiClient;

