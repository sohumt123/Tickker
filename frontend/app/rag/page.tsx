"use client"

const RAG_URL = process.env.NEXT_PUBLIC_RAG_URL || 'http://127.0.0.1:7777'

export default function RAGPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Financial Research (RAG)</h1>
      <p className="text-slate-600">This embeds your Flask RAG UI from <code>{RAG_URL}</code>. Start the service and it will appear below.</p>
      <div className="card p-0 overflow-hidden">
        <iframe src={RAG_URL} className="w-full h-[75vh]" title="Financial RAG" />
      </div>
      <div className="text-xs text-slate-500">
        If nothing loads: run your RAG app (Flask) on port 7777, or set <code>NEXT_PUBLIC_RAG_URL</code> to its URL and restart the frontend.
      </div>
    </div>
  )
}


