#!/usr/bin/env node

/**
 * Generate Portuguese TTS narration for colágeno hook video
 * Uses external TTS service (Azure, Google Cloud, ElevenLabs, etc.)
 *
 * Usage: node generate-tts.mjs
 */

// TTS Script - Portuguese narration for colágeno hook
const voiceScript = [
  {
    text: "Colágeno: o segredo da beleza e saúde.",
    start: 0.3,
    duration: 1.5
  },
  {
    text: "Fortaleça seus ossos naturalmente.",
    start: 2.8,
    duration: 2.2
  },
  {
    text: "Pele mais lisa e brilhante em 30 dias.",
    start: 5.2,
    duration: 2.2
  },
  {
    text: "Musculação potente e definida.",
    start: 7.7,
    duration: 2.2
  },
  {
    text: "Seu corpo agradece. Comece hoje com SupliList!",
    start: 10.2,
    duration: 2.2
  }
];

console.log('🎬 Colágeno Hook Video — TTS Narration Script\n');
console.log('📝 Portuguese narration for bouncy captions:');
console.log('========================================\n');

voiceScript.forEach((line, idx) => {
  const endTime = (line.start + line.duration).toFixed(1);
  console.log(`[${line.start}s – ${endTime}s] "${line.text}"`);
});

console.log('\n✨ To generate actual audio narration:\n');
console.log('Option 1: Use browser Web Speech API (free)');
console.log('  - Add to hyperframes composition');
console.log('  - Use SpeechSynthesis.speak() in your browser');
console.log('  - Voice: "Google português (Brasil)" or similar\n');

console.log('Option 2: Azure Speech Services');
console.log('  npm install azure-cognitiveservices-speech');
console.log('  export AZURE_SPEECH_KEY=your_key');
console.log('  export AZURE_SPEECH_REGION=your_region');
console.log('  Voice: pt-BR-ThalitaNeural (female) or pt-BR-AntonioNeural (male)\n');

console.log('Option 3: Google Cloud Text-to-Speech');
console.log('  npm install @google-cloud/text-to-speech');
console.log('  export GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json');
console.log('  Language: pt-BR, Voice: pt-BR-Neural2-C (female)\n');

console.log('Option 4: ElevenLabs (Real-time AI Voice)');
console.log('  curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"');
console.log('  -H "xi-api-key: $ELEVENLABS_API_KEY"');
console.log('  -H "Content-Type: application/json"');
console.log('  -d "{\\"text\\": \\"Colágeno...\\"}"');
console.log('  Languages: Portuguese (Brazil)\n');

console.log('Option 5: IBM Watson Text to Speech');
console.log('  npm install ibm-watson');
console.log('  Language: pt-BR, Voice: pt_BRPaulaV3Voice\n');

console.log('📌 For quick testing:');
console.log('  1. Save audio file as: colageno-narration.mp3');
console.log('  2. Update HTML <audio> src to point to it');
console.log('  3. Run: npx hyperframes preview');
console.log('  4. Render: npx hyperframes render --output colageno-hook.mp4\n');
