"use client";

import { useState } from "react";

const lessons = [
  {
    title: "Daily Conversation",
    description: "Practice real English conversations with your AI coach.",
    level: "Your level",
  },
  {
    title: "Pronunciation",
    description: "Improve your pronunciation with focused speaking practice.",
    level: "Speaking",
  },
  {
    title: "Vocabulary Boost",
    description: "Expand your vocabulary through practical situations.",
    level: "Vocabulary",
  },
];

export default function Home() {
  const [active, setActive] = useState("home");

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto min-h-screen max-w-6xl px-6 py-8">

        <header className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              Speak<span className="text-blue-400">Flow</span>
            </div>
            <p className="mt-1 text-sm text-white/45">
              AI English Coach
            </p>
          </div>

          <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
            Profile
          </button>
        </header>

        <section className="mt-16">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
            SpeakFlow IA
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Your English.
            <br />
            Guided by AI.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/55">
            Practice English through conversations, pronunciation,
            vocabulary and personalized training.
          </p>

          <button
            onClick={() => setActive("coach")}
            className="mt-8 rounded-2xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-white/90"
          >
            Start a conversation →
          </button>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          {lessons.map((lesson) => (
            <button
              key={lesson.title}
              onClick={() => setActive("coach")}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left transition hover:-translate-y-1 hover:bg-white/[0.07]"
            >
              <span className="text-xs uppercase tracking-widest text-blue-400">
                {lesson.level}
              </span>

              <h2 className="mt-5 text-xl font-semibold">
                {lesson.title}
              </h2>

              <p className="mt-3 leading-7 text-white/45">
                {lesson.description}
              </p>

              <div className="mt-8 text-sm text-white/70">
                Practice →
              </div>
            </button>
          ))}
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-blue-400">Your progress</p>

              <h2 className="mt-2 text-2xl font-semibold">
                Keep building your fluency.
              </h2>

              <p className="mt-2 text-white/45">
                Your learning journey will appear here.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-5 text-center">
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-white/35">
                Sessions
              </div>
            </div>
          </div>
        </section>

        <nav className="mt-16 flex justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {["home", "coach", "progress"].map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`rounded-xl px-5 py-3 text-sm capitalize transition ${
                active === item
                  ? "bg-white text-black"
                  : "text-white/45 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

      </div>
    </main>
  );
}
