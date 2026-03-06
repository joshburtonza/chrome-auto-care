// Supabase Edge Function: scan-licence-disc
// Accepts a base64 image of a South African vehicle licence disc
// Uses OpenAI GPT-4o-mini vision to extract vehicle details
// Returns structured JSON for auto-filling the Add Vehicle form

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LicenceDiscResult {
  registration_number: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  color: string | null;
  vin: string | null;
  engine_number: string | null;
  expiry_date: string | null;
  raw_text: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'image (base64) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a South African vehicle licence disc scanner. Extract vehicle details from the image of a South African vehicle licence disc (the round sticker on the windscreen).

South African licence discs typically contain:
- Registration number (e.g. CA 123-456, GP ABC 123 GP)
- Make (manufacturer e.g. BMW, Toyota, Mercedes-Benz)
- Model (e.g. 320i, Corolla, C200)
- Year of first registration
- VIN / chassis number
- Engine number
- Colour / color description
- Licence expiry date

Return ONLY a JSON object with these exact keys:
{
  "registration_number": "string or null",
  "make": "string or null",
  "model": "string or null",
  "year": "string or null (4 digit year)",
  "color": "string or null",
  "vin": "string or null",
  "engine_number": "string or null",
  "expiry_date": "string or null (YYYY-MM-DD format)",
  "raw_text": "all text you can read from the disc"
}

Important:
- Return null for any field you cannot confidently read
- For make, use the standard brand name (e.g. "BMW" not "Bayerische Motoren Werke")
- For year, extract just the 4-digit year
- For color, use standard colour names (e.g. "White", "Black", "Silver")
- Return ONLY the JSON, no markdown, no explanation`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please scan this South African vehicle licence disc and extract the vehicle details.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process image' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let result: LicenceDiscResult;
    try {
      // Handle potential markdown code blocks in response
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return new Response(
        JSON.stringify({
          error: 'Could not parse licence disc details',
          raw_response: content,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
