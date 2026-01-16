
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Search, Copy, Check, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { BIBLE_BOOKS } from './constants';
import { GeneratedPrompt, PromptResponse } from './types';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedPrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = BIBLE_BOOKS
        .filter(book => book.name.toLowerCase().startsWith(inputValue.toLowerCase()))
        .map(book => book.name)
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
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
  };

  const generatePrompts = async () => {
    if (!inputValue.trim()) return;

    setIsGenerating(true);
    setResults([]);

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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="serif text-4xl md:text-5xl font-semibold tracking-tight">ScriptureVisualizer</h1>
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
                type="text"
                placeholder="Enter a verse (e.g., Genesis 1:1, John 3:16)..."
                className="w-full bg-white border border-slate-200 rounded-xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-lg"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generatePrompts()}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((book) => (
                    <button
                      key={book}
                      onClick={() => handleSuggestionClick(book)}
                      className="w-full text-left px-5 py-3 hover:bg-amber-50 text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span>{book}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400" />
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
                  className="group relative bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-amber-100 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      {prompt.style}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-amber-500 transition-colors">
                      {copiedId === prompt.id ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                      <span className="text-sm font-medium">
                        {copiedId === prompt.id ? 'Copied' : 'Click to copy'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="serif text-xl md:text-2xl text-slate-800 leading-relaxed mb-6">
                    {prompt.content}
                  </p>
                  
                  <div className="pt-6 border-t border-slate-50">
                    <p className="text-slate-400 text-sm leading-relaxed italic">
                      <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider not-italic mr-2">Context:</span>
                      {prompt.explanation}
                    </p>
                  </div>

                  {/* Visual Copy Feedback Overlay */}
                  <div className={`absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 pointer-events-none ${copiedId === prompt.id ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-xl scale-110">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="font-medium">Prompt Copied to Clipboard</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isGenerating && (
            <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-400 font-light italic">
                Enter a scripture above to reveal artistic prompt variations.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-8 h-48 animate-pulse">
                  <div className="h-4 w-24 bg-slate-100 rounded-full mb-6" />
                  <div className="space-y-3">
                    <div className="h-6 w-full bg-slate-50 rounded" />
                    <div className="h-6 w-3/4 bg-slate-50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center border-t border-slate-100 pt-8 mt-12">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            Crafted for Creators & Visual Storytellers
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
