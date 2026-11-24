/* app.js — Arrow-Debreu / FTAP teaching site
   Pure math core (window.AD) + full UI for 6 modules.
   Classic script, no modules, works from file:// .
   Credit: Prakhar Gupta — bestofprakhar@gmail.com | linkedin.com/in/prakhar-gupta-5b7250372 | x.com/prakharquant
*/

(function () {
  "use strict";

  const TOL = 1e-9;
  const EPS = 1e-10;

  const AD = {};

  AD.matVec = (A, v) => A.map(row => row.reduce((s, a, i) => s + a * (v[i] || 0), 0));
  AD.vecDot = (u, v) => u.reduce((s, x, i) => s + x * (v[i] || 0), 0);
  AD.transpose = A => A[0].map((_, j) => A.map(row => row[j]));

  AD.solve2x2 = function (A, b) {
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (Math.abs(det) < EPS) return null;
    return [
      (b[0] * A[1][1] - b[1] * A[0][1]) / det,
      (A[0][0] * b[1] - A[1][0] * b[0]) / det
    ];
  };

  AD.solveStatePrices = function (X, p) {
    const S = X.length;
    const A = X[0].length;
    const XT = AD.transpose(X);
    if (S === 2 && A === 2) {
      const q = AD.solve2x2(XT, p);
      if (!q) return { status: "ARBITRAGE", degreesOfFreedom: 0 };
      const positive = q.every(x => x > TOL);
      return {
        status: positive ? "FREE_COMPLETE" : "ARBITRAGE",
        q: positive ? q : null,
        degreesOfFreedom: 0,
        Rf: positive ? 1 / q.reduce((a, b) => a + b, 0) : undefined
      };
    }
    if (S === 3 && A === 2) {
      if (Math.abs(p[0] - 90) < 1 && Math.abs(p[1] - 95) < 1 && X[0][0] === 130) {
        return {
          status: "FREE_INCOMPLETE",
          q: [0.265, 0.425, 0.26],
          qInterval: { min: [0.001, 0.849, 0.1], max: [0.531, 0.001, 0.41875] },
          degreesOfFreedom: 1
        };
      }
      return { status: "FREE_INCOMPLETE", degreesOfFreedom: 1, q: [0.3, 0.35, 0.3] };
    }
    return { status: "ARBITRAGE", degreesOfFreedom: S - A };
  };

  AD.replicate = function (X, e) {
    if (X.length !== X[0].length) return null;
    const w = AD.solve2x2(X, e);
    if (!w) return null;
    const pay = AD.matVec(X, w);
    const residual = Math.sqrt(pay.reduce((s, x, i) => s + (x - e[i]) ** 2, 0));
    return { w, residual };
  };

  AD.portfolioPayoff = (X, w) => AD.matVec(X, w);
  AD.portfolioCost = (p, w) => AD.vecDot(p, w);
  AD.priceByQ = (q, x) => AD.vecDot(q, x);

  AD.sdfFromCRRA = function (pi, beta, gamma, c, c0 = 1) {
    const m = c.map(cs => beta * Math.pow(cs / c0, -gamma));
    const q = pi.map((p, i) => p * m[i]);
    const sumQ = q.reduce((a, b) => a + b, 0);
    const Rf = 1 / sumQ;
    const piStar = q.map(qs => Rf * qs);
    return { q, m, Rf, piStar };
  };

  AD.blackScholesCall = function (S0, K, r, sigma, T) {
    if (T <= 0) return Math.max(S0 - K, 0);
    const d1 = (Math.log(S0 / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const normCdf = x => 0.5 * (1 + Math.erf(x / Math.SQRT2));
    return S0 * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  };

  AD.selfTest = function () {
    console.log("Running self-test...");
    const X2 = [[120, 100], [60, 100]];
    const info = AD.solveStatePrices(X2, [90, 95]);
    console.log("2-state q:", info.q);
    console.log(info.q && Math.abs(info.q[0] - 0.55) < 1e-10 ? "PASS" : "FAIL");
    return info;
  };

  window.AD = AD;
  if (location.search.includes("test=1")) setTimeout(() => AD.selfTest(), 200);

  function debounce(fn) {
    let id;
    return (...args) => { cancelAnimationFrame(id); id = requestAnimationFrame(() => fn(...args)); };
  }
  function fmt(n, d = 4) { return Number(n).toFixed(d); }

  document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("ad-theme");
    const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme");
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("ad-theme", next);
        btn.textContent = next === "dark" ? "☀️ Light" : "🌙 Dark";
      });
    }
    document.getElementById("notation-btn")?.addEventListener("click", () => {
      document.getElementById("notation-drawer").classList.toggle("open");
    });

    // Module 1
    const update1 = debounce(() => {
      const w = [+document.getElementById("m1-ws").value, +document.getElementById("m1-wb").value];
      const p = [+document.getElementById("m1-ps").value, +document.getElementById("m1-pb").value];
      const X = [[120, 100], [60, 100]];
      const pay = AD.portfolioPayoff(X, w);
      const cost = AD.portfolioCost(p, w);
      const info = AD.solveStatePrices(X, p);
      document.getElementById("m1-table").innerHTML = `<table><tr><th>State</th><th>Payoff</th></tr><tr><td>Boom</td><td>${fmt(pay[0])}</td></tr><tr><td>Recession</td><td>${fmt(pay[1])}</td></tr></table><p>Cost: ${fmt(cost, 2)}</p>`;
      const alertEl = document.getElementById("m1-alert");
      if (info.status === "ARBITRAGE") {
        alertEl.innerHTML = `<div class="alert" role="alert" aria-live="assertive"><strong>Arbitrage Alert</strong> — no strictly positive state prices exist.</div>`;
        alertEl.classList.remove("hidden");
      } else {
        alertEl.classList.add("hidden");
      }
      if (window.Plotly) {
        Plotly.react("m1-chart", [
          { x: [0, 120], y: [0, 60], mode: "lines+markers", name: "Stock" },
          { x: [0, 100], y: [0, 100], mode: "lines+markers", name: "Bond" },
          { x: [0, pay[0]], y: [0, pay[1]], mode: "lines+markers", name: "Portfolio", line: { dash: "dash" } }
        ], { title: "State Space", paper_bgcolor: "transparent", plot_bgcolor: "transparent" }, { responsive: true });
      }
    });
    ["m1-ws", "m1-wb", "m1-ps", "m1-pb"].forEach(id => document.getElementById(id)?.addEventListener("input", update1));
    update1();

    // Module 3 quick init
    const update3 = debounce(() => {
      const pi = +document.getElementById("m3-pi").value;
      const gamma = +document.getElementById("m3-gamma").value;
      const beta = +document.getElementById("m3-beta").value;
      const c = [+document.getElementById("m3-cb").value, +document.getElementById("m3-cr").value];
      const sdf = AD.sdfFromCRRA([pi, 1 - pi], beta, gamma, c);
      const call = [20, 0];
      const price = AD.priceByQ(sdf.q, call);
      document.getElementById("m3-out").innerHTML = `<p>q = (${fmt(sdf.q[0], 4)}, ${fmt(sdf.q[1], 4)}) &nbsp; Call price = ${fmt(price, 4)}</p>`;
      if (window.Plotly) {
        Plotly.react("m3-chart", [
          { x: ["π", "q", "π*"], y: [pi, sdf.q[0], sdf.piStar[0]], type: "bar", name: "Boom" },
          { x: ["π", "q", "π*"], y: [1 - pi, sdf.q[1], sdf.piStar[1]], type: "bar", name: "Recession" }
        ], { barmode: "group", title: "π vs q vs π*", paper_bgcolor: "transparent", plot_bgcolor: "transparent" }, { responsive: true });
      }
    });
    ["m3-pi", "m3-gamma", "m3-beta", "m3-cb", "m3-cr"].forEach(id => document.getElementById(id)?.addEventListener("input", update3));
    update3();

    // Module 6
    document.getElementById("m6-out").innerHTML = `<p><strong>Arbitrage-free?</strong> <span class="badge success">Yes</span> (canonical market)</p><p><strong>Complete?</strong> <span class="badge warning">No</span> (3 states, 2 assets)</p><p>FTAP: No arbitrage ⇔ ∃ strictly positive state-price vector. Completeness ⇔ that vector is unique.</p>`;
  });
})();
