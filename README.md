# Arrow-Debreu Securities & the Fundamental Theorem of Asset Pricing

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)

An interactive, self-contained teaching site for graduate students in economics and finance.
No build step. Works when opened as `file://` or deployed on GitHub Pages.

## The five-step learning loop

Every module follows the same pedagogical pattern:

1. **Intuition** — plain-English story, no Greek letters.
2. **Predict** — one-click “what do you expect?” prompt before the visual is revealed.
3. **Interactive visual** — manipulable Plotly charts that update in real time.
4. **Concrete numbers** — live table showing the exact arithmetic with the user’s current inputs.
5. **“But Why?”** accordions at friction points, each answered in ≤150 words with a worked number.

Modules end with a short self-check (instant feedback, no persistence).

## Modules

| # | Title | Learning objective |
|---|-------|--------------------|
| 1 | Asset space vs. state space | See portfolios as vectors in payoff space; recognise arbitrage geometrically |
| 2 | Synthetic replication sandbox | Replicate Arrow securities by hand and by matrix inversion; recover state prices as costs |
| 3 | The disappearing-probability paradox | Understand why real-world probabilities drop out of pricing once state prices are fixed |
| 4 | Complete vs. incomplete markets | Visualise the “third-state wall”; see non-unique state prices collapse when a put is added |
| 5 | From discrete states to continuous curves | Watch equal-probability discretisations converge to the Black-Scholes state-price density |
| 6 | Fundamental Theorem of Asset Pricing | Connect no-arbitrage ⇔ positive state prices and completeness ⇔ uniqueness |

## Prerequisites

- Basic linear algebra (2×2 and 3×3 systems)
- Elementary probability
- Familiarity with present-value ideas

## Notation

| Symbol | Meaning |
|--------|---------|
| \( X \) | \( S \times A \) payoff matrix (rows = states) |
| \( p \) | vector of asset prices |
| \( q_s \) | state price of state \( s \) |
| \( m_s = q_s / \pi_s \) | stochastic discount factor |
| \( \pi^*_s = R_f \cdot q_s \) | risk-neutral probability |
| \( R_f = 1 / \sum q_s \) | risk-free return |

## Calibration table (defaults)

**2-state market**

| Asset | Boom | Recession | Price |
|-------|------|-----------|-------|
| Stock | 120 | 60 | 90 |
| Bond | 100 | 100 | 95 |

\( q = (0.55, 0.40) \), \( R_f = 100/95 \), call (K=100) price = 11.00.

**3-state market**

Stock (130, 100, 50) @ 90, Bond (100, 100, 100) @ 95.
Put (K=80) payoff (0, 0, 30) has no-arbitrage interval (3, 12.5625).

## Deployment (GitHub Pages)

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `/` (root)
4. Save

The site will be available at `https://<user>.github.io/<repo>/`.

## Local run

Just open `index.html` in any modern browser. No server required.

## Further reading

- Arrow & Debreu (1954), “Existence of an Equilibrium for a Competitive Economy”
- Duffie, *Dynamic Asset Pricing Theory*
- Cochrane, *Asset Pricing*
- Harrison & Kreps (1979), “Martingales and Arbitrage in Multiperiod Securities Markets”
- Breeden & Litzenberger (1978), “Prices of State-Contingent Claims Implicit in Option Prices”

---

Created by [Prakhar Gupta](mailto:bestofprakhar@gmail.com)
[LinkedIn](https://www.linkedin.com/in/prakhar-gupta-5b7250372) · [X / Twitter](https://x.com/prakharquant)

MIT License
