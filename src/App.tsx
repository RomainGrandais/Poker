import { useMemo, useState } from "react";
import { parseCards, simulateEquity, validateNoDuplicates } from "./utils/poker";

const simulationOptions = [5000, 10000, 20000, 50000, 100000];
const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const suits = [
  { id: "s", label: "♠", color: "black" },
  { id: "h", label: "♥", color: "red" },
  { id: "d", label: "♦", color: "red" },
  { id: "c", label: "♣", color: "black" }
];

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
const formatCard = (card: string) => {
  const rank = card[0]?.toUpperCase() ?? "";
  const suit = card[1]?.toLowerCase() ?? "";
  const symbol =
    suit === "s"
      ? "♠"
      : suit === "h"
        ? "♥"
        : suit === "d"
          ? "♦"
          : suit === "c"
            ? "♣"
            : "";
  return `${rank}${symbol}`;
};

const App = () => {
  const [heroInput, setHeroInput] = useState("As Kd");
  const [boardInput, setBoardInput] = useState("");
  const [heroCards, setHeroCards] = useState(() => parseCards("As Kd"));
  const [boardCards, setBoardCards] = useState<string[]>([]);
  const [players, setPlayers] = useState(2);
  const [sims, setSims] = useState(20000);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<"hero" | "board">("hero");
  const [result, setResult] = useState<{
    equity: number;
    win: number;
    tie: number;
    lose: number;
    elapsedMs: number;
  } | null>(null);

  const availablePlayers = useMemo(() => [2, 3, 4, 5, 6, 7, 8, 9], []);

  const handleCalculate = async () => {
    setError(null);
    setResult(null);

    let heroCards: string[] = [];
    let boardCards: string[] = [];

    try {
      heroCards = parseCards(heroInput);
      boardCards = parseCards(boardInput);
      if (heroCards.length !== 2) {
        throw new Error("Hero hand must contain exactly 2 cards.");
      }
      if (boardCards.length > 5) {
        throw new Error("Board can include at most 5 cards.");
      }
      validateNoDuplicates([...heroCards, ...boardCards]);

      const cardsNeeded = (5 - boardCards.length) + (players - 1) * 2;
      const remainingCards = 52 - heroCards.length - boardCards.length;
      if (remainingCards < cardsNeeded) {
        throw new Error("Not enough cards remaining for the selected players and board.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid input.";
      setError(message);
      return;
    }

    setIsRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const start = performance.now();

    try {
      const outcome = simulateEquity(heroCards, boardCards, players, sims);
      const elapsedMs = performance.now() - start;
      setResult({ ...outcome, elapsedMs });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Simulation failed.";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  const syncHeroInput = (cards: string[]) => {
    setHeroCards(cards);
    setHeroInput(cards.join(" "));
  };

  const syncBoardInput = (cards: string[]) => {
    setBoardCards(cards);
    setBoardInput(cards.join(" "));
  };

  const handleHeroInput = (value: string) => {
    setHeroInput(value);
    try {
      syncHeroInput(parseCards(value));
    } catch {
      // keep last valid selection in visual picker
    }
  };

  const handleBoardInput = (value: string) => {
    setBoardInput(value);
    try {
      syncBoardInput(parseCards(value));
    } catch {
      // keep last valid selection in visual picker
    }
  };

  const handleAddCard = (suit: string) => {
    if (!selectedRank) {
      return;
    }
    const card = `${selectedRank}${suit}`;
    const current = activeTarget === "hero" ? heroCards : boardCards;
    const other = activeTarget === "hero" ? boardCards : heroCards;
    if (current.includes(card) || other.includes(card)) {
      setError(`Duplicate card detected: ${card}`);
      return;
    }
    if (activeTarget === "hero" && current.length >= 2) {
      setError("Hero hand must contain exactly 2 cards.");
      return;
    }
    if (activeTarget === "board" && current.length >= 5) {
      setError("Board can include at most 5 cards.");
      return;
    }
    setError(null);
    const next = [...current, card];
    if (activeTarget === "hero") {
      syncHeroInput(next);
    } else {
      syncBoardInput(next);
    }
  };

  const handleRemoveCard = (target: "hero" | "board", card: string) => {
    const next = (target === "hero" ? heroCards : boardCards).filter(
      (item) => item !== card
    );
    if (target === "hero") {
      syncHeroInput(next);
    } else {
      syncBoardInput(next);
    }
  };

  const handleClear = (target: "hero" | "board") => {
    if (target === "hero") {
      syncHeroInput([]);
    } else {
      syncBoardInput([]);
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Texas Hold&apos;em Equity</h1>
        <p>Monte Carlo odds vs random opponents.</p>
      </header>

      <main className="card">
        <section className="form">
          <label>
            Hero hand
            <input
              value={heroInput}
              onChange={(event) => handleHeroInput(event.target.value)}
              placeholder="As Kd"
            />
          </label>

          <label>
            Board cards
            <input
              value={boardInput}
              onChange={(event) => handleBoardInput(event.target.value)}
              placeholder="7h 2c Td"
            />
          </label>

          <label>
            Players
            <select
              value={players}
              onChange={(event) => setPlayers(Number(event.target.value))}
            >
              {availablePlayers.map((count) => (
                <option key={count} value={count}>
                  {count} players
                </option>
              ))}
            </select>
          </label>

          <label>
            Simulations
            <select value={sims} onChange={(event) => setSims(Number(event.target.value))}>
              {simulationOptions.map((count) => (
                <option key={count} value={count}>
                  {count.toLocaleString()}
                </option>
              ))}
            </select>
          </label>

          {error ? <div className="error">{error}</div> : null}

          <div className="card-picker">
            <div className="card-picker__header">
              <span>Quick card picker</span>
              <div className="card-picker__targets">
                <button
                  type="button"
                  className={activeTarget === "hero" ? "pill pill--active" : "pill"}
                  onClick={() => setActiveTarget("hero")}
                >
                  Hero ({heroCards.length}/2)
                </button>
                <button
                  type="button"
                  className={activeTarget === "board" ? "pill pill--active" : "pill"}
                  onClick={() => setActiveTarget("board")}
                >
                  Board ({boardCards.length}/5)
                </button>
              </div>
            </div>

            <div className="card-picker__row">
              {ranks.map((rank) => (
                <button
                  key={rank}
                  type="button"
                  className={selectedRank === rank ? "rank rank--active" : "rank"}
                  onClick={() => setSelectedRank(rank)}
                >
                  {rank}
                </button>
              ))}
            </div>

            <div className="card-picker__row">
              {suits.map((suit) => (
                <button
                  key={suit.id}
                  type="button"
                  className={`suit suit--${suit.color}`}
                  onClick={() => handleAddCard(suit.id)}
                  disabled={!selectedRank}
                >
                  {suit.label}
                </button>
              ))}
            </div>

            <div className="card-picker__selection">
              <div className="selection-group">
                <span>Hero</span>
                <div className="selection-cards">
                  {heroCards.length === 0 ? (
                    <span className="muted">No cards yet</span>
                  ) : (
                    heroCards.map((card) => (
                      <button
                        key={card}
                        type="button"
                        className="card-chip"
                        onClick={() => handleRemoveCard("hero", card)}
                      >
                        {formatCard(card)}
                      </button>
                    ))
                  )}
                </div>
                <button type="button" className="link" onClick={() => handleClear("hero")}>
                  Clear hero
                </button>
              </div>
              <div className="selection-group">
                <span>Board</span>
                <div className="selection-cards">
                  {boardCards.length === 0 ? (
                    <span className="muted">No cards yet</span>
                  ) : (
                    boardCards.map((card) => (
                      <button
                        key={card}
                        type="button"
                        className="card-chip"
                        onClick={() => handleRemoveCard("board", card)}
                      >
                        {formatCard(card)}
                      </button>
                    ))
                  )}
                </div>
                <button type="button" className="link" onClick={() => handleClear("board")}>
                  Clear board
                </button>
              </div>
            </div>
          </div>

          <button className="primary" onClick={handleCalculate} disabled={isRunning}>
            {isRunning ? (
              <span className="loader" aria-label="Running simulation" />
            ) : (
              "Calculate"
            )}
          </button>
        </section>

        <section className="results">
          <h2>Results</h2>
          {result ? (
            <div className="results__grid">
              <div className="result">
                <span className="label">Equity</span>
                <span className="value">{formatPercent(result.equity)}</span>
              </div>
              <div className="result">
                <span className="label">Win</span>
                <span className="value">{formatPercent(result.win)}</span>
              </div>
              <div className="result">
                <span className="label">Tie</span>
                <span className="value">{formatPercent(result.tie)}</span>
              </div>
              <div className="result">
                <span className="label">Lose</span>
                <span className="value">{formatPercent(result.lose)}</span>
              </div>
              <p className="meta">
                {sims.toLocaleString()} simulations · {Math.round(result.elapsedMs)} ms
              </p>
            </div>
          ) : (
            <p className="muted">Enter cards and run the simulation.</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>Accepts formats like As, AD, 10h, or Th.</span>
      </footer>
    </div>
  );
};

export default App;
