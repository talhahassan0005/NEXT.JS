// app/api/gemini/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { prompt } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing from environment variables');
    return NextResponse.json(
      { error: 'Server misconfiguration', details: 'Missing GEMINI_API_KEY' },
      { status: 500 }
    );
  }

  // Model and endpoint URL (adjust this based on available models)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;


  console.log('Calling Gemini API with prompt:', prompt);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }], // Request body
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Improved error handling: Log the actual API response for better debugging
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: 'Gemini API failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    console.error('Network or server error:', error);
    return NextResponse.json(
      {
        error: 'Network request failed',
        details: error.message,
        type: error.name,
      },
      { status: 500 }
    );
  }
}
