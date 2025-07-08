import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, FileText, Code, Mic, Play, Pause, Download, Settings, Moon, Sun } from 'lucide-react';

const MainInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const messagesEndRef = useRef(null);

  const modes = [
    { id: 'chat', label: 'Chat IA', icon: Bot, color: 'from-blue-500 to-purple-600' },
    { id: 'documents', label: 'Analyse Docs', icon: FileText, color: 'from-green-500 to-teal-600' },
    { id: 'code', label: 'Génération Code', icon: Code, color: 'from-orange-500 to-red-600' },
    { id: 'audio', label: 'Narration Audio', icon: Mic, color: 'from-pink-500 to-rose-600' }
  ];

  // Animation de chargement avec Lottie-like effect
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
    setDots('');
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialisation des services IA réels
  const [aiServices, setAiServices] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialisation des services IA
    const initServices = async () => {
      try {
        const services = window.AIServices?.init();
        if (services) {
          setAiServices(services);
          setIsConnected(true);
          
          // Listeners pour les événements temps réel
          services.api.onWebSocketEvent('message-response', (data) => {
            const aiMessage = {
              id: Date.now(),
              text: data.response,
              sender: 'ai',
              timestamp: new Date(data.timestamp),
              mode: data.mode
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
          });

          services.api.onWebSocketEvent('message-processing', () => {
            setIsLoading(true);
          });
        }
      } catch (error) {
        console.error('Erreur initialisation services IA:', error);
        setIsConnected(false);
      }
    };

    initServices();
  }, []);

  // Intégration API réelle
  const sendMessageToAI = async (message, mode) => {
    if (!aiServices || !isConnected) {
      throw new Error('Services IA non disponibles');
    }

    try {
      // Envoi via le service chat amélioré
      const response = await aiServices.chat.sendMessage(message, mode, {
        generateAudio: mode === 'audio',
        maxTokens: mode === 'code' ? 3000 : 2000,
        temperature: mode === 'chat' ? 0.8 : 0.7
      });

      return response;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !isConnected) return;

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      mode: activeMode
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Utilisation de l'API réelle
      const response = await sendMessageToAI(inputText, activeMode);
      
      // Le message AI est déjà ajouté par le service chat
      if (response && response.audioData && activeMode === 'audio') {
        // Lecture automatique de l'audio généré
        playGeneratedAudio(response.audioData);
      }
      
    } catch (error) {
      console.error('Erreur envoi message:', error);
      
      // Message d'erreur utilisateur
      const errorMessage = {
        id: Date.now() + 1,
        text: `❌ **Erreur** : ${error.message}. Veuillez vérifier votre connexion et réessayer.`,
        sender: 'system',
        timestamp: new Date(),
        mode: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour lire l'audio généré
  const playGeneratedAudio = (audioData) => {
    try {
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
        type: 'audio/mpeg'
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.play().then(() => {
        setIsPlaying(true);
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        });
      }).catch(err => {
        console.error('Erreur lecture audio:', err);
      });
    } catch (error) {
      console.error('Erreur traitement audio:', error);
    }
  };

  // Indicateur de connexion
  const ConnectionStatus = () => (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
      isConnected 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`} />
      <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
    </div>
  );

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Intégrer Web Speech API
  };

  const toggleAudioPlayback = () => {
    setIsPlaying(!isPlaying);
    // TODO: Intégrer synthèse vocale
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header avec animations */}
      <header className={`${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-b sticky top-0 z-50 backdrop-blur-md bg-opacity-90`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  Plateforme IA Interactive
                </h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Génération multimédia intelligente
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ConnectionStatus />
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar - Modes */}
          <div className="lg:col-span-1">
            <div className={`${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } rounded-xl border p-6`}>
              <h3 className="text-lg font-semibold mb-4">Modes de Génération</h3>
              <div className="space-y-3">
                {modes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setActiveMode(mode.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                        activeMode === mode.id
                          ? `bg-gradient-to-r ${mode.color} text-white shadow-lg`
                          : isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Audio Controls */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h4 className="text-sm font-semibold mb-3">Contrôles Audio</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleAudioPlayback}
                    className={`flex-1 flex items-center justify-center space-x-2 p-2 rounded-lg transition-colors ${
                      isPlaying 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span className="text-xs">TTS</span>
                  </button>
                  <button className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className={`${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } rounded-xl border flex flex-col h-[600px]`}>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${
                      modes.find(m => m.id === activeMode)?.color || 'from-blue-500 to-purple-600'
                    } flex items-center justify-center`}>
                      {React.createElement(modes.find(m => m.id === activeMode)?.icon || Bot, {
                        className: "w-8 h-8 text-white"
                      })}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Mode {modes.find(m => m.id === activeMode)?.label}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Commencez votre conversation avec l'IA
                    </p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-lg p-4 ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : isDarkMode
                            ? 'bg-gray-700 text-gray-100'
                            : 'bg-gray-100 text-gray-900'
                      } animate-fade-in-up`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                      <div className={`text-xs mt-1 opacity-70`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`max-w-md rounded-lg p-4 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm">IA réfléchit{dots}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
                <div className="flex space-x-3">
                  <button
                    onClick={toggleRecording}
                    className={`p-3 rounded-lg transition-all ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                        : isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Tapez votre message pour ${modes.find(m => m.id === activeMode)?.label.toLowerCase()}...`}
                      className={`w-full p-3 rounded-lg border resize-none transition-colors ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                      rows={2}
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className={`p-3 rounded-lg transition-all transform hover:scale-105 ${
                      !inputText.trim() || isLoading
                        ? isDarkMode 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MainInterface;