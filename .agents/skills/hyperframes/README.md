# Colágeno Hook Video — Hyperframes Composition

**9:16 TikTok-style hook video** about colágeno (collagen) with bouncy captions synced to Portuguese TTS narration.

## 🎬 What's Included

- **`index.html`** — Main composition (1080×1920px, vertical)
- **`design.md`** — Visual design system (Dark Luxury Supplement aesthetic)
- **`generate-tts.mjs`** — Script to generate Portuguese narration
- **Bouncy captions** — Synced to audio with scale animations
- **5 scenes** — Hook, Benefits 1-3, Outro CTA
- **Glow effects** — Dark luxury aesthetic with accent pops

## 📝 Portuguese Narration Script

```
[0.3s – 1.8s]  Colágeno: o segredo da beleza e saúde.
[2.8s – 5.0s]  Fortaleça seus ossos naturalmente.
[5.2s – 7.4s]  Pele mais lisa e brilhante em 30 dias.
[7.7s – 9.9s]  Musculação potente e definida.
[10.2s – 12.4s] Seu corpo agradece. Comece hoje com SupliList!
```

## 🔊 Generate TTS Audio

### Option 1: Web Speech API (Free, Browser)

```html
<!-- In composition script -->
const utterance = new SpeechSynthesisUtterance("Colágeno: o segredo da beleza e saúde.");
utterance.lang = 'pt-BR';
utterance.voice = speechSynthesis.getVoices().find(v => v.lang === 'pt-BR');
speechSynthesis.speak(utterance);
```

### Option 2: Azure Speech Services (Recommended)

```bash
npm install azure-cognitiveservices-speech

export AZURE_SPEECH_KEY="your-key"
export AZURE_SPEECH_REGION="eastus"

node generate-tts.mjs
```

Voice options:
- `pt-BR-ThalitaNeural` (Female, young)
- `pt-BR-AntonioNeural` (Male, mature)

### Option 3: Google Cloud TTS

```bash
npm install @google-cloud/text-to-speech

export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"

node generate-tts.mjs
```

Language: `pt-BR`
Voice: `Neural2-C` (Female)

### Option 4: ElevenLabs (Real-time AI)

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Colágeno: o segredo da beleza e saúde.",
    "model_id": "eleven_monolingual_v1"
  }'
```

## 🎨 Design System

**Colors:**
- Background: `#0A0E1A` (Deep dark)
- Text Primary: `#FFFFFF` (Pure white)
- Text Secondary: `#E0E7FF` (Light blue)
- Accent: `#FF6B35` (Energy orange)
- Secondary: `#4F46E5` (Indigo)

**Typography:**
- Headlines: Poppins Bold 700 (72–120px)
- Body: Inter Regular 400 (24–32px)
- Captions: Poppins SemiBold 600 (32px)

**Motion:**
- Entrance eases: `power3.out`, `expo.out`, `back.out`
- Stagger: 100–150ms between elements
- Caption bounce: scale 0.7 → 1.05 → 1 (0.3s)

## 🚀 Preview

```bash
# Install hyperframes (if not already)
npm install -g @hyperframes/cli

# Preview the composition
npx hyperframes preview

# Opens at http://localhost:5000
```

The preview auto-reloads on HTML changes. Captions and animations update in real-time.

## 📹 Render Video

### Render with Default Settings

```bash
# Outputs: colageno-hook.mp4 (1080×1920, H.264, 30fps)
npx hyperframes render --output colageno-hook.mp4
```

### Render with Audio

First, save the TTS narration as `colageno-narration.mp3`, then:

```bash
# Update the <audio> src in index.html to point to colageno-narration.mp3
# Then render:
npx hyperframes render --output colageno-hook-with-narration.mp4
```

### Render with Custom Settings

```bash
# Framerate, codec, bitrate
npx hyperframes render \
  --output colageno-hook.mp4 \
  --fps 60 \
  --bitrate 8000k \
  --codec h264

# Output: ~30MB, high quality
```

## ✅ Quality Checks

```bash
# Validate HTML structure and timing
npx hyperframes validate

# Check for text overflow and layout issues
npx hyperframes inspect

# Check WCAG contrast ratios
npx hyperframes validate --check contrast

# Generate animation timeline analysis
node scripts/animation-map.mjs .
```

## 📊 Video Specs

| Property | Value |
|----------|-------|
| **Aspect Ratio** | 9:16 (Vertical) |
| **Resolution** | 1080×1920px |
| **Duration** | 12.5 seconds |
| **Format** | MP4 (H.264) |
| **Framerate** | 30fps (default) |
| **Codec** | H.264 (MP4 compatible) |
| **Audio Track** | TTS narration (Portuguese) |
| **Captions** | Bouncy, synced to audio |

## 🎯 Scene Breakdown

| Time | Scene | Content | Animation |
|------|-------|---------|-----------|
| 0–2.5s | Hook | "Colágeno Perfeito" | Slide-in hero text |
| 2.5–5s | Benefit 1 | 🦴 Ossos Fortes | Icon bounce, text slide |
| 5–7.5s | Benefit 2 | ✨ Pele Radiante | Icon bounce, text slide |
| 7.5–10s | Benefit 3 | 💪 Músculos Tonificados | Icon bounce, text slide |
| 10–12.5s | Outro | "Comece Agora" + CTA | Scale-in text, button |

**Captions:** Present for all scenes, bouncy scale animation (0.7 → 1.05 → 1)

## 🔧 Customization

### Change Text

Edit captions and scene text directly in `index.html`:

```html
<div id="caption1" class="caption">
  <!-- Change this -->
  Colágeno: o segredo da beleza e saúde
</div>
```

### Change Colors

Update in `<style>` section:

```css
/* Change accent color */
--accent: #FF6B35; /* Orange */

/* Change background */
background: linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%);
```

### Change Timing

Update `data-start` and `data-duration` on scenes:

```html
<div id="scene1" data-start="0" data-duration="3">
  <!-- Scene duration is now 3 seconds instead of 2.5 -->
</div>
```

### Change Fonts

The composition uses system fonts (Poppins, Inter). To use custom fonts:

1. Add `.woff2` files to `fonts/` directory
2. Add `@font-face` declarations to CSS
3. Update `font-family` in styles

## 🎬 Export Variants

Generate different versions for different platforms:

```bash
# Instagram Reels (9:16, 1080×1920)
npx hyperframes render --output colageno-reels.mp4

# TikTok (9:16, 1080×1920)
npx hyperframes render --output colageno-tiktok.mp4

# YouTube Shorts (9:16, 1080×1920)
npx hyperframes render --output colageno-shorts.mp4

# All the same specs — just rename for your platform
```

## 🐛 Troubleshooting

**"Audio not playing in preview"**
→ Ensure audio file exists and path is correct. Web browsers require `crossorigin="anonymous"`

**"Text overflow in captions"**
→ Use `max-width: 90%` in CSS (already applied). Reduce font size if needed.

**"Animations not synced to audio"**
→ Verify `data-start` and `data-duration` match narration timing. Use inspection tools:
```bash
npx hyperframes inspect --at 0.3,2.8,5.2,7.7,10.2
```

**"Render is slow"**
→ Reduce resolution or framerate:
```bash
npx hyperframes render --output colageno-hook.mp4 --fps 24 --bitrate 5000k
```

## 📚 References

- [Hyperframes Documentation](https://hyperframes.dev)
- [GSAP Animation Library](https://gsap.com)
- [Portuguese TTS Services](https://github.com/heygen-com/hyperframes/blob/main/docs/references/narration.md)
- [Video Composition Guide](https://github.com/heygen-com/hyperframes/blob/main/docs/references/video-composition.md)

---

**Created with Hyperframes + HeGen**

Generated for SupliList — Premium supplement recommendations with engaging video content.
