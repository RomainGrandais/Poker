# Texas Hold'em Equity (Monte Carlo)

A minimal React + TypeScript web app that estimates Texas Hold'em equity against random opponents using Monte Carlo simulation.

## Features

- Hero + board card inputs with validation
- Player count (2-9) and simulation count selector
- Fast Monte Carlo simulation in-browser
- Clean, responsive UI with large results

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test
```

## Deployment

This project is ready for static hosting on Vercel/Netlify.

- Build command: `npm run build`
- Output directory: `dist`

## Usage Notes

- Card formats accepted: `As`, `AD`, `10h`, `Th` (case-insensitive, commas/spaces ok).
- Equity = Win% + Tie% / 2.
