import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { App } from '@slack/bolt';
import { runAgentTask } from './agent.js'; // Import the core agent logic

// --- Agent State ---
// A simple in-memory flag to control the agent's operation.
// This state will reset if the Node.js process restarts (e.g., during deploys or crashes).
let isAgentEnabled = true;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // You might need to specify a Socket Mode receiver if not exposing via HTTP
  // appToken: process.env.SLACK_APP_TOKEN, // For Socket Mode
  // socketMode: true, // For Socket Mode
});

// --- Slash Command: /agent-on ---
// Enables the AI agent to accept new tasks.
app.command('/agent-on', async ({ ack, say }) => {
  await ack(); // Acknowledge the Slack command immediately
  isAgentEnabled = true;
  await say('✅ AI Agent is now **ON**. Ready to accept tasks.');
  console.log('AI Agent enabled by Slack command.');
});

// --- Slash Command: /agent-off ---
// Disables the AI agent from accepting new tasks.
app.command('/agent-off', async ({ ack, say }) => {
  await ack(); // Acknowledge the Slack command immediately
  isAgentEnabled = false;
  await say('❌ AI Agent is now **OFF**. It will not process new tasks.');
  console.log('AI Agent disabled by Slack command.');
});

// --- Slash Command: /agent-do ---
// The main command to trigger an AI agent task.
app.command('/agent-do', async ({ command, ack, say, respond }) => {
  await ack(); // Acknowledge the Slack command immediately

  // Check if the agent is currently enabled
  if (!isAgentEnabled) {
    await respond({
      text: 'Agent is currently disabled. Use `/agent-on` to enable it.',
      response_type: 'ephemeral', // Only visible to the user who issued the command
    });
    console.log('Rejected agent task: Agent is disabled.');
    return;
  }

  const prompt = command.text; // Get the text provided after the command
  if (!prompt) {
    await respond({
      text: 'Please provide a prompt. Usage: `/agent-do <your task>`',
      response_type: 'ephemeral',
    });
    console.log('Rejected agent task: No prompt provided.');
    return;
  }

  // Acknowledge the task and inform the user that processing has started
  await say(
    `🚀 Task received: "*${prompt}*". The AI agent is starting its work. This may take a few minutes...`,
  );
  console.log(`Starting agent task for prompt: "${prompt}"`);

  // Run the AI agent task asynchronously
  try {
    const resultMessage = await runAgentTask(prompt);
    // Send the success message back to Slack
    await say(`✅ ${resultMessage}`);
    console.log(`Agent task completed successfully for prompt: "${prompt}"`);
  } catch (error: any) {
    console.error(`Agent task failed for prompt: "${prompt}"`, error);
    // Send an error message back to Slack
    await say(
      `🚨 An error occurred while processing your task for "*${prompt}*".\n\n\`\`\`${
        error.message || 'Unknown error occurred.'
      }\`\`\`\nCheck the server logs for more details.`,
    );
  }
});

// --- Start the Slack App ---
(async () => {
  const port = process.env.PORT || 3000;
  try {
    await app.start(port);
    console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
  } catch (error) {
    console.error('Failed to start Slack app:', error);
    process.exit(1); // Exit if the app fails to start
  }
})();