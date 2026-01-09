import { Hand } from "pokersolver";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["s", "h", "d", "c"];

const normalizeToken = (token: string) => {
  if (!token) {
    return null;
  }
  const cleaned = token.trim().replace(/10/i, "T");
  if (cleaned.length !== 2) {
    return null;
  }
  const rank = cleaned[0]?.toUpperCase();
  const suit = cleaned[1]?.toLowerCase();
  if (!rank || !suit) {
    return null;
  }
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
    return null;
  }
  return `${rank}${suit}`;
};

export const parseCards = (input: string): string[] => {
  if (!input.trim()) {
    return [];
  }
  const tokens = input
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const cards: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (!normalized) {
      throw new Error(`Invalid card: ${token}`);
    }
    cards.push(normalized);
  }
  return cards;
};

export const validateNoDuplicates = (cards: string[]) => {
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card)) {
      throw new Error(`Duplicate card detected: ${card}`);
    }
    seen.add(card);
  }
};

const buildDeck = (excluded: string[]) => {
  const excludedSet = new Set(excluded);
  const deck: string[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const card = `${rank}${suit}`;
      if (!excludedSet.has(card)) {
        deck.push(card);
      }
    }
  }
  return deck;
};

const drawRandom = (deck: string[]) => {
  const index = Math.floor(Math.random() * deck.length);
  return deck.splice(index, 1)[0];
};

export const simulateEquity = (
  hero: string[],
  board: string[],
  players: number,
  sims: number
) => {
  let wins = 0;
  let ties = 0;
  let losses = 0;

  for (let i = 0; i < sims; i += 1) {
    const deck = buildDeck([...hero, ...board]);
    const fullBoard = [...board];
    while (fullBoard.length < 5) {
      const card = drawRandom(deck);
      if (card) {
        fullBoard.push(card);
      }
    }

    const heroHand = Hand.solve([...hero, ...fullBoard]);
    const opponentHands = Array.from({ length: players - 1 }, () => {
      const card1 = drawRandom(deck);
      const card2 = drawRandom(deck);
      return Hand.solve([card1, card2, ...fullBoard]);
    });

    const winners = Hand.winners([heroHand, ...opponentHands]);
    const heroWon = winners.includes(heroHand);

    if (heroWon && winners.length === 1) {
      wins += 1;
    } else if (heroWon) {
      ties += 1;
    } else {
      losses += 1;
    }
  }

  const win = wins / sims;
  const tie = ties / sims;
  const lose = losses / sims;
  const equity = win + tie / 2;

  return {
    equity,
    win,
    tie,
    lose
  };
};
