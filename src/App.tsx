import SearchBar from './components/SearchBar'

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <span className="material-symbols-outlined text-6xl text-indigo-600">calendar_month</span>
      <h1 className="text-4xl font-bold">Scheduler</h1>
      <p className="text-slate-500">SF Hacks x GDG — prototype loading…</p>
      <SearchBar />
    </main>
  )
}
