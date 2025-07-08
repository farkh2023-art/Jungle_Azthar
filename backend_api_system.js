// ===== SERVER.JS - SERVEUR PRINCIPAL =====
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('redis');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// ===== CONFIGURATION REDIS =====
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));
redis.connect();

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes par fenêtre
  message: 'Trop de requêtes, réessayez plus tard',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===== SERVICES D'IA =====
class ClaudeService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async sendMessage(message, options = {}) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: options.maxTokens || 1000,
          messages: [
            {
              role: 'user',
              content: message
            }
          ],
          system: options.systemPrompt || 'Vous êtes un assistant IA expert en génération de contenu multimédia.'
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content[0].text,
        usage: data.usage
      };
    } catch (error) {
      console.error('Erreur Claude API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
  }

  async generateResponse(messages, options = {}) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          stream: false
        })
      });

      const data = await response.json();
      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error('Erreur DeepSeek API:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ===== SERVICES TTS =====
class TTSService {
  constructor() {
    this.elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    this.azureKey = process.env.AZURE_SPEECH_KEY;
    this.azureRegion = process.env.AZURE_SPEECH_REGION;
  }

  async synthesizeSpeech(text, options = {}) {
    const voice = options.voice || 'alloy';
    const provider = options.provider || 'elevenlabs';

    try {
      if (provider === 'elevenlabs') {
        return await this.synthesizeElevenLabs(text, voice);
      } else if (provider === 'azure') {
        return await this.synthesizeAzure(text, voice);
      }
    } catch (error) {
      console.error('Erreur TTS:', error);
      return { success: false, error: error.message };
    }
  }

  async synthesizeElevenLabs(text, voiceId = 'pNInz6obpgDQGcFmaJgB') {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenlabsKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      return {
        success: true,
        audioData: Buffer.from(audioBuffer).toString('base64'),
        format: 'mp3'
      };
    }
    throw new Error('ElevenLabs API Error');
  }
}

// ===== ROUTES API =====

// Route Chat Claude
app.post('/api/chat/claude', async (req, res) => {
  try {
    const { message, mode, options } = req.body;
    const claudeService = new ClaudeService();
    
    // Prompt spécialisé selon le mode
    const systemPrompts = {
      chat: 'Assistant conversationnel expert',
      documents: 'Expert en analyse de documents et synthèse',
      code: 'Expert en génération de code et architecture logicielle',
      audio: 'Expert en création de scripts pour narration audio'
    };

    const result = await claudeService.sendMessage(message, {
      systemPrompt: systemPrompts[mode] || systemPrompts.chat,
      ...options
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route DeepSeek
app.post('/api/chat/deepseek', async (req, res) => {
  try {
    const { messages, options } = req.body;
    const deepseekService = new DeepSeekService();
    
    const result = await deepseekService.generateResponse(messages, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route TTS
app.post('/api/audio/synthesize', async (req, res) => {
  try {
    const { text, voice, provider } = req.body;
    const ttsService = new TTSService();
    
    const result = await ttsService.synthesizeSpeech(text, { voice, provider });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route Upload et analyse de documents
app.post('/api/documents/analyze', async (req, res) => {
  try {
    const { documentContent, type } = req.body;
    
    // Ici on intégrerait un service d'analyse de documents
    // Par exemple, avec des bibliothèques comme pdf-parse, mammoth pour Word, etc.
    
    const analysis = {
      summary: 'Document analysé avec succès',
      keyPoints: ['Point 1', 'Point 2', 'Point 3'],
      sentiment: 'neutral',
      length: documentContent.length,
      type: type
    };

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== WEBSOCKETS POUR TEMPS RÉEL =====
io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} rejoint la room ${roomId}`);
  });

  socket.on('message', async (data) => {
    try {
      // Traiter le message avec l'IA appropriée
      const { message, mode, roomId } = data;
      
      // Émettre à tous les clients de la room
      io.to(roomId).emit('message-processing', { status: 'processing' });
      
      // Simulation de traitement (remplacer par vraie logique)
      setTimeout(() => {
        io.to(roomId).emit('message-response', {
          response: `Réponse IA pour: ${message}`,
          mode: mode,
          timestamp: new Date()
        });
      }, 2000);
      
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté:', socket.id);
  });
});

// ===== GESTION D'ERREURS =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

// ===== DÉMARRAGE SERVEUR =====
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-platform')
  .then(() => {
    console.log('✅ MongoDB connecté');
    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📡 WebSocket activé`);
      console.log(`🔄 Redis connecté`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1);
  });

// ===== GESTION GRACEFUL SHUTDOWN =====
process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt gracieux du serveur...');
  await redis.quit();
  await mongoose.connection.close();
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

module.exports = app;