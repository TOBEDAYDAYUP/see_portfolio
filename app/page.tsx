
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b1120] p-10 text-white">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-3xl font-bold">SEE Portfolio</h1>
        <span className="text-sm text-slate-400">
          Your investment intelligence platform
        </span>
      </header>

      <h2 className="mb-2 text-4xl font-semibold">
        Your market. Clearly.
      </h2>
      <p className="mb-10 text-slate-400">
        Track stocks, understand news, and stay informed.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {["My Watchlist", "Market Intelligence", "Daily Brief"].map(
          (item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-8"
            >
              <h3 className="mb-3 text-xl font-semibold">{item}</h3>
              <p className="text-sm text-slate-400">
                Coming soon
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}
