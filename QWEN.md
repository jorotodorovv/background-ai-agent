# Project Context for Qwen Code

## Project Overview

This is a TypeScript-based AI agent controller that integrates with Slack to allow users to control AI agents through slash commands. The agent can perform tasks like cloning repositories, creating branches, generating implementation plans, executing those plans, and automatically creating commits and pull requests.

### Key Features
- Slack integration via slash commands (`/agent-on`, `/agent-off`, `/agent-do`)
- Swappable AI providers (Qwen, OpenAI)
- Automatic Git branch creation
- Implementation planning and execution
- Automatic commit message and PR generation
- GitHub PR creation

### Technologies Used
- TypeScript
- Node.js
- Slack Bolt SDK
- Git
- GitHub CLI (gh)
- Environment configuration with dotenv

## Project Structure

```
├── src/
│   ├── app.ts          # Main application entry point, Slack integration
│   ├── agent.ts        # Core agent logic for task execution
│   ├── ai-adapter.ts   # AI provider abstraction and implementations
│   ├── git.ts          # Git operations wrapper
│   ├── command.ts      # Command execution utilities
│   └── message-streamer.ts # Slack message streaming utilities
├── dist/               # Compiled JavaScript output
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── ecosystem.config.js # PM2 deployment configuration
```

## Building and Running

### Prerequisites
1. Node.js (version not specified, but likely >= 16 based on modern dependencies)
2. Git
3. GitHub CLI (gh)
4. Access to AI provider CLI tools (qwen, openai)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure credentials:
   ```bash
   cp .env.example .env
   ```
   Required environment variables:
   - `SLACK_BOT_TOKEN`: Slack bot token
   - `SLACK_SIGNING_SECRET`: Slack signing secret
   - `TARGET_REPO_URL`: Target repository URL for agent operations
   - `AI_PROVIDER`: AI provider (`qwen` or `openai`)
   - `OPENAI_API_KEY`: Required if using OpenAI provider

### Development Commands
- Build the project: `npm run build`
- Start the application: `npm start`
- Run in development mode: `npm run dev`

### Deployment
The application uses PM2 for process management with the configuration in `ecosystem.config.js`. Deploy with:
```bash
pm2 start ecosystem.config.js
```

## Development Conventions

### Architecture
1. **Modular Design**: Each functionality is separated into its own module (app, agent, ai-adapter, git, command)
2. **AI Provider Abstraction**: The `AIProvider` base class allows for swappable AI implementations
3. **Slack Integration**: Uses Slack Bolt SDK for handling slash commands and messaging
4. **Asynchronous Operations**: Most operations are asynchronous to handle long-running AI tasks

### Code Patterns
1. **Environment Configuration**: Uses dotenv for configuration management
2. **Command Execution**: Wraps external command execution with proper error handling
3. **Stream Processing**: Implements streaming for real-time updates during AI execution
4. **Error Handling**: Comprehensive error handling with detailed error messages

### AI Provider Implementation
- **Qwen Provider**: Uses the `qwen` CLI tool
- **OpenAI Provider**: Uses the `openai` CLI tool with API key authentication
- Both providers implement the same interface for consistent behavior

### Git Operations
All Git operations are abstracted in the `Git` class:
- Repository cloning
- Branch creation and checkout
- File staging
- Commit creation with messages
- Pushing to remote
- Pull request creation via GitHub CLI

## Usage Instructions

Once the application is running and connected to Slack:

1. Use `/agent-on` to enable the agent
2. Use `/agent-off` to disable the agent
3. Use `/agent-do <task>` to give the agent a task to complete

The agent will:
1. Clone the target repository to a temporary directory
2. Create a new branch based on the task
3. Generate an implementation plan using the AI
4. Execute the plan with real-time progress updates
5. Stage and commit changes
6. Push the branch and create a pull request
7. Clean up temporary files

## Important Notes

1. The agent requires access to the target repository via Git
2. GitHub CLI must be installed and authenticated for PR creation
3. AI provider CLI tools must be installed and accessible
4. The agent state is in-memory and will reset on process restart
5. Temporary directories are created for each task and cleaned up afterward