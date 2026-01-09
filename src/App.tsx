import { useMemo, useState } from "react";
import { parseCards, simulateEquity, validateNoDuplicates } from "./utils/poker";

const simulationOptions = [5000, 10000, 20000, 50000, 100000];

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const App = () => {
  const [heroInput, setHeroInput] = useState("As Kd");
  const [boardInput, setBoardInput] = useState("");
  const [players, setPlayers] = useState(2);
  const [sims, setSims] = useState(20000);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
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
              onChange={(event) => setHeroInput(event.target.value)}
              placeholder="As Kd"
            />
          </label>

          <label>
            Board cards
            <input
              value={boardInput}
              onChange={(event) => setBoardInput(event.target.value)}
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
