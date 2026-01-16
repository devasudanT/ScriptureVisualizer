
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Search, Copy, Check, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { BIBLE_BOOKS } from './constants';
import { GeneratedPrompt, PromptResponse } from './types';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.length > 0) {
      // Find books that start with the current input
      const filtered = BIBLE_BOOKS
        .filter(book => book.name.toLowerCase().startsWith(inputValue.toLowerCase()))
        .map(book => book.name)
        .slice(0, 5);
      
      // Only show suggestions if the current input isn't exactly matching a single suggestion already
      const exactMatch = filtered.length === 1 && filtered[0].toLowerCase() === inputValue.trim().toLowerCase();
      
      if (filtered.length > 0 && !exactMatch) {
        setSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (book: string) => {
    setInputValue(book + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          generatePrompts();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      generatePrompts();
    }
  };

  const generatePrompts = async () => {
    if (!inputValue.trim() || isGenerating) return;

    setIsGenerating(true);
    setResults([]);
    setShowSuggestions(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create 3 distinct, high-quality AI image generation prompts for the Bible verse: "${inputValue}". 
        Styles: 1. Cinematic Epic, 2. Historical Realism, 3. Ethereal Symbolism.
        Requirements: Max 800 characters per prompt. Include lighting, camera lens (e.g. 35mm, 85mm), environment, and atmosphere. Focus on biblical accuracy and powerful imagery.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING },
                    content: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["style", "content", "explanation"]
                }
              }
            },
            required: ["prompts"]
          }
        }
      });

      const data: PromptResponse = JSON.parse(response.text || '{"prompts":[]}');
      const formattedResults: GeneratedPrompt[] = data.prompts.map((p, i) => ({
        id: `prompt-${i}`,
        ...p
      }));

      setResults(formattedResults);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-4 shadow-sm border border-amber-100">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="serif text-4xl md:text-5xl font-semibold tracking-tight text-slate-800">ScriptureVisualizer</h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto font-light">
            Transform sacred texts into cinematic masterpieces for AI image generation.
          </p>
        </header>

        {/* Search Section */}
        <div className="relative max-w-2xl mx-auto mb-20" ref={suggestionRef}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter a verse (e.g., Genesis 1:1)..."
                className="w-full bg-white border border-slate-200 rounded-xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-lg"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => inputValue.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((book, index) => (
                    <button
                      key={book}
                      onClick={() => handleSuggestionClick(book)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-5 py-3 transition-colors flex items-center justify-between group ${
                        selectedIndex === index ? 'bg-amber-50 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium">{book}</span>
                      <ChevronRight className={`w-4 h-4 transition-colors ${
                        selectedIndex === index ? 'text-amber-400 translate-x-1' : 'text-slate-300'
                      }`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={generatePrompts}
              disabled={isGenerating || !inputValue.trim()}
              className="bg-slate-900 text-white px-8 py-4 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Visualizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-8 pb-20">
          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {results.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => copyToClipboard(prompt.content, prompt.id)}
                  className="group relative bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer overflow-hidden ring-1 ring-slate-50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100/50 px-3 py-1 rounded-full">
                      {prompt.style}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-amber-600 transition-colors">
                      {copiedId === prompt.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-tighter">
                        {copiedId === prompt.id ? 'Copied' : 'Copy Prompt'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="serif text-xl md:text-2xl text-slate-800 leading-relaxed mb-6 group-hover:text-slate-900 transition-colors">
                    {prompt.content}
                  </p>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-slate-500 text-sm leading-relaxed italic opacity-80">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-[0.2em] not-italic mr-3">Artistic Intent</span>
                      {prompt.explanation}
                    </p>
                  </div>

                  {/* Visual Copy Feedback Overlay */}
                  <div className={`absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 pointer-events-none ${copiedId === prompt.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl scale-110">
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold tracking-tight">Copied to clipboard</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isGenerating && (
            <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-[2rem] bg-white/50">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Sparkles className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-slate-400 font-medium text-lg mb-2">Ready for inspiration?</h3>
              <p className="text-slate-300 text-sm max-w-xs mx-auto font-light">
                Type a Bible book name above to see suggestions, then press enter to generate prompts.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-8 h-56 animate-pulse shadow-sm">
                  <div className="flex justify-between mb-8">
                    <div className="h-6 w-32 bg-slate-100 rounded-full" />
                    <div className="h-6 w-24 bg-slate-50 rounded-full" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-full bg-slate-50 rounded" />
                    <div className="h-4 w-11/12 bg-slate-50 rounded" />
                    <div className="h-4 w-4/5 bg-slate-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center border-t border-slate-100 pt-10 mt-12">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Curated Cinematic Theology
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
