# 🌟 Plateforme IA Interactive

> **Version 1.0 – 08 juillet 2025**

La **Plateforme IA Interactive** est un écosystème open‑source permettant de créer, déployer et distribuer du contenu multimédia intelligent : chat IA avancé, génération d’ePub3 interactifs, animation synchronisée et applications mobiles React Native.

---
## Table des matières
1. [Fonctionnalités clés](#fonctionnalités-clés)
2. [Demo rapide](#demo-rapide)
3. [Installation locale](#installation-locale)
4. [Structure du dépôt](#structure-du-dépôt)
5. [Variables d’environnement](#variables-denvironnement)
6. [Scripts npm importants](#scripts-npm-importants)
7. [Contribuer](#contribuer)
8. [Licence](#licence)

---

## Fonctionnalités clés
- 🤖 **Chat multi‑modal** (Claude 4, DeepSeek…)
- 🎬 **Éditeur d’animations** (Lottie, CSS, Framer Motion)
- 🔊 **Synthèse vocale** multi‑provider (ElevenLabs, Azure, OpenAI)
- 📖 **Génération ePub3** enrichi avec audio et animations
- 📱 **Apps web & mobiles** (React 18, React Native)
- 🚀 **Déploiement** Docker / Kubernetes, CI GitHub Actions
- 📊 **Monitoring** Prometheus, Grafana, Loki
- 🔒 **Sécurité** JWT, RBAC, chiffrage at‑rest & in‑transit

## Demo rapide
```bash
git clone https://github.com/votre‑username/ai‑interactive‑platform.git
cd ai‑interactive‑platform
cp .env.example .env        # ajoutez vos clés API
docker‑compose up -d        # démarre Mongo, Redis, backend, services Python, frontend
open http://localhost:3000  # laisse 20–30 s pour le 1ᵉʳ build
```

## Installation locale
<details>
<summary>Sans Docker (⇣ développeurs Node/Python)</summary>

```bash
# Pré‑requis : Node 18, Python 3.9+, Mongo, Redis
npm install                  # backend
cd frontend && npm install   # frontend
cd ../services/python && pip install -r requirements.txt
npm run dev:all              # hot reload back + front
```
</details>

## Structure du dépôt
```text
.
├── apps
│   ├── backend/             # API REST Node.js + TypeScript
│   ├── web/                 # Interface React 18 + Vite
│   └── mobile/              # Expo + React Native
├── services
│   └── python/              # FastAPI : TTS, ePub, animation
├── packages
│   └── common/              # Utils partagés (ts + py)
├── docs/                    # Documentation Markdown
├── scripts/                 # Scripts CI/CD, déploiement
├── kubernetes/              # Manifests Helm/K8s
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md
└── README.md
```

**Créer l’arborescence (Unix / Git Bash)** :
```bash
mkdir -p apps/{{backend,web,mobile}}              services/python              packages/common              docs scripts kubernetes
```

## Variables d’environnement
Toutes les variables obligatoires sont listées dans **`.env.example`** ; copiez ce fichier puis remplissez vos clés API et secrets.

## Scripts npm importants
| Script                 | Description                                    |
|------------------------|------------------------------------------------|
| `npm run dev`          | Backend Node (ts‑node + nodemon)               |
| `npm run dev:all`      | Backend + Frontend + Services Python           |
| `npm test`             | Tests Jest                                     |
| `npm run lint`         | ESLint + Prettier                              |
| `npm run build`        | Build production (backend + frontend)          |
| `docker-compose up -d` | Démarrage complet via conteneurs               |

## Contribuer
1. Fork / clone, créez une branche `feature/<nom>`.
2. Suivez les [Conventional Commits](https://www.conventionalcommits.org).
3. ⚙️ Lint & tests doivent passer (`npm run ci`).
4. Ouvrez une Pull Request détaillée, assignez un reviewer.

## Licence
MIT – © 2025 Plateforme IA Interactive
