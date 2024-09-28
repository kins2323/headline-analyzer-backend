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

    // Create the new prompt for the OpenAI API requesting JSON format with dynamic recommendations
    const prompt = `You are an expert in marketing and content creation, specializing in analyzing headlines for effectiveness. Based on the following headline, provide tailored recommendations that focus on clarity, emotional impact, SEO optimization, and engagement potential. Your recommendations should consider the category, target audience, and platform.

    Headline: "${headline}"
    Category: "${category}"
    Target Audience: "${targetAudience}"
    Platform: "${platform}"

    Please return your analysis in JSON format with dynamic and context-specific recommendations based on the headline:

    {
      "general_score": number,
      "aspects": {
        "clarity_and_conciseness": {
          "c_score": number,
          "recommendations": []
        },
        "emotional_impact": {
          "e_score": number,
          "recommendations": []
        },
        "seo_optimization": {
          "s_score": number,
          "recommendations": []
        },
        "engagement_potential": {
          "g_score": number,
          "recommendations": []
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

      // Rename aspect properties for consistency and add IDs to recommendations
      const addIdToRecommendations = (recommendations) =>
        recommendations.map((rec, index) => ({ id: `rec${index + 1}`, text: rec.text }));

      const {
        general_score,
        aspects: {
          clarity_and_conciseness: { c_score, recommendations: clarityRecommendations },
          emotional_impact: { e_score, recommendations: emotionalRecommendations },
          seo_optimization: { s_score, recommendations: seoRecommendations },
          engagement_potential: { g_score, recommendations: engagementRecommendations },
        },
      } = headlineAnalysis;

      // Add IDs to recommendations
      const formattedClarityRecommendations = addIdToRecommendations(clarityRecommendations);
      const formattedEmotionalRecommendations = addIdToRecommendations(emotionalRecommendations);
      const formattedSEORecommendations = addIdToRecommendations(seoRecommendations);
      const formattedEngagementRecommendations = addIdToRecommendations(engagementRecommendations);

      // Build a new object to match frontend expectations
      const formattedAnalysis = {
        generalScore: general_score,
        clarity: { score: c_score, recommendations: formattedClarityRecommendations },
        emotion: { score: e_score, recommendations: formattedEmotionalRecommendations },
        seo: { score: s_score, recommendations: formattedSEORecommendations },
        engagement: { score: g_score, recommendations: formattedEngagementRecommendations },
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

export default router;
