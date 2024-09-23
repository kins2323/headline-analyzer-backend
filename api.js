import express from 'express';
import { Configuration, OpenAIApi } from 'openai';

const router = express.Router();

const createOpenAIClient = () => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
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

    // Create the new prompt for the OpenAI API requesting JSON format
    const prompt = `You are an expert in marketing and content creation, specializing in analyzing headlines for effectiveness. Please provide a comprehensive analysis of the following headline based on the selected category and target audience. Your analysis should focus on the following aspects:

    Headline: "${headline}"
    Category: "${category}"
    Target Audience: "${targetAudience}"
    Platform: "${platform}"

    Please provide your analysis in the following JSON format:
    {
      "general_score": number,
      "aspects": {
        "clarity_and_conciseness": {
          "c_score": number,
          "recommendations": [
            {"id": "c_rec1", "text": "Use specific keywords like 'free', 'easy'"},
            {"id": "c_rec2", "text": "Keep it under 10 words"},
            {"id": "c_rec3", "text": "Avoid jargon and complex terms"},
            {"id": "c_rec4", "text": "Revise for clarity and brevity"}
          ]
        },
        "emotional_impact": {
          "e_score": number,
          "recommendations": [
            {"id": "e_rec1", "text": "Use words like 'exciting', 'amazing'"},
            {"id": "e_rec2", "text": "Evoke curiosity with questions"},
            {"id": "e_rec3", "text": "Include strong action verbs"},
            {"id": "e_rec4", "text": "Test different emotional appeals"}
          ]
        },
        "seo_optimization": {
          "s_score": number,
          "recommendations": [
            {"id": "s_rec1", "text": "Incorporate target keywords"},
            {"id": "s_rec2", "text": "Use a number or list in the title"},
            {"id": "s_rec3", "text": "Optimize for featured snippets"},
            {"id": "s_rec4", "text": "Analyze competitor headlines for insights"}
          ]
        },
        "engagement_potential": {
          "g_score": number,
          "recommendations": [
            {"id": "g_rec1", "text": "Ask a compelling question"},
            {"id": "g_rec2", "text": "Create a sense of urgency"},
            {"id": "g_rec3", "text": "Include a unique value proposition"},
            {"id": "g_rec4", "text": "Experiment with different formats (e.g., questions, lists)"}
          ]
        }
      }
    }`;

    // Call OpenAI API to analyze the headline
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    const content = response.data.choices[0].message.content;

    // Log full response for debugging
    console.log("Full OpenAI Response:", content);

    // Extract and validate JSON from the OpenAI response
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No valid JSON found in OpenAI response.");
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
      console.error("Error parsing OpenAI response:", parseError);
      res.status(500).json({ error: 'Failed to parse headline analysis. Please clear your cache and try again.' });
    }

  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: 'An error occurred while analyzing the headline. Please clear your cache and try again.' });
  }
});

export default router;
