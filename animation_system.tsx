import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Download, Upload, Volume2, VolumeX } from 'lucide-react';

const AnimationStudio = () => {
  const [animations, setAnimations] = useState([
    {
      id: 1,
      name: 'Introduction IA',
      type: 'lottie',
      duration: 3000,
      data: null,
      isPlaying: false,
      currentTime: 0
    },
    {
      id: 2,
      name: 'Transition Chat',
      type: 'css',
      duration: 2000,
      isPlaying: false,
      currentTime: 0
    },
    {
      id: 3,
      name: 'Génération Code',
      type: 'mixed',
      duration: 4000,
      isPlaying: false,
      currentTime: 0
    }
  ]);

  const [activeAnimation, setActiveAnimation] = useState(animations[0]);
  const [timeline, setTimeline] = useState({ isPlaying: false, currentTime: 0, totalDuration: 5000 });
  const [audioSync, setAudioSync] = useState({ enabled: true, volume: 0.7 });
  const [exportSettings, setExportSettings] = useState({ format: 'web', quality: 'high' });

  const canvasRef = useRef(null);
  const timelineRef = useRef(null);
  const audioRef = useRef(null);

  // Lottie Animation Component
  const LottiePlayer = ({ animationData, isPlaying, onFrame }) => {
    const containerRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
      if (containerRef.current) {
        // Simulation Lottie (remplacer par vraie implémentation lottie-web)
        const ctx = containerRef.current.getContext('2d');
        let frameId;

        const animate = (timestamp) => {
          if (isPlaying) {
            // Animation simple pour démo
            ctx.clearRect(0, 0, 400, 300);
            ctx.fillStyle = `hsl(${timestamp / 10 % 360}, 70%, 50%)`;
            ctx.beginPath();
            ctx.arc(200 + Math.sin(timestamp / 500) * 50, 150, 30, 0, Math.PI * 2);
            ctx.fill();
            
            onFrame && onFrame(timestamp);
            frameId = requestAnimationFrame(animate);
          }
        };

        if (isPlaying) {
          frameId = requestAnimationFrame(animate);
        }

        return () => frameId && cancelAnimationFrame(frameId);
      }
    }, [isPlaying, onFrame]);

    return (
      <canvas 
        ref={containerRef} 
        width={400} 
        height={300}
        className="border rounded-lg bg-gray-900"
      />
    );
  };

  // CSS Animation Component
  const CSSAnimation = ({ isPlaying, type = 'fadeIn' }) => {
    const animations = {
      fadeIn: 'animate-fadeIn',
      slideUp: 'animate-slideUp',
      bounce: 'animate-bounce',
      pulse: 'animate-pulse',
      spin: 'animate-spin'
    };

    return (
      <div className="w-full h-[300px] border rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative overflow-hidden">
        <div className={`text-white text-2xl font-bold ${isPlaying ? animations[type] : ''}`}>
          Animation CSS
        </div>
        
        {/* Particules animées */}
        {isPlaying && Array.from({length: 20}).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${1 + Math.random()}s`
            }}
          />
        ))}
      </div>
    );
  };

  // Timeline Control
  const TimelineControl = () => {
    const [isDragging, setIsDragging] = useState(false);

    const handleTimelineClick = (e) => {
      const rect = timelineRef.current.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const newTime = percentage * timeline.totalDuration;
      setTimeline(prev => ({ ...prev, currentTime: newTime }));
    };

    return (
      <div className="w-full bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setTimeline(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {timeline.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{timeline.isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          
          <button
            onClick={() => setTimeline(prev => ({ ...prev, currentTime: 0, isPlaying: false }))}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-white text-sm">
            {Math.round(timeline.currentTime / 1000 * 10) / 10}s / {timeline.totalDuration / 1000}s
          </div>
        </div>

        {/* Timeline bar */}
        <div 
          ref={timelineRef}
          className="relative h-3 bg-gray-700 rounded-full cursor-pointer"
          onClick={handleTimelineClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
            style={{ width: `${(timeline.currentTime / timeline.totalDuration) * 100}%` }}
          />
          
          {/* Markers pour les animations */}
          {animations.map((anim, index) => (
            <div
              key={anim.id}
              className="absolute top-0 h-full w-1 bg-yellow-400"
              style={{ left: `${(index * 25)}%` }}
              title={anim.name}
            />
          ))}
        </div>

        {/* Audio sync controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAudioSync(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`p-2 rounded-lg transition-colors ${
                audioSync.enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
              } text-white`}
            >
              {audioSync.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioSync.volume}
              onChange={(e) => setAudioSync(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="w-20"
            />
          </div>

          <div className="text-white text-xs">
            Audio Sync: {audioSync.enabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>
    );
  };

  // Animation Editor Panel
  const AnimationEditor = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <h3 className="text-white text-lg font-semibold">Éditeur d'Animation</h3>
        
        {/* Animation List */}
        <div className="space-y-2">
          {animations.map((anim) => (
            <div
              key={anim.id}
              onClick={() => setActiveAnimation(anim)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                activeAnimation.id === anim.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{anim.name}</span>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                  {anim.type.toUpperCase()}
                </span>
              </div>
              <div className="text-xs mt-1 opacity-70">
                Durée: {anim.duration / 1000}s
              </div>
            </div>
          ))}
        </div>

        {/* Animation Properties */}
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-white text-md font-medium mb-3">Propriétés</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Nom</label>
              <input
                type="text"
                value={activeAnimation.name}
                onChange={(e) => {
                  setAnimations(prev => prev.map(a => 
                    a.id === activeAnimation.id ? { ...a, name: e.target.value } : a
                  ));
                  setActiveAnimation(prev => ({ ...prev, name: e.target.value }));
                }}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Durée (ms)</label>
              <input
                type="number"
                value={activeAnimation.duration}
                onChange={(e) => {
                  const duration = parseInt(e.target.value);
                  setAnimations(prev => prev.map(a => 
                    a.id === activeAnimation.id ? { ...a, duration } : a
                  ));
                  setActiveAnimation(prev => ({ ...prev, duration }));
                }}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Type</label>
              <select
                value={activeAnimation.type}
                onChange={(e) => {
                  setAnimations(prev => prev.map(a => 
                    a.id === activeAnimation.id ? { ...a, type: e.target.value } : a
                  ));
                  setActiveAnimation(prev => ({ ...prev, type: e.target.value }));
                }}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="lottie">Lottie</option>
                <option value="css">CSS</option>
                <option value="mixed">Mixte</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Export Panel
  const ExportPanel = () => {
    const handleExport = async () => {
      console.log('Export animation...', exportSettings);
      // Ici on implémenterait l'export réel
    };

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white text-lg font-semibold mb-4">Export</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Format</label>
            <select
              value={exportSettings.format}
              onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="web">Web (HTML5)</option>
              <option value="epub">ePub3</option>
              <option value="mobile">Mobile (React Native)</option>
              <option value="video">Vidéo MP4</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">Qualité</label>
            <select
              value={exportSettings.quality}
              onChange={(e) => setExportSettings(prev => ({ ...prev, quality: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Basse (Rapide)</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute (Lente)</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter Animation</span>
          </button>
        </div>
      </div>
    );
  };

  // Update timeline
  useEffect(() => {
    let interval;
    if (timeline.isPlaying) {
      interval = setInterval(() => {
        setTimeline(prev => {
          const newTime = prev.currentTime + 100;
          if (newTime >= prev.totalDuration) {
            return { ...prev, currentTime: 0, isPlaying: false };
          }
          return { ...prev, currentTime: newTime };
        });
      }, 100);
    }
    return () => interval && clearInterval(interval);
  }, [timeline.isPlaying]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Studio d'Animation Interactive
          </h1>
          <p className="text-gray-400 mt-2">
            Créez des animations synchronisées avec l'IA et l'audio
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Viewport principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Canvas d'animation */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{activeAnimation.name}</h2>
                <div className="flex space-x-2">
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                {activeAnimation.type === 'lottie' && (
                  <LottiePlayer 
                    isPlaying={timeline.isPlaying}
                    onFrame={(timestamp) => console.log('Frame:', timestamp)}
                  />
                )}
                {activeAnimation.type === 'css' && (
                  <CSSAnimation isPlaying={timeline.isPlaying} type="bounce" />
                )}
                {activeAnimation.type === 'mixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <LottiePlayer isPlaying={timeline.isPlaying} />
                    <CSSAnimation isPlaying={timeline.isPlaying} type="pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <TimelineControl />
          </div>

          {/* Panneau latéral */}
          <div className="space-y-6">
            <AnimationEditor />
            <ExportPanel />
          </div>
        </div>
      </div>

      {/* Audio element (caché) */}
      <audio ref={audioRef} />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 2s ease-out infinite;
        }
        
        .animate-slideUp {
          animation: slideUp 1s ease-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimationStudio;