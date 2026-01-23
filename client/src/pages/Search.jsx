import { useState } from 'react';
import api from '../api/axios';
import { Search as SearchIcon, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]); // Clear old results

    try {
      // 1. Send query to backend
      const res = await api.post('/search', { query });
      console.log("Search Results:", res.data);
      setResults(res.data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-[80vh]">
      
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Ask your Brain</h1>

      {/* 1. Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-12">
        <input
          type="text"
          placeholder="e.g., What is the difference between RAM and ROM?"
          className="w-full p-4 pl-12 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchIcon className="absolute left-4 top-5 text-gray-400 w-6 h-6" />
        <button 
          type="submit"
          disabled={loading}
          className="absolute right-3 top-2.5 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* 2. Results Area */}
      <div className="space-y-6">
        
        {/* Loading State */}
        {loading && (
          <div className="text-center text-gray-500 py-10">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            <p>Searching through your knowledge base...</p>
          </div>
        )}

        {/* No Results State */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
            <p>No relevant documents found.</p>
          </div>
        )}

        {/* Results List */}
        {results.map((result, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition">
                  {result.fileName}
                </h3>
              </div>
              
              {/* Relevance Score Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-bold 
                ${result.score > 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {(result.score * 100).toFixed(0)}% Relevance
              </span>
            </div>

            <p className="text-gray-600 mb-4 line-clamp-2">
              {result.summary}
            </p>

            {/* If your backend returns a file ID, link to it. Otherwise, show text. */}
            {/* Note: In Hour 12 logic, we might not be returning the Mongo ID (_id) from Pinecone yet. 
                If the link breaks, we will fix the controller in the next step. */}
            <div className="text-sm font-medium text-blue-600 flex items-center">
              Read Document <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;