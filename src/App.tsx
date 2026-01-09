import { useEffect, useMemo, useRef, useState } from "react";
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
  const [position, setPosition] = useState("BTN");
  const [stackBb, setStackBb] = useState(25);
  const [actionState, setActionState] = useState("Unopened");
  const [sims, setSims] = useState(20000);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<"hero" | "board">("hero");
  const [showPicker, setShowPicker] = useState(false);
  const [result, setResult] = useState<{
    equity: number;
    win: number;
    tie: number;
    lose: number;
    elapsedMs: number;
  } | null>(null);

  const availablePlayers = useMemo(() => [2, 3, 4, 5, 6, 7, 8, 9], []);
  const positions = useMemo(() => ["UTG", "HJ", "CO", "BTN", "SB", "BB"], []);
  const actionStates = useMemo(
    () => ["Unopened", "Facing raise", "Facing shove", "Postflop"],
    []
  );
  const autoRunTimer = useRef<number | null>(null);

  const runSimulation = async () => {
    if (isRunning) {
      return;
    }
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

  const handleCalculate = async () => {
    await runSimulation();
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

  const focusTarget = (target: "hero" | "board") => {
    setActiveTarget(target);
    setShowPicker(true);
  };

  useEffect(() => {
    if (autoRunTimer.current) {
      window.clearTimeout(autoRunTimer.current);
    }
    autoRunTimer.current = window.setTimeout(() => {
      void runSimulation();
    }, 300);

    return () => {
      if (autoRunTimer.current) {
        window.clearTimeout(autoRunTimer.current);
      }
    };
  }, [heroInput, boardInput, players, sims, position, stackBb, actionState]);

  const recommendation = useMemo(() => {
    if (!result) {
      return null;
    }

    const isHeadsUp = players === 2;
    const isMultiway = players > 2;
    const stackTier =
      stackBb <= 12 ? "short" : stackBb <= 28 ? "mid" : "deep";
    const positionWeight =
      position === "BTN" || position === "CO"
        ? 0.04
        : position === "HJ"
          ? 0.02
          : position === "SB"
            ? -0.01
            : position === "BB"
              ? -0.02
              : -0.03;
    const multiwayPenalty = isMultiway ? -0.05 : 0;
    const stackPressure = stackTier === "short" ? -0.05 : stackTier === "mid" ? 0 : 0.03;
    const adjustedEquity = Math.max(
      0,
      Math.min(1, result.equity + positionWeight + multiwayPenalty + stackPressure)
    );

    const equityLabel = adjustedEquity >= 0.62 ? "high" : adjustedEquity >= 0.48 ? "medium" : "low";

    let primary = "Fold";
    let secondary = "Check";
    let tone = "🔴 À éviter";
    let reason = "Équité insuffisante dans le contexte actuel.";

    if (actionState === "Postflop") {
      if (equityLabel === "high") {
        primary = stackTier === "short" ? "Push" : "Raise";
        secondary = "Call";
        tone = "🟢 Action optimale";
        reason = "Vous avez une équité forte, surtout avec l’avantage de position.";
      } else if (equityLabel === "medium") {
        primary = "Call";
        secondary = "Check";
        tone = "🟠 Situationnelle";
        reason = "Équité correcte, privilégiez une ligne qui réalise l’équité.";
      } else {
        primary = "Check";
        secondary = "Fold";
        tone = "🔴 À éviter";
        reason = "Équité faible et réalisation difficile sur plusieurs streets.";
      }
    } else if (actionState === "Facing shove") {
      if (adjustedEquity >= 0.55 || (stackTier === "short" && adjustedEquity >= 0.5)) {
        primary = "Call";
        secondary = "Push";
        tone = "🟢 Action optimale";
        reason = "Votre équité justifie le call face à un shove.";
      } else {
        primary = "Fold";
        secondary = "Call";
        tone = "🔴 À éviter";
        reason = "L’équité ne couvre pas suffisamment la pression tournoi.";
      }
    } else if (actionState === "Facing raise") {
      if (equityLabel === "high") {
        primary = stackTier === "short" ? "Push" : "Raise";
        secondary = "Call";
        tone = "🟢 Action optimale";
        reason = "Main dominante, profitez de la fold equity.";
      } else if (equityLabel === "medium") {
        primary = isHeadsUp ? "Call" : "Fold";
        secondary = isHeadsUp ? "Raise" : "Call";
        tone = "🟠 Situationnelle";
        reason = isHeadsUp
          ? "Équité jouable en heads-up, évitez d’élargir le pot inutilement."
          : "En multiway, l’équité se réalise moins bien.";
      } else {
        primary = "Fold";
        secondary = "Call";
        tone = "🔴 À éviter";
        reason = "Trop faible pour payer une relance.";
      }
    } else {
      if (equityLabel === "high") {
        primary = stackTier === "short" ? "Push" : "Raise";
        secondary = "Call";
        tone = "🟢 Action optimale";
        reason = "Bonne équité et initiative profitable.";
      } else if (equityLabel === "medium") {
        primary = position === "BB" ? "Check" : "Raise";
        secondary = "Call";
        tone = "🟠 Situationnelle";
        reason = "Équité jouable, adaptez selon la table.";
      } else {
        primary = position === "BB" ? "Check" : "Fold";
        secondary = "Call";
        tone = "🔴 À éviter";
        reason = "Pas assez d’équité pour ouvrir ou défendre large.";
      }
    }

    return {
      primary,
      secondary: secondary === primary ? null : secondary,
      tone,
      reason,
      adjustedEquity
    };
  }, [actionState, players, position, result, stackBb]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Texas Hold&apos;em Equity</h1>
        <p>Monte Carlo odds vs random opponents.</p>
      </header>

      <main className="card">
        <section className="form">
          <label className="field">
            Hero hand
            <input
              value={heroInput}
              onChange={(event) => handleHeroInput(event.target.value)}
              onFocus={() => focusTarget("hero")}
              placeholder="As Kd"
            />
            {showPicker && activeTarget === "hero" ? (
              <div className="picker-inline" onMouseDown={(event) => event.preventDefault()}>
                <div className="picker-inline__header">
                  <span>Quick pick</span>
                  <div className="picker-inline__actions">
                    <span className="muted">{heroCards.length}/2</span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => handleClear("hero")}
                    >
                      Clear
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
              </div>
            ) : null}
          </label>

          <label className="field">
            Board cards
            <input
              value={boardInput}
              onChange={(event) => handleBoardInput(event.target.value)}
              onFocus={() => focusTarget("board")}
              placeholder="7h 2c Td"
            />
            {showPicker && activeTarget === "board" ? (
              <div className="picker-inline" onMouseDown={(event) => event.preventDefault()}>
                <div className="picker-inline__header">
                  <span>Quick pick</span>
                  <div className="picker-inline__actions">
                    <span className="muted">{boardCards.length}/5</span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => handleClear("board")}
                    >
                      Clear
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
              </div>
            ) : null}
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

          <div className="grid-row">
            <label>
              Position
              <select value={position} onChange={(event) => setPosition(event.target.value)}>
                {positions.map((seat) => (
                  <option key={seat} value={seat}>
                    {seat}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stack (BB)
              <input
                type="number"
                min={1}
                value={stackBb}
                onChange={(event) => setStackBb(Number(event.target.value))}
              />
            </label>
          </div>

          <label>
            Action
            <select value={actionState} onChange={(event) => setActionState(event.target.value)}>
              {actionStates.map((state) => (
                <option key={state} value={state}>
                  {state}
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

          <div className="recommendation">
            <h3>Recommendation</h3>
            {recommendation ? (
              <div className="recommendation__card">
                <div className="recommendation__tone">{recommendation.tone}</div>
                <div className="recommendation__actions">
                  <span className="label">Action optimale</span>
                  <span className="value">{recommendation.primary}</span>
                </div>
                {recommendation.secondary ? (
                  <div className="recommendation__actions">
                    <span className="label">Action secondaire</span>
                    <span className="value">{recommendation.secondary}</span>
                  </div>
                ) : null}
                <p className="meta">{recommendation.reason}</p>
              </div>
            ) : (
              <p className="muted">Run a simulation to get a recommendation.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Accepts formats like As, AD, 10h, or Th.</span>
      </footer>
    </div>
  );
};

export default App;
