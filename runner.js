#!/usr/bin/env node
/**
 * Multi-agent runner — routes tasks to the right agent(s) and chains outputs.
 * Usage: node runner.js "your task here"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROFILES_PATH = path.join(__dirname, 'agent-profiles.json');

function loadAgents() {
  try {
    return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
  } catch {
    console.error('Error: could not read agent-profiles.json');
    process.exit(1);
  }
}

function classifyTask(task, agents) {
  const lower = task.toLowerCase();
  for (const agent of agents) {
    if (agent.keywords.some(kw => lower.includes(kw))) {
      return [agent.name];
    }
  }
  // No keyword match → chain all three agents sequentially
  return agents.map(a => a.name);
}

function buildPrompt(agent, task, context = '') {
  return agent.promptTemplate
    .replace('{{task}}', task)
    .replace('{{researchContext}}', context ? `Research context:\n${context}` : '')
    .replace('{{writerContext}}', context ? `Content to review:\n${context}` : '');
}

function separator(label) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  AGENT: ${label}`);
  console.log(`${line}\n`);
}

async function promptUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function run(task) {
  const agents = loadAgents();
  const agentMap = Object.fromEntries(agents.map(a => [a.name, a]));
  const chain = classifyTask(task, agents);

  console.log(`\nTask    : "${task}"`);
  console.log(`Routing : ${chain.join(' → ')}\n`);

  let context = '';

  for (const agentName of chain) {
    const agent = agentMap[agentName];
    separator(agentName);

    const prompt = buildPrompt(agent, task, context);

    console.log('PROMPT TO SEND:\n');
    console.log(prompt);
    console.log('\n--- Paste the above into your AI tool, then enter the response below ---');
    console.log('(Press Enter twice when done)\n');

    // Collect multi-line response
    const lines = [];
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    context = await new Promise(resolve => {
      rl.on('line', line => {
        if (line === '' && lines.length > 0 && lines[lines.length - 1] === '') {
          rl.close();
          resolve(lines.join('\n').trim());
        } else {
          lines.push(line);
        }
      });
    });

    // Save each agent's output to a log file
    const logFile = path.join(__dirname, `agent-output-${agentName.toLowerCase()}.txt`);
    fs.writeFileSync(logFile, `Task: ${task}\n\n${context}`, 'utf8');
    console.log(`\n✓ Output saved to ${path.basename(logFile)}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  FINAL OUTPUT');
  console.log('═'.repeat(60) + '\n');
  console.log(context);
  console.log('\n' + '═'.repeat(60));
}

// Entry point
const task = process.argv.slice(2).join(' ');
if (!task) {
  console.error('Usage: node runner.js "your task here"');
  console.error('Example: node runner.js "Explain quantum computing basics."');
  process.exit(1);
}

run(task).catch(err => { console.error(err); process.exit(1); });
