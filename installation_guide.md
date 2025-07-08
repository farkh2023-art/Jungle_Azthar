# 🚀 GUIDE D'INSTALLATION - PLATEFORME IA INTERACTIVE

## 📋 **TABLE DES MATIÈRES**

1. [Prérequis](#prérequis)
2. [Installation Rapide](#installation-rapide)
3. [Configuration des API](#configuration-des-api)
4. [Démarrage des Services](#démarrage-des-services)
5. [Vérification de l'Installation](#vérification)
6. [Utilisation](#utilisation)
7. [Déploiement Production](#déploiement-production)
8. [Dépannage](#dépannage)

---

## 🛠️ **PRÉREQUIS**

### **Système**
- **OS** : Linux, macOS, ou Windows 10+
- **RAM** : 8GB minimum (16GB recommandé)
- **Stockage** : 20GB d'espace libre
- **Réseau** : Connexion internet stable

### **Logiciels Requis**

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.9+
sudo apt-get install python3.9 python3.9-pip

# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git
sudo apt-get install git
```

### **Clés API Nécessaires**

1. **Claude API** : [console.anthropic.com](https://console.anthropic.com)
2. **DeepSeek API** : [platform.deepseek.com](https://platform.deepseek.com)
3. **ElevenLabs** (optionnel) : [elevenlabs.io](https://elevenlabs.io)
4. **Azure Speech** (optionnel) : [azure.microsoft.com](https://azure.microsoft.com)

---

## ⚡ **INSTALLATION RAPIDE**

### **1. Clonage du Projet**

```bash
# Cloner le repository
git clone https://github.com/votre-username/ai-interactive-platform.git
cd ai-interactive-platform

# Créer la structure des dossiers
npm run setup
```

### **2. Configuration Environnement**

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer avec vos clés API
nano .env
```

**Contenu du fichier `.env` :**

```env
# ===== CLÉS API =====
CLAUDE_API_KEY=sk-ant-your-claude-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here
AZURE_SPEECH_KEY=your-azure-key-here
AZURE_SPEECH_REGION=westeurope

# ===== BASE DE DONNÉES =====
MONGODB_URI=mongodb://localhost:27017/ai-platform
REDIS_URL=redis://localhost:6379

# ===== SÉCURITÉ =====
JWT_SECRET=your-super-secret-jwt-key-256-bits-minimum
BCRYPT_ROUNDS=12

# ===== APPLICATION =====
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# ===== UPLOADS =====
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **3. Installation des Dépendances**

```bash
# Backend
npm install

# Frontend
cd frontend && npm install && cd ..

# Services Python
cd python-services && pip install -r requirements.txt && cd ..
```

---

## 🔌 **CONFIGURATION DES API**

### **Claude API Configuration**

1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com)
2. Générer une clé API
3. Tester la connexion :

```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_CLAUDE_KEY" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### **DeepSeek API Configuration**

1. S'inscrire sur [platform.deepseek.com](https://platform.deepseek.com)
2. Obtenir la clé API
3. Test :

```bash
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEEPSEEK_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

### **Services TTS (Optionnels)**

#### **ElevenLabs**
```bash
curl -X GET https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: YOUR_ELEVENLABS_KEY"
```

#### **Azure Speech**
```bash
curl -X POST "https://YOUR_REGION.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Ocp-Apim-Subscription-Key: YOUR_AZURE_KEY" \
  -H "Content-Type: application/ssml+xml"
```

---

## 🚀 **DÉMARRAGE DES SERVICES**

### **Option 1 : Développement Local**

```bash
# Terminal 1 - Base de données
docker-compose up mongo redis

# Terminal 2 - Backend
npm run dev

# Terminal 3 - Services Python
cd python-services && python main.py

# Terminal 4 - Frontend
cd frontend && npm start
```

### **Option 2 : Docker (Recommandé)**

```bash
# Démarrage complet
docker-compose up -d

# Vérification des logs
docker-compose logs -f

# Arrêt
docker-compose down
```

### **Option 3 : Développement avec Hot Reload**

```bash
# Démarrage avec rechargement automatique
npm run dev:all
```

---

## ✅ **VÉRIFICATION DE L'INSTALLATION**

### **1. Tests de Santé**

```bash
# API Backend
curl http://localhost:5000/health

# Services Python
curl http://localhost:8000/api/health

# Frontend
curl http://localhost:3000
```

**Réponse attendue API :**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "claude": "available",
    "deepseek": "available"
  }
}
```

### **2. Test d'Intégration IA**

```bash
# Test Claude
curl -X POST http://localhost:5000/api/chat/claude \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour, peux-tu me confirmer que tu fonctionnes ?",
    "mode": "chat"
  }'

# Test DeepSeek
curl -X POST http://localhost:5000/api/chat/deepseek \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### **3. Test TTS**

```bash
curl -X POST http://localhost:8000/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, ceci est un test de synthèse vocale.",
    "voice": "alloy",
    "language": "fr"
  }'
```

### **4. Test Génération ePub**

```bash
curl -X POST http://localhost:8000/api/export/epub \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test ePub",
    "author": "AI Platform",
    "content": [
      {
        "type": "chapter",
        "title": "Chapitre Test",
        "content": "Contenu de test pour vérifier la génération ePub."
      }
    ]
  }'
```

---

## 💻 **UTILISATION**

### **Interface Web**

1. **Accéder à l'application** : http://localhost:3000
2. **Sélectionner un mode** :
   - 🤖 **Chat IA** : Conversation générale
   - 📄 **Analyse Docs** : Analyse de documents
   - 💻 **Génération Code** : Création de code
   - 🔊 **Narration Audio** : Synthèse vocale

3. **Fonctionnalités avancées** :
   - Export de conversations
   - Génération d'ePub3 interactif
   - Animations synchronisées
   - Audio narratif

### **API Endpoints**

#### **Chat & IA**
```bash
POST /api/chat/claude          # Chat avec Claude
POST /api/chat/deepseek        # Chat avec DeepSeek
POST /api/documents/analyze    # Analyse de documents
```

#### **Multimédia**
```bash
POST /api/tts/synthesize       # Synthèse vocale
POST /api/animations/generate  # Génération d'animations
POST /api/sync/audio-animation # Synchronisation A/V
```

#### **Export**
```bash
POST /api/export/epub          # Génération ePub3
GET  /api/export/epub/status   # Statut génération
GET  /api/export/epub/download # Téléchargement
POST /api/export/mobile        # App mobile
```

### **Exemples d'Usage**

#### **Création d'Histoire Interactive**

```javascript
// 1. Génération de l'histoire
const story = await fetch('/api/chat/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Crée une histoire courte pour enfants sur un robot explorateur",
    mode: "chat"
  })
});

// 2. Génération audio
const audio = await fetch('/api/tts/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: story.content,
    voice: "nova",
    language: "fr"
  })
});

// 3. Génération ePub
const epub = await fetch('/api/export/epub', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Le Robot Explorateur",
    author: "IA Platform",
    content: [
      {
        type: "chapter",
        title: "L'Aventure Commence",
        content: story.content
      }
    ],
    audio_files: [audio.audio_data]
  })
});
```

---

## 🌐 **DÉPLOIEMENT PRODUCTION**

### **Préparation**

```bash
# Variables d'environnement production
cp .env.example .env.production

# Modification pour production
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env.production
sed -i 's/localhost/your-domain.com/' .env.production
```

### **Déploiement Docker**

```bash
# Build et déploiement
./scripts/deploy.sh production latest

# Ou manuel
docker-compose -f docker-compose.prod.yml up -d
```

### **Déploiement Kubernetes**

```bash
# Application des manifests
kubectl apply -f kubernetes/

# Vérification
kubectl get pods
kubectl get services
```

### **Configuration SSL/HTTPS**

```bash
# Let's Encrypt avec Certbot
sudo certbot --nginx -d yourplatform.com -d api.yourplatform.com

# Ou certificat manuel
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### **Monitoring Production**

- **Grafana** : http://monitoring.yourplatform.com
- **Prometheus** : http://monitoring.yourplatform.com/prometheus
- **Logs** : Centralisés via Loki

---

## 🔧 **DÉPANNAGE**

### **Problèmes Courants**

#### **Erreur "Claude API Key Invalid"**
```bash
# Vérification de la clé
echo $CLAUDE_API_KEY
curl -H "x-api-key: $CLAUDE_API_KEY" https://api.anthropic.com/v1/messages
```

#### **MongoDB Connection Failed**
```bash
# Vérification MongoDB
docker-compose logs mongo
docker exec -it mongo mongosh --eval "db.runCommand({connectionStatus: 1})"
```

#### **Redis Connection Issues**
```bash
# Test Redis
docker exec -it redis redis-cli ping
docker-compose restart redis
```

#### **Port 3000 déjà utilisé**
```bash
# Trouver le processus
lsof -i :3000
kill -9 PID

# Ou changer le port
PORT=3001 npm start
```

#### **Erreurs de dépendances Python**
```bash
# Réinstallation
cd python-services
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### **Logs et Debug**

```bash
# Logs détaillés
docker-compose logs -f api
docker-compose logs -f python-services

# Mode debug Node.js
DEBUG=* npm run dev

# Logs Python
cd python-services && python main.py --log-level DEBUG
```

### **Performance**

```bash
# Monitoring des ressources
docker stats

# Profiling Node.js
npm install -g clinic
clinic doctor -- node server.js

# Monitoring base de données
mongotop
mongostat
```

---

## 📞 **SUPPORT**

### **Documentation**
- **Wiki** : [Wiki du projet](https://github.com/votre-repo/wiki)
- **API Docs** : http://localhost:5000/docs
- **Exemples** : `/examples` directory

### **Communauté**
- **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)
- **Discussions** : [GitHub Discussions](https://github.com/votre-repo/discussions)
- **Discord** : [Serveur Discord](https://discord.gg/votre-serveur)

### **Contact**
- **Email** : support@yourplatform.com
- **Documentation** : docs.yourplatform.com

---

## 🎯 **PROCHAINES ÉTAPES**

1. ✅ **Installation terminée**
2. 🎨 **Personnalisation** de l'interface
3. 📱 **Génération d'app mobile**
4. 📖 **Création de votre premier ePub3**
5. 🚀 **Déploiement en production**

**Félicitations ! Votre plateforme IA interactive est prête ! 🎉**
