/**
 * Food Recognition API Route
 *
 * POST /api/recognize
 *
 * Accepts an image and returns food recognition results.
 * Server-side route to protect API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';

interface RecognitionRequest {
  image: string; // Base64-encoded image data
  consent: boolean; // User consent for cloud processing
}

interface RecognitionResponse {
  success: boolean;
  data?: {
    primaryCandidate: string;
    confidence: number;
    alternativeCandidates?: string[];
    components?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

interface RecognitionLogEvent {
  event: 'recognition_request';
  requestId: string;
  apiType: string;
  success: boolean;
  status: number;
  errorCode?: string;
  confidence?: number;
  alternativeCount?: number;
  processingTimeMs: number;
  timestamp: string;
}

function logRecognitionEvent(event: RecognitionLogEvent) {
  const payload = JSON.stringify(event);
  if (event.success) {
    console.info(payload);
  } else {
    console.warn(payload);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<RecognitionResponse>> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const apiType = process.env.RECOGNITION_API_TYPE || 'openai';
  let status = 200;
  let response: RecognitionResponse = {
    success: false,
    error: {
      code: 'API_ERROR',
      message: translate('errors.recognitionFailed'),
    },
  };

  try {
    const body: RecognitionRequest = await request.json();

    // Validate consent
    if (!body.consent) {
      status = 400;
      response = {
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: translate('errors.consentRequired'),
        },
      };
      return NextResponse.json(response, { status });
    }

    // Validate image data
    if (!body.image || !body.image.startsWith('data:image/')) {
      status = 400;
      response = {
        success: false,
        error: {
          code: 'INVALID_IMAGE',
          message: translate('errors.invalidImage'),
        },
      };
      return NextResponse.json(response, { status });
    }

    // Check API key configuration
    const apiKey = process.env.RECOGNITION_API_KEY;

    if (!apiKey) {
      console.error('Recognition API key not configured');
      status = 500;
      response = {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.recognitionUnavailable'),
        },
      };
      return NextResponse.json(response, { status });
    }

    // Call external recognition API based on type
    const result = apiType === 'openai'
      ? await callOpenAIVision(body.image, apiKey)
      : await callGoogleVision(body.image, apiKey);

    response = result;

    if (!result.success) {
      const errorCode = result.error?.code;
      if (errorCode === 'CONSENT_REQUIRED' || errorCode === 'INVALID_IMAGE') {
        status = 400;
      } else if (errorCode === 'API_ERROR' || errorCode === 'TIMEOUT') {
        status = 500;
      }
    }

    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Recognition API error:', error);
    status = 500;
    response = {
      success: false,
      error: {
        code: 'API_ERROR',
        message: translate('errors.recognitionFailed'),
      },
    };

    return NextResponse.json(response, { status });
  } finally {
    const processingTimeMs = Date.now() - startTime;
    logRecognitionEvent({
      event: 'recognition_request',
      requestId,
      apiType,
      success: response.success,
      status,
      errorCode: response.error?.code,
      confidence: response.data?.confidence,
      alternativeCount: response.data?.alternativeCandidates?.length,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Call OpenAI Vision API for food recognition.
 */
async function callOpenAIVision(
  imageData: string,
  apiKey: string
): Promise<RecognitionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a food recognition expert specializing in Asian cuisine. Analyze the image and identify the food item(s).
Respond in JSON format with:
{
  "primaryCandidate": "main food name in English",
  "confidence": 0.0-1.0,
  "alternativeCandidates": ["alternative1", "alternative2"],
  "components": ["ingredient1", "ingredient2"]
}
If confidence is below 0.7, provide 2-3 alternative candidates.
If no food is detected, set primaryCandidate to null and confidence to 0.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                },
              },
              {
                type: 'text',
                text: 'What food is in this image? Identify the main dish and any visible components.',
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.recognitionUnavailable'),
        },
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: {
          code: 'NO_FOOD_DETECTED',
          message: translate('errors.noFoodDetected'),
        },
      };
    }

    // Parse JSON response from GPT
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.primaryCandidate || parsed.confidence === 0) {
        return {
          success: false,
          error: {
            code: 'NO_FOOD_DETECTED',
            message: translate('errors.noFoodDetected'),
          },
        };
      }

      return {
        success: true,
        data: {
          primaryCandidate: parsed.primaryCandidate,
          confidence: parsed.confidence,
          alternativeCandidates: parsed.alternativeCandidates || [],
          components: parsed.components || [],
        },
      };
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.recognitionParseFailed'),
        },
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: translate('errors.recognitionTimeout'),
        },
      };
    }
    throw error;
  }
}

/**
 * Call Google Cloud Vision API for food recognition.
 * Note: Google Vision doesn't directly identify food names,
 * so we use label detection and filter for food-related labels.
 */
async function callGoogleVision(
  imageData: string,
  apiKey: string
): Promise<RecognitionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

  try {
    // Extract base64 data from data URL
    const base64Data = imageData.split(',')[1];

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Data,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Google Vision API error:', response.status, await response.text());
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.recognitionUnavailable'),
        },
      };
    }

    const data = await response.json();
    const labels = data.responses?.[0]?.labelAnnotations || [];

    // Filter for food-related labels
    const foodLabels = labels.filter((label: { description: string; score: number }) => {
      const desc = label.description.toLowerCase();
      // Common food-related terms
      return (
        desc.includes('food') ||
        desc.includes('dish') ||
        desc.includes('cuisine') ||
        desc.includes('meal') ||
        desc.includes('rice') ||
        desc.includes('noodle') ||
        desc.includes('soup') ||
        desc.includes('vegetable') ||
        desc.includes('meat') ||
        desc.includes('seafood') ||
        desc.includes('fruit')
      );
    });

    if (foodLabels.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_FOOD_DETECTED',
          message: translate('errors.noFoodDetected'),
        },
      };
    }

    const primary = foodLabels[0];
    const alternatives = foodLabels.slice(1, 4).map((l: { description: string }) => l.description);

    return {
      success: true,
      data: {
        primaryCandidate: primary.description,
        confidence: primary.score,
        alternativeCandidates: alternatives,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: translate('errors.recognitionTimeout'),
        },
      };
    }
    throw error;
  }
}
