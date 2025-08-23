# AI Agent Controller

Controls AI agents via Slack using TypeScript.

## Features

- Slack integration for controlling AI agents
- Swappable AI providers (Qwen, OpenAI, etc.)
- Automatic branch creation
- Implementation planning and execution
- Automatic commit message and PR generation
- GitHub PR creation

## Setup

1. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Configuration

The AI provider can be configured using environment variables:

- `AI_PROVIDER`: The AI provider to use (`qwen` or `openai`)
- `AI_MODEL`: The specific model to use (optional, defaults to provider-specific models)
- `OPENAI_API_KEY`: API key for OpenAI (required if using OpenAI provider)

See `.env.example` for more details.

## Usage

Once the application is running and connected to Slack:

1. Use `/agent-on` to enable the agent
2. Use `/agent-off` to disable the agent
3. Use `/agent-do <task>` to give the agent a task to complete