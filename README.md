# OneHealth

A React Native (Expo) app for tracking meals, workouts, and daily health metrics, with an AI coach ("Eugene") for food logging and chat-based guidance.

## Screenshots

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/home.png" width="250" alt="Home screen with today's intake and daily health tips"><br><sub>Home</sub></td>
    <td align="center"><img src="assets/screenshots/workouts.png" width="250" alt="Workouts screen listing exercises by muscle group"><br><sub>Workouts</sub></td>
    <td align="center"><img src="assets/screenshots/meal-log.jpg" width="250" alt="Confirm meal screen with a photographed plate and AI-estimated calories and macros"><br><sub>Meal logging</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/screenshots/goals.png" width="250" alt="Goals screen with streaks and active goals"><br><sub>Goals</sub></td>
    <td align="center"><img src="assets/screenshots/chat.png" width="250" alt="Eugene AI coach chat screen"><br><sub>Eugene (AI coach)</sub></td>
    <td align="center"><img src="assets/screenshots/onboarding.png" width="250" alt="Onboarding screen collecting basic profile details"><br><sub>Onboarding</sub></td>
  </tr>
</table>

Captured on an iPhone 17 Pro simulator (iOS), showing the app's native "Liquid Glass" translucent cards and adaptive light/dark teal accent.

## Features

- Meal logging with AI-assisted food analysis from photos or text descriptions
- Workout tracking and exercise browsing by muscle group
- Daily step tracking and progress overview
- Goal setting and recommendations
- Chat-based AI coach for nutrition and fitness questions

## Tech stack

- [Expo](https://expo.dev) / React Native
- React Navigation
- A small Node.js API server (`server/`) that proxies requests to OpenAI for meal and chat analysis

## Getting started

```bash
npm install
npm start
```

This runs the local API server and the Expo dev server together. The server reads an `OPENAI_API_KEY` environment variable for AI-powered features.

Other scripts:

```bash
npm run ios      # start with iOS target
npm run android  # start with Android target
npm run web      # start with web target
```

## Project structure

| Path | Description |
| --- | --- |
| `App.js` | Entry point and navigation setup |
| `src/screens` | Top-level app screens |
| `src/components` | Shared UI components |
| `src/eugene` | AI coach chat experience |
| `src/foodlog` | Meal photo capture and logging flow |
| `src/utils` | Nutrition, recommendation, and profile helpers |
| `server/` | Local API server proxying OpenAI requests |
