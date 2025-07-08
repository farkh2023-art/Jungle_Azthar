# ===== ANIMATION_SERVICE.PY =====
import json
import asyncio
import tempfile
import os
from typing import Dict, List, Any, Tuple, Optional
import librosa
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import base64
import io

class AnimationService:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        self.lottie_templates = self._load_lottie_templates()
        
    async def generate(self, animation_type: str, content: Dict[Any, Any], 
                      duration: int = 3000, fps: int = 30, 
                      dimensions: Tuple[int, int] = (1920, 1080)) -> Dict:
        """Générateur principal d'animations"""
        try:
            if animation_type == "lottie":
                return await self.create_lottie(content, duration, fps)
            elif animation_type == "css":
                return self.generate_css_animation(content, duration)
            elif animation_type == "video":
                return await self.generate_video_animation(content, duration, fps, dimensions)
            elif animation_type == "mixed":
                return await self.generate_mixed_animation(content, duration, fps)
            else:
                raise ValueError(f"Type d'animation non supporté: {animation_type}")
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def create_lottie(self, elements: List[Dict[str, Any]], 
                           duration: int = 3000, fps: int = 30) -> Dict:
        """Création d'animation Lottie personnalisée"""
        try:
            # Structure de base Lottie
            lottie_data = {
                "v": "5.7.4",
                "fr": fps,
                "ip": 0,
                "op": duration * fps / 1000,
                "w": 1920,
                "h": 1080,
                "nm": "AI Generated Animation",
                "ddd": 0,
                "assets": [],
                "layers": []
            }
            
            # Génération des couches d'animation
            for i, element in enumerate(elements):
                layer = await self._create_lottie_layer(element, i, duration, fps)
                lottie_data["layers"].append(layer)
            
            # Ajout d'animations automatiques
            lottie_data = self._add_auto_animations(lottie_data, duration)
            
            return {
                "success": True,
                "lottie_data": lottie_data,
                "format": "lottie",
                "duration": duration,
                "fps": fps,
                "file_size": len(json.dumps(lottie_data))
            }
            
        except Exception as e:
            return {"success": False, "error": f"Erreur Lottie: {str(e)}"}
    
    async def _create_lottie_layer(self, element: Dict, index: int, 
                                  duration: int, fps: int) -> Dict:
        """Création d'une couche Lottie individuelle"""
        layer_type = element.get("type", "shape")
        
        base_layer = {
            "ddd": 0,
            "ind": index + 1,
            "ty": 4 if layer_type == "shape" else 0,
            "nm": element.get("name", f"Layer {index + 1}"),
            "sr": 1,
            "ks": {
                "o": {"a": 0, "k": 100},  # Opacité
                "r": {"a": 0, "k": 0},    # Rotation
                "p": {"a": 0, "k": [960, 540, 0]},  # Position
                "a": {"a": 0, "k": [0, 0, 0]},      # Point d'ancrage
                "s": {"a": 0, "k": [100, 100, 100]} # Échelle
            },
            "ao": 0,
            "ip": 0,
            "op": duration * fps / 1000,
            "st": 0,
            "bm": 0
        }
        
        # Animations spécifiques selon le type
        if element.get("animation"):
            base_layer["ks"] = await self._add_layer_animations(
                base_layer["ks"], element["animation"], duration, fps
            )
        
        # Formes et styles
        if layer_type == "shape":
            base_layer["shapes"] = self._create_shape_data(element)
        elif layer_type == "text":
            base_layer["t"] = self._create_text_data(element)
            
        return base_layer
    
    def _create_shape_data(self, element: Dict) -> List[Dict]:
        """Création des données de forme"""
        shape_type = element.get("shape", "rectangle")
        color = element.get("color", "#3B82F6")
        
        if shape_type == "rectangle":
            return [{
                "ty": "rc",
                "nm": "Rectangle",
                "p": {"a": 0, "k": [0, 0]},
                "s": {"a": 0, "k": [200, 100]},
                "r": {"a": 0, "k": 10}
            }, {
                "ty": "fl",
                "nm": "Fill",
                "c": {"a": 0, "k": self._hex_to_rgb_normalized(color)},
                "o": {"a": 0, "k": 100}
            }]
        elif shape_type == "circle":
            return [{
                "ty": "el",
                "nm": "Ellipse",
                "p": {"a": 0, "k": [0, 0]},
                "s": {"a": 0, "k": [100, 100]}
            }, {
                "ty": "fl",
                "nm": "Fill",
                "c": {"a": 0, "k": self._hex_to_rgb_normalized(color)},
                "o": {"a": 0, "k": 100}
            }]
        
        return []
    
    def _create_text_data(self, element: Dict) -> Dict:
        """Création des données de texte"""
        return {
            "d": {
                "k": [{
                    "s": {
                        "t": element.get("text", "Sample Text"),
                        "f": element.get("font", "Arial"),
                        "s": element.get("size", 48),
                        "fc": self._hex_to_rgb_normalized(element.get("color", "#FFFFFF")),
                        "j": 2,  # Centré
                        "tr": 0
                    },
                    "t": 0
                }]
            },
            "p": {},
            "m": {
                "g": 1,
                "a": {"a": 0, "k": [0, 0]}
            },
            "a": []
        }
    
    async def _add_layer_animations(self, ks: Dict, animation: Dict, 
                                   duration: int, fps: int) -> Dict:
        """Ajout d'animations à une couche"""
        anim_type = animation.get("type", "fadeIn")
        
        if anim_type == "fadeIn":
            ks["o"] = {
                "a": 1,
                "k": [
                    {"i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]}, "t": 0, "s": [0]},
                    {"t": duration * fps / 1000 / 3, "s": [100]}
                ]
            }
        elif anim_type == "slideUp":
            start_y = 540 + 200
            end_y = 540
            ks["p"] = {
                "a": 1,
                "k": [
                    {"i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]}, "t": 0, "s": [960, start_y, 0]},
                    {"t": duration * fps / 1000 / 2, "s": [960, end_y, 0]}
                ]
            }
        elif anim_type == "bounce":
            ks["s"] = {
                "a": 1,
                "k": [
                    {"i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]}, "t": 0, "s": [100, 100, 100]},
                    {"i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]}, "t": duration * fps / 1000 / 4, "s": [110, 110, 100]},
                    {"i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]}, "t": duration * fps / 1000 / 2, "s": [95, 95, 100]},
                    {"t": duration * fps / 1000 * 3 / 4, "s": [100, 100, 100]}
                ]
            }
        
        return ks
    
    def generate_css_animation(self, content: Dict, duration: int = 2000) -> Dict:
        """Génération d'animations CSS"""
        try:
            animation_name = content.get("name", "customAnimation")
            keyframes = content.get("keyframes", [])
            easing = content.get("easing", "ease-in-out")
            
            # Génération des keyframes CSS
            css_keyframes = f"@keyframes {animation_name} {{\n"
            
            for keyframe in keyframes:
                percentage = keyframe.get("percentage", 0)
                properties = keyframe.get("properties", {})
                
                css_keyframes += f"  {percentage}% {{\n"
                for prop, value in properties.items():
                    css_keyframes += f"    {prop}: {value};\n"
                css_keyframes += f"  }}\n"
            
            css_keyframes += "}\n\n"
            
            # Classe d'animation
            css_class = f".{animation_name} {{\n"
            css_class += f"  animation: {animation_name} {duration}ms {easing};\n"
            css_class += "}\n"
            
            full_css = css_keyframes + css_class
            
            return {
                "success": True,
                "css_code": full_css,
                "animation_name": animation_name,
                "duration": duration,
                "format": "css"
            }
            
        except Exception as e:
            return {"success": False, "error": f"Erreur CSS: {str(e)}"}
    
    async def sync_with_audio(self, audio_file: str, animations: List[Dict], 
                             timeline: List[Dict]) -> Dict:
        """Synchronisation audio et animations"""
        try:
            # Décodage audio
            audio_data = base64.b64decode(audio_file)
            
            # Analyse audio avec librosa
            with tempfile.NamedTemporaryFile(suffix='.wav') as temp_audio:
                temp_audio.write(audio_data)
                temp_audio.flush()
                
                y, sr = librosa.load(temp_audio.name)
                
                # Détection du tempo et des beats
                tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
                
                # Analyse spectrale pour détection d'énergie
                onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
                onset_times = librosa.frames_to_time(onset_frames, sr=sr)
                
                # Segmentation audio
                segments = self._segment_audio(y, sr, onset_times)
                
                # Création des markers de synchronisation
                sync_markers = []
                for i, segment in enumerate(segments):
                    if i < len(animations):
                        sync_markers.append({
                            "time": segment["start"],
                            "animation_id": animations[i].get("id"),
                            "trigger": "start",
                            "intensity": segment["energy"]
                        })
                
                return {
                    "success": True,
                    "sync_data": {
                        "tempo": float(tempo),
                        "beats": beats.tolist(),
                        "onset_times": onset_times.tolist(),
                        "duration": len(y) / sr,
                        "segments": segments
                    },
                    "timeline": timeline,
                    "markers": sync_markers
                }
                
        except Exception as e:
            return {"success": False, "error": f"Erreur sync: {str(e)}"}
    
    def _segment_audio(self, y: np.ndarray, sr: int, onset_times: np.ndarray) -> List[Dict]:
        """Segmentation de l'audio pour synchronisation"""
        segments = []
        
        for i, start_time in enumerate(onset_times):
            end_time = onset_times[i + 1] if i + 1 < len(onset_times) else len(y) / sr
            
            # Calcul de l'énergie du segment
            start_frame = int(start_time * sr)
            end_frame = int(end_time * sr)
            segment_audio = y[start_frame:end_frame]
            
            energy = np.mean(np.abs(segment_audio))
            
            segments.append({
                "start": float(start_time),
                "end": float(end_time),
                "duration": float(end_time - start_time),
                "energy": float(energy)
            })
        
        return segments
    
    def _hex_to_rgb_normalized(self, hex_color: str) -> List[float]:
        """Conversion couleur hex vers RGB normalisé"""
        hex_color = hex_color.lstrip('#')
        return [int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
    
    def _load_lottie_templates(self) -> Dict:
        """Chargement des templates Lottie prédéfinis"""
        return {
            "loading": {
                "type": "loading_spinner",
                "colors": ["#3B82F6", "#8B5CF6"],
                "duration": 2000
            },
            "success": {
                "type": "checkmark",
                "color": "#10B981",
                "duration": 1000
            },
            "error": {
                "type": "cross",
                "color": "#EF4444",
                "duration": 1000
            }
        }
    
    def health_check(self) -> Dict:
        """Vérification santé du service"""
        return {
            "status": "healthy",
            "temp_dir": self.temp_dir,
            "templates_loaded": len(self.lottie_templates)
        }

# ===== EPUB_GENERATOR.PY =====
import zipfile
import uuid
from datetime import datetime
from pathlib import Path
import xml.etree.ElementTree as ET
from jinja2 import Template
import asyncio
import shutil

class EPubGenerator:
    def __init__(self):
        self.tasks = {}
        self.output_dir = Path("./exports/epub")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    async def generate_async(self, task_id: str, title: str, author: str, 
                           content: List[Dict], animations: List[Dict] = None,
                           audio_files: List[str] = None, metadata: Dict = None):
        """Génération ePub3 asynchrone"""
        try:
            self.tasks[task_id] = {"status": "processing", "progress": 0}
            
            # Étape 1: Préparation des données
            self.tasks[task_id]["progress"] = 10
            epub_data = self._prepare_epub_data(title, author, content, animations, audio_files, metadata)
            
            # Étape 2: Génération des fichiers HTML
            self.tasks[task_id]["progress"] = 30
            html_files = self._generate_html_chapters(epub_data)
            
            # Étape 3: Génération CSS et JS
            self.tasks[task_id]["progress"] = 50
            css_content = self._generate_epub_css(animations)
            js_content = self._generate_epub_js(animations)
            
            # Étape 4: Création de la structure ePub
            self.tasks[task_id]["progress"] = 70
            epub_structure = self._create_epub_structure(epub_data, html_files, css_content, js_content)
            
            # Étape 5: Assemblage final
            self.tasks[task_id]["progress"] = 90
            epub_path = await self._assemble_epub(task_id, epub_structure)
            
            # Finalisation
            self.tasks[task_id] = {
                "status": "completed",
                "progress": 100,
                "file_path": str(epub_path),
                "file_size": epub_path.stat().st_size
            }
            
        except Exception as e:
            self.tasks[task_id] = {
                "status": "error",
                "progress": 0,
                "error": str(e)
            }
    
    def _prepare_epub_data(self, title: str, author: str, content: List[Dict],
                          animations: List[Dict], audio_files: List[str], metadata: Dict) -> Dict:
        """Préparation des données ePub"""
        return {
            "metadata": {
                "title": title,
                "author": author,
                "language": metadata.get("language", "fr"),
                "identifier": str(uuid.uuid4()),
                "date": datetime.now().isoformat(),
                "publisher": metadata.get("publisher", "AI Platform"),
                "description": metadata.get("description", "Document interactif généré par IA")
            },
            "content": content,
            "animations": animations or [],
            "audio_files": audio_files or [],
            "chapters": self._organize_chapters(content)
        }
    
    def _organize_chapters(self, content: List[Dict]) -> List[Dict]:
        """Organisation du contenu en chapitres"""
        chapters = []
        current_chapter = None
        
        for item in content:
            if item.get("type") == "chapter" or item.get("level") == 1:
                if current_chapter:
                    chapters.append(current_chapter)
                current_chapter = {
                    "id": f"chapter_{len(chapters) + 1}",
                    "title": item.get("title", f"Chapitre {len(chapters) + 1}"),
                    "content": [item],
                    "animations": [],
                    "audio": None
                }
            elif current_chapter:
                current_chapter["content"].append(item)
        
        if current_chapter:
            chapters.append(current_chapter)
            
        return chapters
    
    def _generate_html_chapters(self, epub_data: Dict) -> Dict[str, str]:
        """Génération des fichiers HTML des chapitres"""
        html_template = Template("""
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
    <meta charset="utf-8"/>
    <title>{{ chapter.title }}</title>
    <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
    <script src="../js/interactions.js"></script>
</head>
<body>
    <div class="chapter" id="{{ chapter.id }}">
        <h1 class="chapter-title animated fadeIn">{{ chapter.title }}</h1>
        
        {% for item in chapter.content %}
            {% if item.type == "text" %}
                <div class="text-content animated slideUp">
                    {{ item.html|safe }}
                </div>
            {% elif item.type == "animation" %}
                <div class="animation-container" data-animation="{{ item.animation_id }}">
                    <div class="lottie-player" data-src="{{ item.lottie_path }}"></div>
                </div>
            {% elif item.type == "audio" %}
                <div class="audio-container">
                    <audio controls preload="metadata" class="chapter-audio">
                        <source src="{{ item.audio_path }}" type="audio/mpeg"/>
                    </audio>
                </div>
            {% elif item.type == "interactive" %}
                <div class="interactive-element" data-type="{{ item.interactive_type }}">
                    {{ item.html|safe }}
                </div>
            {% endif %}
        {% endfor %}
    </div>
</body>
</html>
        """)
        
        html_files = {}
        for chapter in epub_data["chapters"]:
            html_content = html_template.render(chapter=chapter)
            html_files[f"{chapter['id']}.xhtml"] = html_content
            
        return html_files
    
    def _generate_epub_css(self, animations: List[Dict]) -> str:
        """Génération du CSS pour ePub3"""
        base_css = """
/* ePub3 Interactive Styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
    --primary-color: #3B82F6;
    --secondary-color: #8B5CF6;
    --text-color: #1F2937;
    --bg-color: #FFFFFF;
    --border-color: #E5E7EB;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    margin: 0;
    padding: 2rem;
    background-color: var(--bg-color);
}

.chapter {
    max-width: 800px;
    margin: 0 auto;
}

.chapter-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 2rem;
    text-align: center;
}

.text-content {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    border-left: 4px solid var(--primary-color);
}

.animation-container {
    margin: 2rem 0;
    text-align: center;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.lottie-player {
    width: 100%;
    max-width: 600px;
    height: 300px;
}

.audio-container {
    margin: 2rem 0;
    text-align: center;
    padding: 1rem;
    background: var(--bg-color);
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.chapter-audio {
    width: 100%;
    max-width: 500px;
}

.interactive-element {
    margin: 2rem 0;
    padding: 1.5rem;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.interactive-element:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgba(59, 130, 246, 0.3);
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
    0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
    40%, 43% { transform: translate3d(0, -8px, 0); }
    70% { transform: translate3d(0, -4px, 0); }
    90% { transform: translate3d(0, -2px, 0); }
}

.animated {
    animation-duration: 1s;
    animation-fill-mode: both;
}

.fadeIn { animation-name: fadeIn; }
.slideUp { animation-name: slideUp; animation-delay: 0.3s; }
.bounce { animation-name: bounce; }

/* Responsive */
@media (max-width: 768px) {
    body { padding: 1rem; }
    .chapter-title { font-size: 2rem; }
    .text-content { padding: 1rem; }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    :root {
        --text-color: #F9FAFB;
        --bg-color: #111827;
        --border-color: #374151;
    }
    
    .text-content {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }
}
        """
        
        # Ajout des animations personnalisées
        for animation in animations:
            if animation.get("type") == "css":
                base_css += f"\n/* Animation: {animation.get('name', 'Custom')} */\n"
                base_css += animation.get("css_code", "")
                
        return base_css
    
    def _generate_epub_js(self, animations: List[Dict]) -> str:
        """Génération du JavaScript pour ePub3"""
        js_content = """
// ePub3 Interactive JavaScript
(function() {
    'use strict';
    
    // Initialisation au chargement
    document.addEventListener('DOMContentLoaded', function() {
        initializeAnimations();
        initializeAudio();
        initializeInteractiveElements();
        setupIntersectionObserver();
    });
    
    function initializeAnimations() {
        // Chargement des animations Lottie
        const lottieContainers = document.querySelectorAll('.lottie-player');
        lottieContainers.forEach(container => {
            const animationPath = container.dataset.src;
            if (animationPath && window.lottie) {
                const animation = lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: animationPath
                });
                
                container.lottieAnimation = animation;
            }
        });
        
        // Animation des éléments au scroll
        const animatedElements = document.querySelectorAll('.animated');
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
        });
    }
    
    function initializeAudio() {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            // Synchronisation avec animations
            audio.addEventListener('play', function() {
                syncAnimationsWithAudio(audio);
            });
            
            audio.addEventListener('pause', function() {
                pauseAnimations();
            });
            
            audio.addEventListener('timeupdate', function() {
                updateAnimationProgress(audio.currentTime);
            });
        });
    }
    
    function initializeInteractiveElements() {
        const interactiveElements = document.querySelectorAll('.interactive-element');
        interactiveElements.forEach(element => {
            const type = element.dataset.type;
            
            switch(type) {
                case 'quiz':
                    setupQuiz(element);
                    break;
                case 'poll':
                    setupPoll(element);
                    break;
                case 'clickable':
                    setupClickable(element);
                    break;
            }
        });
    }
    
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.style.transition = 'all 0.6s ease-out';
                    
                    // Déclenchement des animations Lottie
                    const lottiePlayer = entry.target.querySelector('.lottie-player');
                    if (lottiePlayer && lottiePlayer.lottieAnimation) {
                        lottiePlayer.lottieAnimation.play();
                    }
                }
            });
        }, { threshold: 0.3 });
        
        document.querySelectorAll('.animated, .animation-container').forEach(el => {
            observer.observe(el);
        });
    }
    
    function syncAnimationsWithAudio(audioElement) {
        // Récupération des markers de synchronisation
        const syncData = audioElement.dataset.syncData;
        if (syncData) {
            const markers = JSON.parse(syncData);
            // Implémentation de la synchronisation
        }
    }
    
    function setupQuiz(element) {
        const questions = element.querySelectorAll('.quiz-question');
        questions.forEach(question => {
            const options = question.querySelectorAll('.quiz-option');
            options.forEach(option => {
                option.addEventListener('click', function() {
                    // Logic quiz
                    options.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    
                    if (this.dataset.correct === 'true') {
                        this.classList.add('correct');
                    } else {
                        this.classList.add('incorrect');
                    }
                });
            });
        });
    }
    
    // Utilitaires
    function pauseAnimations() {
        document.querySelectorAll('.lottie-player').forEach(container => {
            if (container.lottieAnimation) {
                container.lottieAnimation.pause();
            }
        });
    }
    
    function updateAnimationProgress(currentTime) {
        // Mise à jour des animations selon le temps audio
        const timeBasedAnimations = document.querySelectorAll('[data-start-time]');
        timeBasedAnimations.forEach(anim => {
            const startTime = parseFloat(anim.dataset.startTime);
            const endTime = parseFloat(anim.dataset.endTime || startTime + 3);
            
            if (currentTime >= startTime && currentTime <= endTime) {
                anim.classList.add('active');
            } else {
                anim.classList.remove('active');
            }
        });
    }
    
})();
        """
        
        return js_content
    
    async def _assemble_epub(self, task_id: str, epub_structure: Dict) -> Path:
        """Assemblage final du fichier ePub"""
        epub_path = self.output_dir / f"{task_id}.epub"
        
        with zipfile.ZipFile(epub_path, 'w', zipfile.ZIP_DEFLATED) as epub_zip:
            # Mimetype (doit être le premier fichier, non compressé)
            epub_zip.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
            
            # Structure META-INF
            epub_zip.writestr('META-INF/container.xml', epub_structure['container_xml'])
            
            # Structure OEBPS
            for filename, content in epub_structure['oebps_files'].items():
                epub_zip.writestr(f'OEBPS/{filename}', content)
        
        return epub_path
    
    def _create_epub_structure(self, epub_data: Dict, html_files: Dict, 
                              css_content: str, js_content: str) -> Dict:
        """Création de la structure complète ePub"""
        # Container.xml
        container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>"""
        
        # content.opf
        content_opf = self._generate_content_opf(epub_data, html_files)
        
        # toc.ncx
        toc_ncx = self._generate_toc_ncx(epub_data)
        
        # nav.xhtml
        nav_xhtml = self._generate_nav_xhtml(epub_data)
        
        oebps_files = {
            'content.opf': content_opf,
            'toc.ncx': toc_ncx,
            'nav.xhtml': nav_xhtml,
            'styles/main.css': css_content,
            'js/interactions.js': js_content,
            **html_files
        }
        
        return {
            'container_xml': container_xml,
            'oebps_files': oebps_files
        }
    
    def get_task_status(self, task_id: str) -> Dict:
        """Récupération du statut d'une tâche"""
        return self.tasks.get(task_id, {"status": "not_found"})
    
    def get_generated_file(self, task_id: str) -> Optional[str]:
        """Récupération du chemin du fichier généré"""
        task = self.tasks.get(task_id)
        if task and task.get("status") == "completed":
            return task.get("file_path")
        return None
    
    def health_check(self) -> Dict:
        """Vérification santé du générateur"""
        return {
            "status": "healthy",
            "active_tasks": len([t for t in self.tasks.values() if t.get("status") == "processing"]),
            "completed_tasks": len([t for t in self.tasks.values() if t.get("status") == "completed"]),
            "output_dir": str(self.output_dir)
        }
