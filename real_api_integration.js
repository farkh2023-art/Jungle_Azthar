// ===== API-CLIENT.JS - CLIENT API FRONTEND =====
class APIClient {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
    this.wsConnection = null;
    this.eventCallbacks = new Map();
  }

  // ===== CONFIGURATION ET AUTHENTIFICATION =====
  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ===== SERVICES IA =====
  async sendClaudeMessage(message, mode = 'chat', options = {}) {
    const systemPrompts = {
      chat: `Tu es Claude, un assistant IA conversationnel expert. Réponds de manière naturelle et engageante en français. 
             Utilise des emojis appropriés et structure tes réponses clairement.`,
      
      documents: `Tu es un expert en analyse de documents. Analyse le contenu fourni et génère :
                  - Un résumé exécutif
                  - Les points clés principaux
                  - Des recommandations actionables
                  - Une évaluation du sentiment global`,
      
      code: `Tu es un expert en développement logiciel. Génère du code de haute qualité avec :
             - Commentaires explicatifs
             - Bonnes pratiques
             - Gestion d'erreurs
             - Tests unitaires si approprié
             - Documentation inline`,
      
      audio: `Tu es un expert en création de scripts audio. Génère un script optimisé pour la narration avec :
              - Timing et pauses naturelles
              - Intonations suggérées
              - Structure claire et engageante
              - Mots de liaison fluides`
    };

    const payload = {
      message,
      mode,
      options: {
        systemPrompt: systemPrompts[mode],
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        ...options
      }
    };

    const result = await this.makeRequest('/chat/claude', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Post-traitement selon le mode
    if (result.success) {
      result.content = this.postProcessResponse(result.content, mode);
    }

    return result;
  }

  async sendDeepSeekMessage(messages, options = {}) {
    const payload = {
      messages: this.formatMessagesForDeepSeek(messages),
      options: {
        maxTokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.8,
        topP: options.topP || 0.9,
        ...options
      }
    };

    return await this.makeRequest('/chat/deepseek', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ===== SERVICES MULTIMÉDIA =====
  async synthesizeSpeech(text, options = {}) {
    const payload = {
      text,
      voice: options.voice || 'alloy',
      language: options.language || 'fr',
      speed: options.speed || 1.0,
      format: options.format || 'mp3',
      quality: options.quality || 'high'
    };

    // Appel au service Python
    const response = await fetch('http://localhost:8000/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  async generateAnimation(animationType, content, options = {}) {
    const payload = {
      type: animationType,
      content,
      duration: options.duration || 3000,
      fps: options.fps || 30,
      width: options.width || 1920,
      height: options.height || 1080
    };

    const response = await fetch('http://localhost:8000/api/animations/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  async syncAudioAnimation(audioFile, animations, timeline) {
    const payload = {
      audio_file: audioFile,
      animations,
      timeline
    };

    const response = await fetch('http://localhost:8000/api/sync/audio-animation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  // ===== GÉNÉRATION DE CONTENU =====
  async generateEPub(title, author, content, animations = [], audioFiles = []) {
    const payload = {
      title,
      author,
      content,
      animations,
      audio_files: audioFiles,
      metadata: {
        language: 'fr',
        publisher: 'AI Platform',
        description: `Document interactif: ${title}`,
        keywords: ['IA', 'interactif', 'multimédia']
      }
    };

    const response = await fetch('http://localhost:8000/api/export/epub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  async checkEPubStatus(taskId) {
    const response = await fetch(`http://localhost:8000/api/export/epub/status/${taskId}`);
    return await response.json();
  }

  async downloadEPub(taskId) {
    const response = await fetch(`http://localhost:8000/api/export/epub/download/${taskId}`);
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskId}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    }
    
    return false;
  }

  async generateMobileApp(projectName, content, animations = []) {
    const payload = {
      project_name: projectName,
      content,
      animations
    };

    const response = await fetch('http://localhost:8000/api/export/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  }

  // ===== ANALYSE DE DOCUMENTS =====
  async analyzeDocument(documentContent, type = 'text') {
    const payload = {
      documentContent,
      type
    };

    return await this.makeRequest('/documents/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseURL}/documents/upload`);
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      xhr.send(formData);
    });
  }

  // ===== WEBSOCKETS TEMPS RÉEL =====
  connectWebSocket(roomId) {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    this.wsConnection = new WebSocket(`ws://localhost:5000?token=${this.token}`);
    
    this.wsConnection.onopen = () => {
      console.log('WebSocket connecté');
      this.wsConnection.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId
      }));
    };

    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.wsConnection.onclose = () => {
      console.log('WebSocket déconnecté');
      // Reconnexion automatique
      setTimeout(() => this.connectWebSocket(roomId), 3000);
    };

    this.wsConnection.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
  }

  sendWebSocketMessage(message, mode, roomId) {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type: 'message',
        data: { message, mode, roomId }
      }));
    }
  }

  handleWebSocketMessage(data) {
    const callbacks = this.eventCallbacks.get(data.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  onWebSocketEvent(eventType, callback) {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType).push(callback);
  }

  // ===== UTILITAIRES =====
  postProcessResponse(content, mode) {
    switch (mode) {
      case 'code':
        // Amélioration du formatage code
        return this.formatCodeResponse(content);
      case 'documents':
        // Structuration de l'analyse
        return this.formatDocumentAnalysis(content);
      case 'audio':
        // Optimisation pour TTS
        return this.formatAudioScript(content);
      default:
        return content;
    }
  }

  formatCodeResponse(content) {
    // Ajout de métadonnées pour coloration syntaxique
    const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g);
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const language = block.match(/```(\w+)/)?.[1] || 'javascript';
        // Ici on pourrait ajouter une validation syntaxique
      });
    }
    return content;
  }

  formatDocumentAnalysis(content) {
    // Structure l'analyse en sections
    const sections = {
      summary: '',
      keyPoints: [],
      recommendations: [],
      sentiment: 'neutral'
    };
    
    // Parse le contenu pour extraire les sections
    // Implémentation simplifiée
    return content;
  }

  formatAudioScript(content) {
    // Ajout de marqueurs pour TTS
    return content
      .replace(/\./g, '. <break time="0.5s"/>')
      .replace(/,/g, ', <break time="0.3s"/>')
      .replace(/\?/g, '? <break time="0.7s"/>')
      .replace(/!/g, '! <break time="0.7s"/>');
  }

  formatMessagesForDeepSeek(messages) {
    return messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  }

  // ===== GESTION D'ERREURS ET RETRY =====
  async withRetry(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.warn(`Tentative ${i + 1} échouée, retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponentiel
      }
    }
  }

  // ===== MONITORING ET ANALYTICS =====
  async getSystemHealth() {
    const [nodeHealth, pythonHealth] = await Promise.all([
      this.makeRequest('/health'),
      fetch('http://localhost:8000/api/health').then(r => r.json())
    ]);

    return {
      node: nodeHealth,
      python: pythonHealth,
      timestamp: new Date().toISOString()
    };
  }

  async getUsageStats() {
    return await this.makeRequest('/analytics/usage');
  }
}

// ===== ENHANCED-CHAT-SERVICE.JS - SERVICE CHAT AMÉLIORÉ =====
class EnhancedChatService {
  constructor(apiClient) {
    this.api = apiClient;
    this.conversationHistory = [];
    this.currentMode = 'chat';
    this.isTyping = false;
    this.typingIndicators = new Set();
  }

  async sendMessage(message, mode = this.currentMode, options = {}) {
    this.currentMode = mode;
    
    // Ajout à l'historique
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      mode: mode
    };
    
    this.conversationHistory.push(userMessage);
    
    try {
      this.setTyping(true);
      
      let response;
      
      // Sélection du service IA selon le mode et la complexité
      if (this.shouldUseDeepSeek(message, mode)) {
        response = await this.api.sendDeepSeekMessage(
          this.conversationHistory.slice(-5), // Contexte des 5 derniers messages
          options
        );
      } else {
        response = await this.api.sendClaudeMessage(message, mode, options);
      }

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.content,
          sender: 'ai',
          timestamp: new Date(),
          mode: mode,
          metadata: {
            model: response.model || 'claude',
            usage: response.usage,
            processingTime: response.processingTime
          }
        };
        
        this.conversationHistory.push(aiMessage);
        
        // Génération automatique d'audio si activé
        if (options.generateAudio && mode === 'audio') {
          await this.generateAudioForMessage(aiMessage);
        }
        
        return aiMessage;
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Erreur envoi message:', error);
      
      const errorMessage = {
        id: Date.now() + 2,
        text: `⚠️ Erreur: ${error.message}. Veuillez réessayer.`,
        sender: 'system',
        timestamp: new Date(),
        mode: 'error'
      };
      
      this.conversationHistory.push(errorMessage);
      return errorMessage;
      
    } finally {
      this.setTyping(false);
    }
  }

  shouldUseDeepSeek(message, mode) {
    // Logique de sélection du modèle
    const deepSeekModes = ['code', 'technical'];
    const isCodeRelated = /\b(code|script|function|algorithm|debug|program)\b/i.test(message);
    const isComplexQuery = message.length > 500;
    
    return deepSeekModes.includes(mode) || isCodeRelated || isComplexQuery;
  }

  async generateAudioForMessage(message) {
    try {
      const audioResult = await this.api.synthesizeSpeech(message.text, {
        voice: 'nova',
        language: 'fr',
        quality: 'high'
      });
      
      if (audioResult.success) {
        message.audioData = audioResult.audio_data;
        message.audioDuration = audioResult.duration;
      }
    } catch (error) {
      console.warn('Erreur génération audio:', error);
    }
  }

  setTyping(isTyping) {
    this.isTyping = isTyping;
    // Émission d'événement pour l'UI
    window.dispatchEvent(new CustomEvent('chatTypingChanged', { 
      detail: { isTyping } 
    }));
  }

  getConversationSummary() {
    const messages = this.conversationHistory.filter(m => m.sender !== 'system');
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.sender === 'user').length,
      aiMessages: messages.filter(m => m.sender === 'ai').length,
      modesUsed: [...new Set(messages.map(m => m.mode))],
      duration: this.getConversationDuration(),
      wordCount: messages.reduce((acc, m) => acc + m.text.split(' ').length, 0)
    };
  }

  getConversationDuration() {
    if (this.conversationHistory.length < 2) return 0;
    
    const start = this.conversationHistory[0].timestamp;
    const end = this.conversationHistory[this.conversationHistory.length - 1].timestamp;
    
    return Math.round((end - start) / 1000); // en secondes
  }

  exportConversation(format = 'json') {
    const data = {
      conversation: this.conversationHistory,
      summary: this.getConversationSummary(),
      exportedAt: new Date().toISOString()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'markdown':
        return this.convertToMarkdown(data);
      case 'txt':
        return this.convertToText(data);
      default:
        return data;
    }
  }

  convertToMarkdown(data) {
    let markdown = `# Conversation IA - ${new Date(data.exportedAt).toLocaleDateString()}\n\n`;
    
    data.conversation.forEach(msg => {
      const sender = msg.sender === 'user' ? '**Utilisateur**' : 
                    msg.sender === 'ai' ? '**IA**' : '**Système**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      
      markdown += `## ${sender} (${time}) [${msg.mode}]\n\n${msg.text}\n\n`;
    });
    
    markdown += `---\n**Résumé**: ${data.summary.totalMessages} messages, ${data.summary.duration}s\n`;
    
    return markdown;
  }

  convertToText(data) {
    return data.conversation.map(msg => 
      `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender.toUpperCase()}: ${msg.text}`
    ).join('\n\n');
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory() {
    return [...this.conversationHistory];
  }
}

// ===== INITIALISATION ET EXPORT =====
export { APIClient, EnhancedChatService };

// Initialisation globale
window.AIServices = {
  api: new APIClient(),
  chat: null,
  
  init(authToken = null) {
    if (authToken) {
      this.api.setAuthToken(authToken);
    }
    this.chat = new EnhancedChatService(this.api);
    
    // Connexion WebSocket
    this.api.connectWebSocket('default-room');
    
    console.log('🚀 Services IA initialisés');
    return this;
  }
};