# Gemini AI Agent

Agente de IA construido con la API de Google Gemini basado en el curso
"Production AI Systems – Week 1", con extensiones propias orientadas a producción.

## Features
- Integración con Gemini API
- Sistema de prompts modular
- Manejo de errores y timeouts
- Configuración por variables de entorno
- Arquitectura preparada para escalar

## Arquitectura
- Agent Core
- Prompt Layer
- Tool / Function Calling (si aplica)
- API Layer

## Tech Stack
- Python
- Google Gemini API
- dotenv
- FastAPI (opcional)

##  Instalación
```bash
git clone git@github.com:GORDIAN12/Deploy-AI-to-AWS-GCP-Azure-Vercel-with-MLOps.git
cd gemini-agent
pip install -r requirements.txt