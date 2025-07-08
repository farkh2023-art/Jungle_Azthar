// ===== TESTS/API.TEST.JS - TESTS UNITAIRES API =====
import request from 'supertest';
import app from '../server.js';
import { ClaudeService, DeepSeekService, TTSService } from '../services';

describe('API Tests', () => {
  let server;
  
  beforeAll(async () => {
    server = app.listen(0); // Port aléatoire pour les tests
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Health Endpoints', () => {
    test('GET /api/health should return system status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/healthy|degraded/),
        timestamp: expect.any(String),
        services: expect.any(Object)
      });
    });
  });

  describe('Claude API Integration', () => {
    test('POST /api/chat/claude should process messages correctly', async () => {
      const testMessage = {
        message: "Bonjour, peux-tu m'aider avec un projet de développement ?",
        mode: "chat",
        options: {
          maxTokens: 1000,
          temperature: 0.7
        }
      };

      const response = await request(app)
        .post('/api/chat/claude')
        .send(testMessage)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        content: expect.any(String),
        usage: expect.any(Object)
      });

      expect(response.body.content.length).toBeGreaterThan(10);
    });

    test('should handle different modes correctly', async () => {
      const modes = ['chat', 'documents', 'code', 'audio'];
      
      for (const mode of modes) {
        const response = await request(app)
          .post('/api/chat/claude')
          .send({
            message: `Test message for ${mode} mode`,
            mode: mode
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should handle API errors gracefully', async () => {
      // Test avec clé API invalide
      const originalKey = process.env.CLAUDE_API_KEY;
      process.env.CLAUDE_API_KEY = 'invalid-key';

      const response = await request(app)
        .post('/api/chat/claude')
        .send({
          message: "Test message",
          mode: "chat"
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });

      process.env.CLAUDE_API_KEY = originalKey;
    });
  });

  describe('DeepSeek API Integration', () => {
    test('POST /api/chat/deepseek should handle conversation context', async () => {
      const messages = [
        { role: 'user', content: 'Explique-moi les algorithmes de tri' },
        { role: 'assistant', content: 'Les algorithmes de tri...' },
        { role: 'user', content: 'Lequel est le plus efficace ?' }
      ];

      const response = await request(app)
        .post('/api/chat/deepseek')
        .send({ messages })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        content: expect.any(String)
      });
    });
  });

  describe('Document Analysis', () => {
    test('POST /api/documents/analyze should process text documents', async () => {
      const testDocument = {
        documentContent: "Ceci est un document de test pour l'analyse. Il contient plusieurs phrases et concepts importants à analyser.",
        type: "text"
      };

      const response = await request(app)
        .post('/api/documents/analyze')
        .send(testDocument)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        analysis: {
          summary: expect.any(String),
          keyPoints: expect.any(Array),
          sentiment: expect.any(String),
          length: expect.any(Number),
          type: "text"
        }
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = Array(105).fill().map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.allSettled(requests);
      const tooManyRequests = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(tooManyRequests.length).toBeGreaterThan(0);
    }, 10000);
  });
});

// ===== TESTS/SERVICES.TEST.JS - TESTS SERVICES =====
describe('Services Tests', () => {
  describe('ClaudeService', () => {
    let claudeService;

    beforeEach(() => {
      claudeService = new ClaudeService();
    });

    test('should initialize with correct configuration', () => {
      expect(claudeService.apiKey).toBeDefined();
      expect(claudeService.baseURL).toBe('https://api.anthropic.com/v1/messages');
    });

    test('should format messages correctly', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'Test response' }],
          usage: { input_tokens: 10, output_tokens: 20 }
        })
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await claudeService.sendMessage('Test message');

      expect(result).toMatchObject({
        success: true,
        content: 'Test response',
        usage: { input_tokens: 10, output_tokens: 20 }
      });

      expect(fetch).toHaveBeenCalledWith(
        claudeService.baseURL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': claudeService.apiKey
          })
        })
      );
    });

    test('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await claudeService.sendMessage('Test message');

      expect(result).toMatchObject({
        success: false,
        error: 'Network error'
      });
    });
  });

  describe('TTSService', () => {
    let ttsService;

    beforeEach(() => {
      ttsService = new TTSService();
    });

    test('should select appropriate TTS provider', async () => {
      const text = "Bonjour, ceci est un test de synthèse vocale.";
      
      // Mock des réponses API
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });

      const result = await ttsService.synthesizeSpeech(text, {
        voice: 'alloy',
        quality: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.audioData).toBeDefined();
      expect(result.format).toBe('mp3');
    });

    test('should estimate duration correctly', () => {
      const text = "This is a test sentence with exactly ten words total.";
      const duration = ttsService._estimateDuration(text, 150); // 150 WPM
      
      expect(duration).toBeCloseTo(4.0, 1); // ~4 seconds for 10 words at 150 WPM
    });
  });
});

// ===== TESTS/INTEGRATION.TEST.JS - TESTS D'INTÉGRATION =====
describe('Integration Tests', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new APIClient('http://localhost:5000/api');
  });

  describe('Full Workflow Tests', () => {
    test('should complete full content generation workflow', async () => {
      // 1. Envoi d'un message
      const chatResponse = await apiClient.sendClaudeMessage(
        "Crée une courte histoire pour enfants sur un robot amical",
        "chat"
      );

      expect(chatResponse.success).toBe(true);
      expect(chatResponse.content).toContain('robot');

      // 2. Génération d'audio
      const audioResponse = await apiClient.synthesizeSpeech(
        chatResponse.content.substring(0, 200), // Premier paragraphe
        { voice: 'nova', quality: 'high' }
      );

      expect(audioResponse.success).toBe(true);
      expect(audioResponse.audio_data).toBeDefined();

      // 3. Génération d'animation
      const animationResponse = await apiClient.generateAnimation(
        'lottie',
        {
          elements: [
            { type: 'text', text: 'Robot Amical', animation: { type: 'fadeIn' } }
          ]
        }
      );

      expect(animationResponse.success).toBe(true);

      // 4. Génération ePub
      const epubResponse = await apiClient.generateEPub(
        'Histoire du Robot Amical',
        'IA Platform',
        [
          { type: 'chapter', title: 'Chapitre 1', content: chatResponse.content }
        ],
        [animationResponse.lottie_data],
        [audioResponse.audio_data]
      );

      expect(epubResponse.success).toBe(true);
      expect(epubResponse.task_id).toBeDefined();

      // 5. Vérification du statut
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attente
      
      const statusResponse = await apiClient.checkEPubStatus(epubResponse.task_id);
      expect(['processing', 'completed']).toContain(statusResponse.status);
      
    }, 30000); // Timeout de 30s pour le workflow complet

    test('should handle error recovery in workflow', async () => {
      // Test de récupération d'erreur avec retry
      let attempts = 0;
      const unstableOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, data: 'Success after retries' };
      };

      const result = await apiClient.withRetry(unstableOperation, 3, 100);
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe('WebSocket Integration', () => {
    test('should establish WebSocket connection', (done) => {
      apiClient.connectWebSocket('test-room');

      apiClient.onWebSocketEvent('connection', () => {
        expect(apiClient.wsConnection.readyState).toBe(WebSocket.OPEN);
        done();
      });

      setTimeout(() => {
        if (apiClient.wsConnection.readyState !== WebSocket.OPEN) {
          done(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });

    test('should handle real-time message exchange', (done) => {
      apiClient.connectWebSocket('test-room');

      apiClient.onWebSocketEvent('message-response', (data) => {
        expect(data.response).toBeDefined();
        expect(data.mode).toBeDefined();
        done();
      });

      setTimeout(() => {
        apiClient.sendWebSocketMessage('Test real-time message', 'chat', 'test-room');
      }, 1000);
    });
  });
});

// ===== TESTS/PERFORMANCE.TEST.JS - TESTS DE PERFORMANCE =====
describe('Performance Tests', () => {
  test('API response time should be acceptable', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/api/chat/claude')
      .send({
        message: "Test de performance",
        mode: "chat"
      });

    const responseTime = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(10000); // Moins de 10 secondes
  });

  test('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();

    const requests = Array(concurrentRequests).fill().map(() =>
      request(app)
        .get('/api/health')
        .expect(200)
    );

    await Promise.all(requests);
    
    const totalTime = Date.now() - startTime;
    const avgTimePerRequest = totalTime / concurrentRequests;
    
    expect(avgTimePerRequest).toBeLessThan(1000); // Moins de 1s par requête en moyenne
  });

  test('memory usage should remain stable', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulation de charge
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/health');
    }
    
    // Force garbage collection si disponible
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // L'augmentation de mémoire ne devrait pas dépasser 50MB
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});

// ===== CYPRESS/E2E/FULL-WORKFLOW.SPEC.JS - TESTS END-TO-END =====
describe('Full Application Workflow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.wait(2000); // Attente du chargement initial
  });

  it('should complete full user workflow', () => {
    // Vérification du chargement de l'application
    cy.get('[data-testid="ai-platform-header"]').should('be.visible');
    cy.get('[data-testid="connection-status"]').should('contain', 'Connecté');

    // Sélection du mode chat
    cy.get('[data-testid="mode-chat"]').click();
    cy.get('[data-testid="mode-chat"]').should('have.class', 'bg-gradient-to-r');

    // Envoi d'un message
    const testMessage = "Peux-tu créer une courte histoire pour enfants ?";
    cy.get('[data-testid="message-input"]').type(testMessage);
    cy.get('[data-testid="send-button"]').click();

    // Vérification du message utilisateur
    cy.get('[data-testid="message-user"]').last().should('contain', testMessage);

    // Attente de la réponse IA
    cy.get('[data-testid="loading-indicator"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="message-ai"]', { timeout: 30000 }).should('be.visible');

    // Changement vers mode audio
    cy.get('[data-testid="mode-audio"]').click();
    
    // Test de génération audio
    cy.get('[data-testid="message-input"]').type("Raconte cette histoire avec une voix douce");
    cy.get('[data-testid="send-button"]').click();
    
    // Vérification de la génération audio
    cy.get('[data-testid="audio-player"]', { timeout: 30000 }).should('be.visible');

    // Test de génération d'animation
    cy.get('[data-testid="mode-code"]').click();
    cy.get('[data-testid="message-input"]').type("Crée une animation simple pour accompagner l'histoire");
    cy.get('[data-testid="send-button"]').click();

    // Vérification de la réponse code
    cy.get('[data-testid="message-ai"]', { timeout: 30000 }).last().should('contain', 'animation');
  });

  it('should handle error states gracefully', () => {
    // Simulation d'erreur réseau
    cy.intercept('POST', '**/api/chat/claude', { forceNetworkError: true }).as('networkError');
    
    cy.get('[data-testid="message-input"]').type("Test message");
    cy.get('[data-testid="send-button"]').click();
    
    cy.wait('@networkError');
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Erreur');
  });

  it('should export conversation successfully', () => {
    // Création d'une conversation
    cy.get('[data-testid="message-input"]').type("Bonjour !");
    cy.get('[data-testid="send-button"]').click();
    cy.get('[data-testid="message-ai"]', { timeout: 15000 }).should('be.visible');

    // Export de la conversation
    cy.get('[data-testid="settings-button"]').click();
    cy.get('[data-testid="export-conversation"]').click();
    cy.get('[data-testid="export-format-json"]').click();
    cy.get('[data-testid="confirm-export"]').click();

    // Vérification du téléchargement
    cy.readFile('cypress/downloads/conversation.json').should('exist');
  });

  it('should generate ePub successfully', () => {
    // Création de contenu
    cy.get('[data-testid="message-input"]').type("Crée une histoire courte avec titre et chapitres");
    cy.get('[data-testid="send-button"]').click();
    cy.get('[data-testid="message-ai"]', { timeout: 30000 }).should('be.visible');

    // Génération ePub
    cy.get('[data-testid="export-epub"]').click();
    cy.get('[data-testid="epub-title"]').type("Mon Histoire IA");
    cy.get('[data-testid="epub-author"]').type("Test Author");
    cy.get('[data-testid="generate-epub"]').click();

    // Attente de génération
    cy.get('[data-testid="generation-progress"]', { timeout: 60000 }).should('be.visible');
    cy.get('[data-testid="download-epub"]', { timeout: 120000 }).should('be.visible');
  });
});

// ===== JEST.CONFIG.JS - CONFIGURATION JEST =====
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'services/**/*.js',
    '!src/index.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};

// ===== TESTS/SETUP.JS - CONFIGURATION TESTS =====
import { jest } from '@jest/globals';

// Configuration globale des mocks
global.fetch = jest.fn();
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.CLAUDE_API_KEY = 'test-claude-key';
process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/ai-platform-test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Timeout global pour les tests
jest.setTimeout(30000);

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ===== PACKAGE.JSON SCRIPTS DE TEST =====
const testScripts = {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration",
  "test:e2e": "cypress run",
  "test:e2e:open": "cypress open",
  "test:performance": "jest tests/performance",
  "test:ci": "jest --ci --coverage --watchAll=false",
  "test:smoke": "jest tests/smoke --detectOpenHandles",
  "lint:test": "eslint tests/**/*.js",
  "test:docker": "docker-compose -f docker-compose.test.yml up --abort-on-container-exit"
};

console.log('Scripts de test à ajouter au package.json:', JSON.stringify(testScripts, null, 2));