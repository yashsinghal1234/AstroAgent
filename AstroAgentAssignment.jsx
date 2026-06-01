import React, { useState, useEffect, useRef } from "react";

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Aradhana â Full-Stack Builder Internship Assignment
// "AstroAgent": an agentic AI astrologer built with LangGraph + a React frontend.
// Single-file React component. Tailwind utility classes only.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const FONT_IMPORT_ID = "astroagent-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_IMPORT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_IMPORT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Spline+Sans+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ââ Decorative starfield (CSS-only, deterministic) ââââââââââââââââââââââââââ
function Starfield() {
  const stars = React.useMemo(() => {
    const seeded = (n) => {
      const x = Math.sin(n * 999.13) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 70 }, (_, i) => ({
      top: seeded(i + 1) * 100,
      left: seeded(i + 50) * 100,
      size: seeded(i + 99) * 2 + 0.6,
      delay: seeded(i + 7) * 6,
      dur: seeded(i + 3) * 4 + 3,
    }));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-amber-100"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 0.5,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ââ Section heading âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Kicker({ children }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="h-px w-8 bg-amber-400/60" />
      <span
        className="text-[0.7rem] uppercase tracking-[0.32em] text-amber-300/90"
        style={{ fontFamily: "'Spline Sans Mono', monospace" }}
      >
        {children}
      </span>
    </div>
  );
}

function SectionTitle({ index, children }) {
  return (
    <h2
      className="flex items-baseline gap-4 text-3xl leading-tight text-stone-100 sm:text-4xl"
      style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
    >
      <span
        className="text-amber-400/80 text-xl"
        style={{ fontFamily: "'Spline Sans Mono', monospace" }}
      >
        {index}
      </span>
      <span>{children}</span>
    </h2>
  );
}

// ââ Reveal-on-scroll wrapper ââââââââââââââââââââââââââââââââââââââââââââââââ
function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown(true),
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {children}
    </div>
  );
}

// ââ Card primitive ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-amber-200/10 bg-white/[0.025] p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// DATA
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const MILESTONES = [
  {
    day: "Day 1â2",
    title: "Foundations & graph skeleton",
    points: [
      "Set up the repo, environment, and an LLM provider key.",
      "Stand up a minimal LangGraph graph: a single node that echoes a reply.",
      "Define the shared state schema (messages, user birth details, intermediate tool outputs).",
    ],
  },
  {
    day: "Day 3â4",
    title: "Tools & the agent loop",
    points: [
      "Implement at least three tools (see Tools section) as callable functions.",
      "Wire a ToolNode and a conditional edge so the agent loops: reason â call tool â observe â repeat.",
      "Add a router node that classifies intent (chart request, daily horoscope, free-form question).",
    ],
  },
  {
    day: "Day 5â6",
    title: "Frontend & integration",
    points: [
      "Build the React chat UI and the birth-details form.",
      "Stream agent responses token-by-token; show tool-call activity as it happens.",
      "Persist conversations so a returning user keeps their history.",
    ],
  },
  {
    day: "Day 7",
    title: "Evaluation & polish",
    points: [
      "Run the full evaluation harness and record the scorecard.",
      "Write the README, record a short demo, and submit.",
    ],
  },
];

const TOOLS = [
  {
    name: "compute_birth_chart",
    desc: "Given date, time, and place of birth, return planetary positions and houses. Use a real ephemeris library (e.g. pyswisseph / flatlib) â do not hallucinate positions.",
  },
  {
    name: "get_daily_transits",
    desc: "Fetch current planetary transits for a given date and relate them to the user's natal chart.",
  },
  {
    name: "geocode_place",
    desc: "Resolve a place name to latitude/longitude/timezone â needed for accurate chart math.",
  },
  {
    name: "knowledge_lookup",
    desc: "A small RAG tool over a curated set of astrology reference notes you provide. Keeps interpretations grounded and consistent.",
  },
];

const RUBRIC = [
  { area: "Agent architecture (LangGraph)", weight: 25, detail: "Clean graph design, correct state management, sensible routing and tool-loop control flow." },
  { area: "Tool implementation & correctness", weight: 20, detail: "Tools are real, robust, and handle bad input gracefully. Chart math is accurate, not invented." },
  { area: "Evaluation rigor", weight: 20, detail: "A genuine, reproducible eval harness with a golden set, automated scoring, and an honest scorecard." },
  { area: "Frontend craft", weight: 20, detail: "Usable, responsive React UI. Streaming, loading and error states, conversation persistence." },
  { area: "Code quality & docs", weight: 10, detail: "Readable, typed where sensible, good commits, a README a stranger can follow." },
  { area: "Product judgment", weight: 5, detail: "Thoughtful handling of ambiguity, tone appropriate to Aradhana, sensible safety guardrails." },
];

const EVAL_PRACTICES = [
  {
    title: "Build a golden set before you build features",
    body: "Write 20â30 representative inputs with the behavior you expect: chart requests with valid and invalid birth data, daily-horoscope asks, vague questions, off-topic and adversarial prompts. This is your contract. Commit it as a versioned JSONL file so results are comparable across runs.",
  },
  {
    title: "Separate deterministic checks from judgment calls",
    body: "Some things are objectively gradeable â did the right tool get called, is the chart math within tolerance of a reference value, is the JSON well-formed, did the agent stay within a step budget. Assert these directly in code. Reserve LLM-as-judge only for qualities you genuinely cannot assert, like tone and helpfulness.",
  },
  {
    title: "Use LLM-as-judge carefully",
    body: "When you do use a model to grade, give it a rubric with concrete 1â5 criteria, not a vague 'is this good'. Score one dimension at a time. Pass the judge a reference answer where one exists. Spot-check at least 10 judge verdicts against your own judgment and report the agreement rate â an unvalidated judge is not evidence.",
  },
  {
    title: "Measure cost, latency, and reliability â not just quality",
    body: "For every eval run, log tokens, dollar cost, end-to-end latency (p50 and p95), tool-call count, and the failure rate. A correct answer that takes 40 seconds or 12 tool calls is still a regression. Put these in the scorecard.",
  },
  {
    title: "Test the failure modes on purpose",
    body: "Include cases that should fail gracefully: impossible birth dates, missing time of birth, prompt-injection attempts, requests for medical or financial certainty. Define the correct behavior for each and assert it. Graceful failure is a feature.",
  },
  {
    title: "Make it one command and track it over time",
    body: "The whole suite must run with a single command and print a scorecard table. Keep a short results log (a CSV or markdown table) showing each run's scores so regressions are visible. Treat a score drop like a failing test.",
  },
];

const DELIVERABLES = [
  "A public Git repo (or zip) with backend, frontend, and the evaluation harness.",
  "A README: setup steps, architecture overview, a diagram of the LangGraph graph, and known limitations.",
  "The committed golden-set file and an eval scorecard from your latest run.",
  "A 3â5 minute screen recording walking through a real conversation and the eval output.",
  "A short EVALUATION.md reflecting on what your eval revealed and what you would fix with more time.",
];

const STRETCH = [
  "Add memory: the agent recalls the user's chart across sessions without re-asking.",
  "A second agent (e.g. an 'editor' that softens tone) with an explicit handoff.",
  "Human-in-the-loop: pause the graph for confirmation before a sensitive reading.",
  "Caching of chart computations to cut latency and cost.",
];

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MAIN
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function AstroAgentAssignment() {
  useFonts();
  const serif = { fontFamily: "'Fraunces', serif" };
  const body = { fontFamily: "'Newsreader', serif" };
  const mono = { fontFamily: "'Spline Sans Mono', monospace" };

  return (
    <div
      className="min-h-screen w-full text-stone-300"
      style={{
        ...body,
        background:
          "radial-gradient(1200px 700px at 78% -8%, #2b2a55 0%, transparent 55%), radial-gradient(900px 600px at 10% 12%, #3a2742 0%, transparent 50%), linear-gradient(180deg, #11101f 0%, #0b0a14 100%)",
      }}
    >
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.15} 50%{opacity:.85} }
        @keyframes drift { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        ::selection { background:#f0b95b44; }
        html { scroll-behavior:smooth; }
      `}</style>

      {/* ââ HERO ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      <header className="relative overflow-hidden border-b border-amber-200/10">
        <Starfield />
        {/* slow-rotating zodiac ring */}
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-amber-300/10"
          style={{ animation: "drift 140s linear infinite" }}
        >
          <div className="absolute inset-8 rounded-full border border-amber-300/10" />
          <div className="absolute inset-20 rounded-full border border-amber-300/[0.07]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="mb-10 flex items-center justify-between">
            <span style={mono} className="text-sm tracking-[0.3em] text-amber-200/90">
              â¦ ARADHANA
            </span>
            <span style={mono} className="text-xs tracking-[0.2em] text-stone-500">
              INTERNSHIP Â· 2026
            </span>
          </div>

          <p style={mono} className="mb-5 text-xs uppercase tracking-[0.32em] text-amber-300/80">
            Full-Stack Builder â Take-Home Assignment
          </p>

          <h1
            className="text-5xl leading-[1.05] text-stone-50 sm:text-7xl"
            style={{ ...serif, fontWeight: 500 }}
          >
            Build the{" "}
            <span className="italic text-amber-300">AstroAgent</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-stone-300/90">
            Aradhana is a daily spiritual companion. Your task is to build an{" "}
            <em className="text-amber-200/90">agentic</em> AI astrologer â a
            conversational guide that computes a user's birth chart, reasons
            over real planetary data with tools, and answers their questions
            with warmth and care. Backend as an agent graph; a polished React
            app on top.
          </p>

          <div className="mt-9 flex flex-wrap gap-3" style={mono}>
            {["~7 days", "LangGraph + React", "Agentic + tools", "Eval-driven"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-amber-200/20 bg-amber-100/[0.04] px-4 py-1.5 text-xs tracking-wide text-amber-100/90"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-24 px-6 py-20">
        {/* ââ 01 CONTEXT ââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>The brief</Kicker>
            <SectionTitle index="01">Why we're asking this</SectionTitle>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-stone-300/90">
              <p>
                As a full-stack builder at Aradhana you'll own features
                end-to-end: the model logic, the API, and the interface a
                devotee actually touches. This assignment is a miniature of
                that. We care less about a flawless astrologer and more about
                how you <em className="text-amber-200/90">think</em> â how you
                structure an agent, how you keep it grounded in real data, and{" "}
                <em className="text-amber-200/90">how you prove it works</em>.
              </p>
              <p>
                Treat the evaluation section as a first-class deliverable, not
                an afterthought. A modest agent with an honest, rigorous eval
                will score far higher than an impressive demo with no evidence
                behind it.
              </p>
            </div>
          </section>
        </Reveal>

        {/* ââ 02 WHAT TO BUILD ââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>Scope</Kicker>
            <SectionTitle index="02">What to build</SectionTitle>
            <p className="mt-6 text-lg leading-relaxed text-stone-300/90">
              An <strong className="text-stone-100">AstroAgent</strong>: a
              chat-based astrology companion. A user shares their birth details
              and can then ask things like âwhat does my chart say about my
              career?â or âwhat's the energy for me today?â. The agent must
              reason in steps, call tools to get real data, and respond
              conversationally.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Panel>
                <h3 style={serif} className="text-xl text-amber-200">
                  Backend â the agent
                </h3>
                <ul className="mt-3 space-y-2 text-[0.97rem] leading-relaxed text-stone-400">
                  <li>â¢ Built with <strong className="text-stone-200">LangGraph</strong> (or an equivalent agent-graph framework â justify any substitute).</li>
                  <li>â¢ A stateful graph with a reasoning node, a tool node, and conditional routing.</li>
                  <li>â¢ Exposed over a small API (FastAPI, Express, or similar) with streaming.</li>
                </ul>
              </Panel>
              <Panel>
                <h3 style={serif} className="text-xl text-amber-200">
                  Frontend â the companion
                </h3>
                <ul className="mt-3 space-y-2 text-[0.97rem] leading-relaxed text-stone-400">
                  <li>â¢ A <strong className="text-stone-200">React</strong> chat interface, responsive and calm in tone.</li>
                  <li>â¢ A birth-details form with validation.</li>
                  <li>â¢ Streamed responses, visible tool activity, error and loading states.</li>
                </ul>
              </Panel>
            </div>
          </section>
        </Reveal>

        {/* ââ 03 TOOLS ââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>The agent loop</Kicker>
            <SectionTitle index="03">Tools the agent must have</SectionTitle>
            <p className="mt-6 text-lg leading-relaxed text-stone-300/90">
              An agent is only as good as its tools. Implement at least three
              of the following four. The chart math must come from a real
              ephemeris â an agent that invents planetary positions fails the
              core requirement.
            </p>
            <div className="mt-8 space-y-3">
              {TOOLS.map((t, i) => (
                <div
                  key={t.name}
                  className="flex gap-4 rounded-lg border border-amber-200/10 bg-white/[0.02] p-5"
                >
                  <span
                    style={mono}
                    className="mt-0.5 shrink-0 text-amber-400/70"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <code
                      style={mono}
                      className="text-[0.95rem] text-amber-200"
                    >
                      {t.name}()
                    </code>
                    <p className="mt-1 text-[0.97rem] leading-relaxed text-stone-400">
                      {t.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ââ 04 EVALUATION (centerpiece) âââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>Read this twice</Kicker>
            <SectionTitle index="04">Evaluating your agent</SectionTitle>
            <p className="mt-6 text-lg leading-relaxed text-stone-300/90">
              This is the section we weight most heavily relative to its size.
              Agents are non-deterministic; âit worked when I tried itâ is not
              evidence. Build a real evaluation harness and follow these
              practices.
            </p>

            <div className="mt-8 space-y-4">
              {EVAL_PRACTICES.map((p, i) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-amber-200/15 bg-gradient-to-br from-amber-100/[0.05] to-transparent p-6"
                >
                  <div className="flex items-baseline gap-3">
                    <span style={mono} className="text-amber-400/80 text-sm">
                      EV{String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      style={serif}
                      className="text-xl text-stone-100"
                    >
                      {p.title}
                    </h3>
                  </div>
                  <p className="mt-2 pl-10 text-[0.97rem] leading-relaxed text-stone-400">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>

            <Panel className="mt-6 border-amber-200/20">
              <p style={mono} className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                Minimum bar
              </p>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-stone-300">
                A versioned golden set, a one-command runner, a scorecard
                covering quality + cost + latency + failure rate, and an
                honest EVALUATION.md. We would rather see a low score
                reported truthfully than a perfect score we can't reproduce.
              </p>
            </Panel>
          </section>
        </Reveal>

        {/* ââ 05 TIMELINE âââââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>Suggested path</Kicker>
            <SectionTitle index="05">A week, roughly</SectionTitle>
            <p className="mt-6 text-lg leading-relaxed text-stone-300/90">
              A guide, not a mandate â manage your own time. Notice that
              evaluation isn't only Day 7: your golden set should exist early.
            </p>
            <div className="mt-8 space-y-px overflow-hidden rounded-xl border border-amber-200/10">
              {MILESTONES.map((m) => (
                <div
                  key={m.day}
                  className="grid gap-4 bg-white/[0.02] p-6 sm:grid-cols-[8rem_1fr]"
                >
                  <div>
                    <p style={mono} className="text-sm text-amber-300/90">
                      {m.day}
                    </p>
                    <p style={serif} className="mt-1 text-lg text-stone-100">
                      {m.title}
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-[0.97rem] leading-relaxed text-stone-400">
                    {m.points.map((pt) => (
                      <li key={pt}>â {pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ââ 06 RUBRIC âââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section>
            <Kicker>How we grade</Kicker>
            <SectionTitle index="06">Scoring rubric</SectionTitle>
            <div className="mt-8 space-y-3">
              {RUBRIC.map((r) => (
                <div
                  key={r.area}
                  className="rounded-lg border border-amber-200/10 bg-white/[0.02] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-stone-100" style={{ ...serif, fontSize: "1.1rem" }}>
                      {r.area}
                    </h3>
                    <span style={mono} className="shrink-0 text-amber-300">
                      {r.weight}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-stone-700/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                      style={{ width: `${r.weight * 4}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-stone-400">
                    {r.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ââ 07 DELIVERABLES + STRETCH âââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <Kicker>Hand-in</Kicker>
              <SectionTitle index="07">Deliverables</SectionTitle>
              <ul className="mt-6 space-y-3">
                {DELIVERABLES.map((d) => (
                  <li
                    key={d}
                    className="flex gap-3 text-[0.97rem] leading-relaxed text-stone-300/90"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Kicker>If time allows</Kicker>
              <h2
                className="text-3xl text-stone-100"
                style={{ ...serif, fontWeight: 500 }}
              >
                Stretch goals
              </h2>
              <p className="mt-3 text-sm text-stone-500">
                Optional. Don't sacrifice the core or the eval for these.
              </p>
              <ul className="mt-4 space-y-3">
                {STRETCH.map((s) => (
                  <li
                    key={s}
                    className="flex gap-3 text-[0.97rem] leading-relaxed text-stone-400"
                  >
                    <span style={mono} className="text-amber-400/70">â¦</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        {/* ââ GROUND RULES âââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <Panel className="border-amber-200/15">
            <Kicker>Ground rules</Kicker>
            <ul className="mt-3 space-y-2.5 text-[0.97rem] leading-relaxed text-stone-300/90">
              <li>
                <strong className="text-stone-100">AI tools are allowed</strong>{" "}
                and encouraged â we build with them daily. You must fully
                understand and be able to defend every line you submit.
              </li>
              <li>
                <strong className="text-stone-100">Astrology is for guidance and reflection.</strong>{" "}
                The agent must never present readings as medical, legal, or
                financial certainty. Bake this guardrail in and test it.
              </li>
              <li>
                <strong className="text-stone-100">Scope honestly.</strong> If
                you cut something, say so in the README. Clear thinking about
                trade-offs reads better than silent gaps.
              </li>
              <li>
                <strong className="text-stone-100">Questions are welcome.</strong>{" "}
                Reach out if anything is ambiguous â knowing when to ask is part
                of the job.
              </li>
            </ul>
          </Panel>
        </Reveal>

        {/* ââ SUBMISSION ââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <Reveal>
          <section className="rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-100/[0.06] to-transparent p-8 text-center">
            <p style={mono} className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
              Submission
            </p>
            <h2
              className="mt-3 text-3xl text-stone-50"
              style={{ ...serif, fontWeight: 500 }}
            >
              Send your work to
            </h2>
            <a
              href="mailto:iitr.abhijeet@gmail.com?subject=AstroAgent%20Assignment%20Submission"
              style={mono}
              className="mt-4 inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-7 py-3 text-amber-100 transition-colors hover:bg-amber-300/20"
            >
              iitr.abhijeet@gmail.com
            </a>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-stone-400">
              Include a repo link (or zip) and your demo recording. Subject
              line: âAstroAgent Assignment â [Your Name]â. We read every
              submission carefully â good luck, and have fun with it.
            </p>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-amber-200/10 px-6 py-10 text-center">
        <p style={mono} className="text-xs tracking-[0.25em] text-stone-600">
          â¦ ARADHANA Â· YOUR DAILY SPIRITUAL COMPANION
        </p>
      </footer>
    </div>
  );
}
