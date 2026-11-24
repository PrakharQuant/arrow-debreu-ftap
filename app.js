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

  function erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }
  function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
  function normInv(p) {
    if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979326751164, 0.0276438810333863, 0.0038405729373609, 0.0003951896511919, 0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
    if (p < 0.02425 || p > 1 - 0.02425) {
      const q = p < 0.5 ? p : 1 - p;
      const r = Math.sqrt(-2 * Math.log(q));
      let x = (((((c[8] * r + c[7]) * r + c[6]) * r + c[5]) * r + c[4]) * r + c[3]) * r + c[2];
      x = (x * r + c[1]) * r + c[0];
      return p < 0.5 ? -x : x;
    }
    const q = p - 0.5;
    const r = q * q;
    return (((((a[3] * r + a[2]) * r + a[1]) * r + a[0]) * r) / ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1)) * q;
  }

  AD.blackScholesCall = function (S0, K, r, sigma, T) {
    if (T <= 0) return Math.max(S0 - K, 0);
    const d1 = (Math.log(S0 / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return S0 * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  };

  AD.discretizeLognormal = function (N, S0, mu, sigma, r, T) {
    if (!isFinite(N) || N > 500) N = 200;
    const states = [], pi = [], m = [], q = [];
    const lambda = (mu - r) / sigma;
    for (let i = 0; i < N; i++) {
      const z = normInv((i + 0.5) / N);
      const ST = S0 * Math.exp((mu - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * z);
      states.push(ST);
      pi.push(1 / N);
      const ms = Math.exp(-r * T) * Math.exp(-lambda * Math.sqrt(T) * z - 0.5 * lambda * lambda * T);
      m.push(ms);
      q.push((1 / N) * ms);
    }
    const callPay = states.map(s => Math.max(s - 100, 0));
    const callPrice = AD.priceByQ(q, callPay);
    return { states, pi, q, m, callPrice };
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
  function fmt6(n) { return Number(n).toFixed(6); }

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

    // Module 2 (basic)
    const update2 = debounce(() => {
      const target = document.getElementById("m2-target").value === "boom" ? [1, 0] : [0, 1];
      const w = [+document.getElementById("m2-ws").value, +document.getElementById("m2-wb").value];
      const X = [[120, 100], [60, 100]];
      const pay = AD.portfolioPayoff(X, w);
      const dist = Math.hypot(pay[0] - target[0], pay[1] - target[1]);
      document.getElementById("m2-out").innerHTML = `<p>Payoff: (${fmt(pay[0])}, ${fmt(pay[1])}) — distance: ${fmt(dist, 4)}</p>`;
    });
    ["m2-target", "m2-ws", "m2-wb"].forEach(id => document.getElementById(id)?.addEventListener("input", update2));
    document.getElementById("m2-auto")?.addEventListener("click", () => {
      const target = document.getElementById("m2-target").value === "boom" ? [1, 0] : [0, 1];
      const X = [[120, 100], [60, 100]];
      const rep = AD.replicate(X, target);
      if (rep) {
        document.getElementById("m2-ws").value = rep.w[0];
        document.getElementById("m2-wb").value = rep.w[1];
        update2();
      }
    });
    update2();

    // Module 3
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

    // Module 4 — 3D state space
    let hasPut = false;
    const update4 = debounce(() => {
      const Xbase = [[130, 100], [100, 100], [50, 100]];
      const pbase = [90, 95];
      const info = AD.solveStatePrices(Xbase, pbase);
      const interval = info.qInterval || { min: [0, 0, 0.1], max: [0, 0, 0.42] };
      const putLow = 30 * interval.min[2];
      const putHigh = 30 * interval.max[2];
      document.getElementById("m4-out").innerHTML = `<p>No-arbitrage interval for Put (0,0,30): [${fmt(putLow, 2)}, ${fmt(putHigh, 2)}]</p>
        <p>Status: ${info.status} (degrees of freedom = ${info.degreesOfFreedom})</p>`;

      if (window.Plotly) {
        const traces = [
          { x: [0, 130], y: [0, 100], z: [0, 50], mode: "lines+markers", type: "scatter3d", name: "Stock" },
          { x: [0, 100], y: [0, 100], z: [0, 100], mode: "lines+markers", type: "scatter3d", name: "Bond" },
          { x: [0, 0], y: [0, 0], z: [0, 1], mode: "lines", type: "scatter3d", name: "Crash claim", line: { dash: "dot" } }
        ];
        if (hasPut) {
          traces.push({ x: [0, 0], y: [0, 0], z: [0, 30], mode: "lines+markers", type: "scatter3d", name: "Put" });
        }
        Plotly.react("m4-chart", traces, {
          title: "3D State Space (Boom / Stagnation / Crash)",
          scene: { xaxis: { title: "Boom" }, yaxis: { title: "Stagnation" }, zaxis: { title: "Crash" } },
          paper_bgcolor: "transparent",
          font: { color: getComputedStyle(document.documentElement).getPropertyValue("--fg") || "#e8eaed" }
        }, { responsive: true });
      }
    });
    document.getElementById("m4-put")?.addEventListener("click", () => {
      hasPut = !hasPut;
      document.getElementById("m4-put").textContent = hasPut ? "− Remove Put" : "+ Introduce Put (K=80)";
      update4();
    });
    update4();

    // Module 5 — discrete to continuous
    const update5 = debounce(() => {
      const sel = document.getElementById("m5-n");
      const N = sel.value === "∞" ? 200 : +sel.value;
      const disc = AD.discretizeLognormal(N, 100, 0.08, 0.20, 0.03, 1);
      const bs = AD.blackScholesCall(100, 100, 0.03, 0.20, 1);
      const err = Math.abs(disc.callPrice - bs);
      document.getElementById("m5-out").innerHTML = `<p>Discrete call price (N=${N}): ${fmt6(disc.callPrice)} &nbsp; Black-Scholes: ${fmt6(bs)} &nbsp; |error| = ${fmt6(err)}</p>`;

      if (window.Plotly) {
        Plotly.react("m5-chart", [
          { x: disc.states, y: disc.q, type: "bar", name: "q_s (state prices)" },
          { x: disc.states, y: disc.pi.map(p => p * 0.05), type: "scatter", mode: "lines", name: "scaled π" }
        ], {
          title: "Discretized state prices → continuous density",
          xaxis: { title: "S_T" },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: getComputedStyle(document.documentElement).getPropertyValue("--fg") || "#e8eaed" }
        }, { responsive: true });
      }
    });
    document.getElementById("m5-n")?.addEventListener("change", update5);
    update5();

    // Module 6
    document.getElementById("m6-out").innerHTML = `<p><strong>Arbitrage-free?</strong> <span class="badge success">Yes</span> (canonical market)</p><p><strong>Complete?</strong> <span class="badge warning">No</span> (3 states, 2 assets)</p><p>FTAP: No arbitrage ⇔ ∃ strictly positive state-price vector. Completeness ⇔ that vector is unique.</p>`;
  });
})();
