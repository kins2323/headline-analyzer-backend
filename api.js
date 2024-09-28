import express from 'express';
import { Configuration, OpenAIApi } from 'openai';

const router = express.Router();

const createOpenAIClient = () => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return new OpenAIApi(configuration);
};

// POST route for analyzing headlines
router.post('/analyze', async (req, res) => {
  try {
    const { headline, category, platform, targetAudience } = req.body;

    // Check if all required fields are provided
    if (!headline || !category || !platform || !targetAudience) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const openai = createOpenAIClient();

    // Create the new prompt for the OpenAI API requesting JSON format with full recommendations
    const prompt = `You are an expert in marketing and content creation, specializing in analyzing headlines for effectiveness. Based on the following headline, provide tailored recommendations that focus on clarity, emotional impact, SEO optimization, and engagement potential. Your recommendations should consider the category, target audience, and platform.

    Headline: "${headline}"
    Category: "${category}"
    Target Audience: "${targetAudience}"
    Platform: "${platform}"

    Please return your analysis in JSON format with dynamic and context-specific recommendations (including both id and text):

    {
      "general_score": number,
      "aspects": {
        "clarity_and_conciseness": {
          "c_score": number,
          "recommendations": [
            {"id": "rec1", "text": "Your recommendation text here"},
            {"id": "rec2", "text": "Your recommendation text here"}
          ]
        },
        "emotional_impact": {
          "e_score": number,
          "recommendations": [
            {"id": "rec1", "text": "Your recommendation text here"},
            {"id": "rec2", "text": "Your recommendation text here"}
          ]
        },
        "seo_optimization": {
          "s_score": number,
          "recommendations": [
            {"id": "rec1", "text": "Your recommendation text here"},
            {"id": "rec2", "text": "Your recommendation text here"}
          ]
        },
        "engagement_potential": {
          "g_score": number,
          "recommendations": [
            {"id": "rec1", "text": "Your recommendation text here"},
            {"id": "rec2", "text": "Your recommendation text here"}
          ]
        }
      }
    }`;

    // Call OpenAI API to analyze the headline
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.data.choices[0].message.content;

    // Log full response for debugging
    console.log('Full OpenAI Response:', content);

    // Extract and validate JSON from the OpenAI response
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in OpenAI response.');
      }

      const validJson = content.slice(jsonStart, jsonEnd);
      const headlineAnalysis = JSON.parse(validJson);

      // Rename aspect properties for consistency
      const {
        general_score,
        aspects: {
          clarity_and_conciseness: { c_score, recommendations: clarityRecommendations },
          emotional_impact: { e_score, recommendations: emotionalRecommendations },
          seo_optimization: { s_score, recommendations: seoRecommendations },
          engagement_potential: { g_score, recommendations: engagementRecommendations },
        },
      } = headlineAnalysis;

      // Build a new object to match frontend expectations
      const formattedAnalysis = {
        generalScore: general_score,
        clarity: { score: c_score, recommendations: clarityRecommendations },
        emotion: { score: e_score, recommendations: emotionalRecommendations },
        seo: { score: s_score, recommendations: seoRecommendations },
        engagement: { score: g_score, recommendations: engagementRecommendations },
      };

      res.json(formattedAnalysis);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      res.status(500).json({ error: 'Failed to parse headline analysis. Please clear your cache and try again.' });
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the headline. Please clear your cache and try again.' });
  }
});

// New POST route for generating headlines
router.post('/generate', async (req, res) => {
  try {
    const { category, platform, targetAudience } = req.body;

    // Check if all required fields are provided
    if (!category || !platform || !targetAudience) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const openai = createOpenAIClient();

    // Create the prompt for generating headlines
    const prompt = `You are a headline generation expert. Based on the following information, generate a list of creative and effective headlines:

    Category: "${category}"
    Target Audience: "${targetAudience}"
    Platform: "${platform}"

    Please provide 5 headline suggestions, each formatted as a string.`;

    // Call OpenAI API to generate headlines
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    const content = response.data.choices[0].message.content;

    // Log full response for debugging
    console.log('Full OpenAI Response for Headlines:', content);

    // Extract and format the generated headlines
    const headlines = content.split('\n').filter(line => line.trim() !== '');

    res.json({ headlines });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'An error occurred while generating headlines. Please try again later.' });
  }
});

export default router;
