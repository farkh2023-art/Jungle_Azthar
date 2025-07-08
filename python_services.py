# ===== main.py - SERVICE PRINCIPAL PYTHON =====
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import uvicorn
import logging
import tempfile
import os
from datetime import datetime
import json
import base64
import io

# Services spécialisés
from tts_service import TTSService
from animation_service import AnimationService
from epub_generator import EPubGenerator
from mobile_generator import MobileGenerator

# Configuration logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Platform Python Services",
    description="Services TTS, Animations et Génération de contenu",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation des services
tts_service = TTSService()
animation_service = AnimationService()
epub_generator = EPubGenerator()
mobile_generator = MobileGenerator()

# ===== MODÈLES PYDANTIC =====
class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"
    language: str = "fr"
    speed: float = 1.0
    format: str = "mp3"
    quality: str = "high"

class AnimationRequest(BaseModel):
    type: str  # "lottie", "css", "video"
    content: Dict[Any, Any]
    duration: int = 3000
    fps: int = 30
    width: int = 1920
    height: int = 1080

class EPubRequest(BaseModel):
    title: str
    author: str
    content: List[Dict[str, Any]]
    animations: List[Dict[str, Any]] = []
    audio_files: List[str] = []
    metadata: Dict[str, Any] = {}

class SyncRequest(BaseModel):
    audio_file: str
    animations: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]

# ===== ROUTES TTS =====
@app.post("/api/tts/synthesize")
async def synthesize_speech(request: TTSRequest):
    """Synthèse vocale avec différents moteurs TTS"""
    try:
        logger.info(f"Synthèse TTS: {request.text[:50]}...")
        
        # Génération audio
        audio_data = await tts_service.synthesize(
            text=request.text,
            voice=request.voice,
            language=request.language,
            speed=request.speed,
            format=request.format,
            quality=request.quality
        )
        
        if audio_data["success"]:
            return {
                "success": True,
                "audio_data": audio_data["data"],
                "format": request.format,
                "duration": audio_data.get("duration", 0),
                "file_size": len(audio_data["data"]),
                "metadata": audio_data.get("metadata", {})
            }
        else:
            raise HTTPException(status_code=500, detail=audio_data["error"])
            
    except Exception as e:
        logger.error(f"Erreur TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts/batch")
async def batch_synthesize(texts: List[str], voice: str = "alloy"):
    """Synthèse en lot pour plusieurs textes"""
    try:
        results = []
        for i, text in enumerate(texts):
            audio_data = await tts_service.synthesize(text=text, voice=voice)
            if audio_data["success"]:
                results.append({
                    "index": i,
                    "success": True,
                    "audio_data": audio_data["data"],
                    "duration": audio_data.get("duration", 0)
                })
            else:
                results.append({
                    "index": i,
                    "success": False,
                    "error": audio_data["error"]
                })
                
        return {"results": results, "total": len(texts)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== ROUTES ANIMATIONS =====
@app.post("/api/animations/generate")
async def generate_animation(request: AnimationRequest):
    """Génération d'animations Lottie, CSS ou vidéo"""
    try:
        logger.info(f"Génération animation: {request.type}")
        
        result = await animation_service.generate(
            animation_type=request.type,
            content=request.content,
            duration=request.duration,
            fps=request.fps,
            dimensions=(request.width, request.height)
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur animation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/animations/lottie")
async def create_lottie_animation(
    elements: List[Dict[str, Any]],
    duration: int = 3000,
    fps: int = 30
):
    """Création d'animation Lottie personnalisée"""
    try:
        lottie_data = await animation_service.create_lottie(
            elements=elements,
            duration=duration,
            fps=fps
        )
        
        return {
            "success": True,
            "lottie_data": lottie_data,
            "format": "lottie",
            "duration": duration,
            "fps": fps
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/animations/css")
async def generate_css_animation(
    properties: Dict[str, Any],
    keyframes: List[Dict[str, Any]],
    duration: int = 2000
):
    """Génération d'animations CSS"""
    try:
        css_code = animation_service.generate_css_animation(
            properties=properties,
            keyframes=keyframes,
            duration=duration
        )
        
        return {
            "success": True,
            "css_code": css_code,
            "format": "css",
            "duration": duration
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== ROUTES SYNCHRONISATION =====
@app.post("/api/sync/audio-animation")
async def sync_audio_animation(request: SyncRequest):
    """Synchronisation audio et animations"""
    try:
        sync_data = await animation_service.sync_with_audio(
            audio_file=request.audio_file,
            animations=request.animations,
            timeline=request.timeline
        )
        
        return {
            "success": True,
            "sync_data": sync_data,
            "timeline": sync_data.get("timeline", []),
            "markers": sync_data.get("markers", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== ROUTES GÉNÉRATION EPUB =====
@app.post("/api/export/epub")
async def generate_epub(request: EPubRequest, background_tasks: BackgroundTasks):
    """Génération d'ePub3 interactif"""
    try:
        logger.info(f"Génération ePub: {request.title}")
        
        # Génération en arrière-plan
        task_id = f"epub_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        background_tasks.add_task(
            epub_generator.generate_async,
            task_id=task_id,
            title=request.title,
            author=request.author,
            content=request.content,
            animations=request.animations,
            audio_files=request.audio_files,
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "processing",
            "estimated_time": "2-5 minutes"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/epub/status/{task_id}")
async def get_epub_status(task_id: str):
    """Statut de génération ePub"""
    status = epub_generator.get_task_status(task_id)
    return status

@app.get("/api/export/epub/download/{task_id}")
async def download_epub(task_id: str):
    """Téléchargement du fichier ePub généré"""
    file_path = epub_generator.get_generated_file(task_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(
        path=file_path,
        filename=f"{task_id}.epub",
        media_type="application/epub+zip"
    )

# ===== ROUTES MOBILE =====
@app.post("/api/export/mobile")
async def generate_mobile_app(
    project_name: str,
    content: List[Dict[str, Any]],
    animations: List[Dict[str, Any]] = [],
    background_tasks: BackgroundTasks = None
):
    """Génération d'application mobile React Native"""
    try:
        task_id = f"mobile_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        background_tasks.add_task(
            mobile_generator.generate_react_native_app,
            task_id=task_id,
            project_name=project_name,
            content=content,
            animations=animations
        )
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "processing",
            "estimated_time": "5-10 minutes"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== ROUTES UTILITAIRES =====
@app.get("/api/health")
async def health_check():
    """Vérification santé des services"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "tts": await tts_service.health_check(),
            "animation": animation_service.health_check(),
            "epub": epub_generator.health_check(),
            "mobile": mobile_generator.health_check()
        }
    }
    
    all_healthy = all(
        service["status"] == "healthy" 
        for service in health_status["services"].values()
    )
    
    if not all_healthy:
        health_status["status"] = "degraded"
    
    return health_status

@app.get("/api/voices")
async def get_available_voices():
    """Liste des voix TTS disponibles"""
    voices = await tts_service.get_available_voices()
    return {"voices": voices}

@app.post("/api/analyze/audio")
async def analyze_audio(file: UploadFile = File(...)):
    """Analyse d'un fichier audio pour synchronisation"""
    try:
        content = await file.read()
        analysis = await animation_service.analyze_audio(content)
        
        return {
            "success": True,
            "analysis": analysis,
            "duration": analysis.get("duration", 0),
            "tempo": analysis.get("tempo", 120),
            "beats": analysis.get("beats", []),
            "segments": analysis.get("segments", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== TTS_SERVICE.PY =====
import aiohttp
import asyncio
from typing import Dict, List, Optional
import base64
import tempfile
import os

class TTSService:
    def __init__(self):
        self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
        self.azure_key = os.getenv("AZURE_SPEECH_KEY")
        self.azure_region = os.getenv("AZURE_SPEECH_REGION")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        
    async def synthesize(self, text: str, voice: str = "alloy", **kwargs) -> Dict:
        """Synthèse vocale avec sélection automatique du meilleur moteur"""
        try:
            # Tentative avec ElevenLabs si disponible
            if self.elevenlabs_key and kwargs.get("quality", "high") == "high":
                result = await self._synthesize_elevenlabs(text, voice, **kwargs)
                if result["success"]:
                    return result
            
            # Fallback vers OpenAI TTS
            if self.openai_key:
                result = await self._synthesize_openai(text, voice, **kwargs)
                if result["success"]:
                    return result
            
            # Fallback vers Azure
            if self.azure_key:
                return await self._synthesize_azure(text, voice, **kwargs)
                
            return {"success": False, "error": "Aucun service TTS disponible"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _synthesize_elevenlabs(self, text: str, voice: str, **kwargs) -> Dict:
        """Synthèse avec ElevenLabs (qualité premium)"""
        voice_map = {
            "alloy": "pNInz6obpgDQGcFmaJgB",
            "echo": "TxGEqnHWrfWFTfGW9XjX",
            "fable": "XrExE9yKIg1WjnnlVkGX",
            "onyx": "ZQe5CZNOzWyzPSCn5a3c",
            "nova": "EXAVITQu4vr4xnSDxMaL",
            "shimmer": "pMsXgVXv3BLzUgSXRplE"
        }
        
        voice_id = voice_map.get(voice, voice_map["alloy"])
        
        async with aiohttp.ClientSession() as session:
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_key
            }
            
            data = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.5,
                    "use_speaker_boost": True
                }
            }
            
            async with session.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers=headers,
                json=data
            ) as response:
                if response.status == 200:
                    audio_content = await response.read()
                    return {
                        "success": True,
                        "data": base64.b64encode(audio_content).decode(),
                        "format": "mp3",
                        "provider": "elevenlabs",
                        "duration": self._estimate_duration(text),
                        "metadata": {"voice_id": voice_id, "model": "eleven_multilingual_v2"}
                    }
                else:
                    return {"success": False, "error": f"ElevenLabs API error: {response.status}"}
    
    async def _synthesize_openai(self, text: str, voice: str, **kwargs) -> Dict:
        """Synthèse avec OpenAI TTS"""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": "tts-1-hd" if kwargs.get("quality") == "high" else "tts-1",
                "input": text,
                "voice": voice,
                "speed": kwargs.get("speed", 1.0),
                "response_format": kwargs.get("format", "mp3")
            }
            
            async with session.post(
                "https://api.openai.com/v1/audio/speech",
                headers=headers,
                json=data
            ) as response:
                if response.status == 200:
                    audio_content = await response.read()
                    return {
                        "success": True,
                        "data": base64.b64encode(audio_content).decode(),
                        "format": kwargs.get("format", "mp3"),
                        "provider": "openai",
                        "duration": self._estimate_duration(text),
                        "metadata": {"model": data["model"], "voice": voice}
                    }
                else:
                    return {"success": False, "error": f"OpenAI API error: {response.status}"}
    
    def _estimate_duration(self, text: str, wpm: int = 150) -> float:
        """Estimation de la durée audio basée sur le nombre de mots"""
        words = len(text.split())
        return (words / wpm) * 60
    
    async def health_check(self) -> Dict:
        """Vérification de santé du service TTS"""
        status = {"status": "healthy", "providers": []}
        
        if self.elevenlabs_key:
            status["providers"].append("elevenlabs")
        if self.openai_key:
            status["providers"].append("openai")
        if self.azure_key:
            status["providers"].append("azure")
            
        if not status["providers"]:
            status["status"] = "unhealthy"
            status["error"] = "Aucune clé API configurée"
            
        return status
    
    async def get_available_voices(self) -> List[Dict]:
        """Liste des voix disponibles"""
        voices = [
            {"id": "alloy", "name": "Alloy", "language": "fr", "gender": "neutral"},
            {"id": "echo", "name": "Echo", "language": "fr", "gender": "male"},
            {"id": "fable", "name": "Fable", "language": "fr", "gender": "male"},
            {"id": "onyx", "name": "Onyx", "language": "fr", "gender": "male"},
            {"id": "nova", "name": "Nova", "language": "fr", "gender": "female"},
            {"id": "shimmer", "name": "Shimmer", "language": "fr", "gender": "female"}
        ]
        
        return voices

# ===== DÉMARRAGE DU SERVEUR =====
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )