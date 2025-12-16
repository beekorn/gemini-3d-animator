# Gemini 3D Animator

## Project Overview
Gemini 3D Animator is a browser-based application that leverages Google's Gemini AI to generate, texture, and animate 3D models. It allows users to create 3D characters from text prompts, retexture existing models using AI vision capabilities, and apply procedural animations or retarget external animation clips.

## User Manual

### 1. Setup
- Open the application in your browser.
- Click the **Menu** button (Hamburger icon) in the top-left corner.
- Select **Settings**.
- Enter your **Gemini API Key**. This is required for all AI features. The key is stored locally in your browser.
- (Optional) Select a color theme for the application.

### 2. Generating a Character
- Navigate to the **Gen AI** tab in the left panel.
- Under "Generate New Model", enter a description (e.g., "A cyberpunk knight").
- Click **Generate Character**.
- The AI will generate a concept image and automatically convert it into a rigged 3D GLB model.

### 3. Retexturing Models
- Load a model (either generated or selected from the "Model Library").
- In the **Gen AI** tab, scroll to "Retexture Model".
- Enter a prompt describing the new look (e.g., "Made of gold and rust").
- (Optional) Upload a style reference image.
- Click **Generate Texture**.

### 4. Animation
- Switch to the **Animate** tab.
- **Procedural Motion**: Select a type (Spin, Float, Pulse, etc.) or describe a motion in the text box and click "Generate Config" to let Gemini decide the parameters.
- **External Clips**: Upload `.fbx` or `.glb` animation files to retarget them onto your current character.

### 5. Exporting
- Click **Export GLB** at the bottom of the panel to download your rigged and textured model.

## Feature Specification
- **AI Generation**: Uses `gemini-2.5-flash` via the new `@google/genai` SDK for high-speed image generation and vision analysis.
- **3D Conversion**: Implements a custom image-to-mesh algorithm using Three.js, creating a skinned mesh with a standard humanoid skeleton.
- **Auto-Rigging**: The generated mesh includes a functional skeleton compatible with Mixamo-style animations.
- **Retargeting**: Runtime animation retargeting system maps bone names from uploaded clips to the internal skeleton structure.

## Technical Architecture
- **Frontend**: React 18 with TypeScript.
- **3D Engine**: Three.js via `@react-three/fiber`.
- **State Management**: React `useState` and `useRef` for local state; `localStorage` for API key persistence.
- **Build System**: Runs directly in-browser via Babel Standalone and Import Maps (no Node.js required for execution).