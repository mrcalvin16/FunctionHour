"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <label htmlFor="global-event-search" className="sr-only">Search events</label>
        <input
          id="global-event-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for events..."
          className="w-full py-3 px-4 pl-12 bg-white rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5" />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 min-h-9 bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-800 transition-colors duration-200"
        >
          Search
        </button>
      </form>
    </div>
  );
}
