const OpenAI = require('openai');
const { AITrainingDoc, SystemSetting } = require('../models');

// Initialize OpenAI with dynamic API key
let openai = null;

// Function to initialize OpenAI with API key from database
async function initializeOpenAI() {
  try {
    const setting = await SystemSetting.findOne({
      where: { setting_key: 'openai_api_key' }
    });
    
    const apiKey = setting?.value || process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey === 'sk-your-actual-openai-api-key-here') {
      throw new Error('OpenAI API key not configured');
    }
    
    openai = new OpenAI({ apiKey });
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI:', error);
    return false;
  }
}

// Check if message is a transfer request
const isTransferRequest = (message) => {
  const transferKeywords = [
    'speak to a human',
    'speak to an agent',
    'talk to a person',
    'talk to an agent',
    'real person',
    'real agent',
    'human agent',
    'live agent',
    'human support',
    'agent support',
    'transfer me',
    'connect me',
    'i want to speak',
    'i need to speak',
    'can i speak',
    'let me speak',
    'get me an agent',
    'get me a human',
    'i need help from',
    'i want help from',
    'escalate',
    'escalate to',
    'hand me over',
    'pass me to'
  ];
  
  const lowerMessage = message.toLowerCase();
  return transferKeywords.some(keyword => lowerMessage.includes(keyword));
};

// Generate AI response
const generateResponse = async (message, context = '', tenantId = null, brandId = null) => {
  try {
    // Initialize OpenAI if not already done
    if (!openai) {
      const initialized = await initializeOpenAI();
      if (!initialized) {
        throw new Error('OpenAI API key not configured');
      }
    }

    // Check if this is a transfer request
    const isTransfer = isTransferRequest(message);
    
    if (isTransfer) {
      return {
        response: "Alright, I'm transferring your chat to a real agent.",
        confidence: 0.9,
        tokens_used: 0,
        isTransferRequest: true
      };
    }

    // Get training documents for context - prioritize brand-specific training
    let trainingContext = '';
    if (tenantId) {
      let trainingDocs = [];
      
      // First, try to get brand-specific training documents
      if (brandId) {
        trainingDocs = await AITrainingDoc.findAll({
          where: { 
            tenant_id: tenantId,
            brand_id: brandId,
            is_active: true,
            status: 'completed'
          },
          order: [['category', 'ASC'], ['created_at', 'DESC']],
          limit: 10
        });
      }
      
      // If no brand-specific docs found, fall back to general tenant docs
      if (trainingDocs.length === 0) {
        trainingDocs = await AITrainingDoc.findAll({
          where: { 
            tenant_id: tenantId,
            brand_id: null, // General tenant-level training
            is_active: true,
            status: 'completed'
          },
          order: [['category', 'ASC'], ['created_at', 'DESC']],
          limit: 10
        });
      }
      
      // Build context from training documents
      if (trainingDocs.length > 0) {
        const contextParts = [];
        
        // Group by category for better organization
        const docsByCategory = {};
        trainingDocs.forEach(doc => {
          if (!docsByCategory[doc.category]) {
            docsByCategory[doc.category] = [];
          }
          docsByCategory[doc.category].push(doc);
        });
        
        // Build structured context
        Object.keys(docsByCategory).forEach(category => {
          const categoryDocs = docsByCategory[category];
          contextParts.push(`=== ${category.toUpperCase()} KNOWLEDGE ===`);
          categoryDocs.forEach(doc => {
            contextParts.push(`${doc.title}: ${doc.content}`);
          });
          contextParts.push(''); // Empty line between categories
        });
        
        trainingContext = contextParts.join('\n');
      }
    }

    // Get AI settings from system settings
    const aiSettings = await SystemSetting.findAll({
      where: { category: 'ai' }
    });

    // Convert AI settings to object
    const aiSettingsObj = {};
    aiSettings.forEach(setting => {
      aiSettingsObj[setting.setting_key] = setting.value;
    });

    // Get AI model, temperature, max tokens, and system message from settings
    const aiModel = aiSettingsObj.ai_model || 'gpt-3.5-turbo';
    const aiTemperature = parseFloat(aiSettingsObj.ai_temperature) || 0.7;
    const aiMaxTokens = parseInt(aiSettingsObj.ai_max_tokens) || 1000;
    const systemMessage = aiSettingsObj.ai_system_message || 'You are a helpful customer support AI assistant. You should be friendly, professional, and helpful.';

    const systemPrompt = `${systemMessage}
    ${trainingContext ? `Here is some context about the company and common questions:\n\n${trainingContext}\n\n` : ''}
    Please provide helpful responses to customer inquiries. If you cannot help with a specific request, politely suggest contacting a human agent.`;

    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: aiMaxTokens,
      temperature: aiTemperature
    });

    return {
      response: completion.choices[0].message.content,
      confidence: 0.8, // Placeholder confidence score
      tokens_used: completion.usage?.total_tokens || 0,
      isTransferRequest: false
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
};

// Generate reply suggestions
const generateReplySuggestions = async (customerMessage, context = '') => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a helpful assistant that generates reply suggestions for customer support agents. 
    Based on the customer's message, provide 3-5 short, professional reply suggestions that an agent could use.
    Each suggestion should be concise (1-2 sentences) and address the customer's concern appropriately.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Customer message: "${customerMessage}"\n\nContext: ${context}` }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    // Parse suggestions (assuming they're separated by newlines or numbers)
    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5);

    return suggestions;
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    throw error;
  }
};

// Check grammar and suggest improvements
const checkGrammar = async (text) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a grammar checker. Review the provided text and suggest improvements for grammar, spelling, and clarity. 
    Return your response in JSON format with the following structure:
    {
      "corrected_text": "corrected version of the text",
      "suggestions": ["list of specific suggestions"],
      "score": 0.95
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      return {
        corrected_text: text,
        suggestions: [],
        score: 1.0
      };
    }
  } catch (error) {
    console.error('Error checking grammar:', error);
    throw error;
  }
};

// Generate chat summary
const generateChatSummary = async (messages) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const messageText = messages
      .map(msg => `${msg.sender_type}: ${msg.message}`)
      .join('\n');

    const systemPrompt = `You are a helpful assistant that creates concise summaries of customer support conversations. 
    Please provide a brief summary (2-3 sentences) of the conversation, highlighting the main issue and resolution.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversation:\n${messageText}` }
      ],
      max_tokens: 150,
      temperature: 0.5
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating chat summary:', error);
    throw error;
  }
};

// Add document to knowledge base
const addDocumentToKnowledgeBase = async (tenantId, docId, content) => {
  try {
    // For now, we'll just store the content in the database
    // In a more advanced implementation, you might want to:
    // 1. Chunk the content into smaller pieces
    // 2. Create embeddings using OpenAI's embedding API
    // 3. Store embeddings in a vector database
    // 4. Implement semantic search

    console.log(`Added document ${docId} to knowledge base for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('Error adding document to knowledge base:', error);
    throw error;
  }
};

// Remove document from knowledge base
const removeDocumentFromKnowledgeBase = async (tenantId, docId) => {
  try {
    // Remove from vector database if implemented
    console.log(`Removed document ${docId} from knowledge base for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('Error removing document from knowledge base:', error);
    throw error;
  }
};

// Search knowledge base
const searchKnowledgeBase = async (query, tenantId) => {
  try {
    // Simple text search for now
    const trainingDocs = await AITrainingDoc.findAll({
      where: { 
        tenant_id: tenantId,
        is_active: true 
      }
    });

    // Simple keyword matching
    const results = trainingDocs.filter(doc => 
      doc.content.toLowerCase().includes(query.toLowerCase())
    );

    return results.map(doc => ({
      id: doc.id,
      title: doc.original_filename,
      content: doc.content.substring(0, 200) + '...',
      relevance_score: 0.8 // Placeholder
    }));
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    throw error;
  }
};

// Analyze sentiment
const analyzeSentiment = async (text) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `Analyze the sentiment of the following text and return a JSON response with:
    {
      "sentiment": "positive|negative|neutral",
      "confidence": 0.95,
      "emotions": ["frustrated", "happy", "confused"]
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      return {
        sentiment: "neutral",
        confidence: 0.5,
        emotions: []
      };
    }
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
};

module.exports = {
  initializeOpenAI,
  generateResponse,
  isTransferRequest,
  generateReplySuggestions,
  checkGrammar,
  generateChatSummary,
  addDocumentToKnowledgeBase,
  removeDocumentFromKnowledgeBase,
  searchKnowledgeBase,
  analyzeSentiment
};