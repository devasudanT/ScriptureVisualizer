
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Search, Copy, Check, Sparkles, BookOpen, ChevronRight, Quote } from 'lucide-react';
import { BIBLE_BOOKS } from './constants';
import { GeneratedPrompt, PromptResponse } from './types';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedPrompt[]>([]);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [currentReference, setCurrentReference] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = BIBLE_BOOKS
        .filter(book => book.name.toLowerCase().startsWith(inputValue.toLowerCase()))
        .map(book => book.name)
        .slice(0, 5);
      
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
    setVerseText(null);
    setCurrentReference(null);
    setShowSuggestions(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fetch the full text for the Bible verse: "${inputValue}". 
        
        1. Identify 2 or 3 main context words that capture the essence of the verse. 
        2. Generate 3 distinct image prompts that provide a literal visual scene accurately representing the verse context.
        3. STRICT REQUIREMENT: Do not include any text, typography, or written words within the generated image prompts.
        4. In the "verseText" and the "content" of each prompt, wrap the 2-3 chosen keywords in double asterisks like **keyword** to highlight them.
        
        Styles required:
        - Literal Scene (Cinematic, realistic, detailed biblical setting, no text in image)
        - Literal Scene (Alternative realistic camera angle or mood, no text in image)
        - Sims 3D Style (Stylized 3D render in the bright, colorful aesthetic of The Sims 3/4 video games, no text in image)
        
        Return ONLY the results in JSON format.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verseText: { type: Type.STRING, description: "The full text of the verse with keywords highlighted with **." },
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    style: { type: Type.STRING },
                    content: { type: Type.STRING, description: "The prompt text with keywords highlighted with **. Must not request text in the image." }
                  },
                  required: ["style", "content"]
                }
              }
            },
            required: ["verseText", "prompts"]
          }
        }
      });

      const data: PromptResponse = JSON.parse(response.text || '{"verseText": "", "prompts":[]}');
      setVerseText(data.verseText);
      setCurrentReference(inputValue.trim());
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
    const cleanText = text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={i} className="font-bold text-amber-600 drop-shadow-[0_0.5px_0.5px_rgba(251,191,36,0.1)]">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-4 shadow-sm border border-amber-100">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="serif text-4xl md:text-5xl font-semibold tracking-tight text-slate-800">ScriptureVisualizer</h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto font-light">
            Pure visual imagery from sacred texts. No text, just scene.
          </p>
        </header>

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
              
              {showSuggestions && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
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

        <div className="space-y-10 pb-20">
          {verseText && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 opacity-20 group-hover:opacity-100 transition-opacity" />
              <Quote className="w-10 h-10 text-amber-100 absolute top-4 left-4 -scale-x-100" />
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600/60 mb-4">Scripture Passage</h3>
                <p className="serif italic text-2xl md:text-3xl text-slate-700 leading-relaxed max-w-2xl mx-auto">
                  "{renderHighlightedText(verseText)}"
                </p>
                <p className="mt-4 font-bold text-slate-400 uppercase text-xs tracking-widest">— {currentReference}</p>
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 text-center mb-2">Literal Image Prompts</h4>
              {results.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => copyToClipboard(prompt.content, prompt.id)}
                  className="group relative bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100/50 px-2.5 py-1 rounded-md">
                      {prompt.style}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-amber-600 transition-colors">
                      {copiedId === prompt.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {copiedId === prompt.id ? 'Copied' : 'Copy'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-lg text-slate-800 leading-relaxed font-medium">
                    {renderHighlightedText(prompt.content)}
                  </p>

                  <div className={`absolute inset-0 bg-white/90 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300 pointer-events-none ${copiedId === prompt.id ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-slate-900 text-white px-6 py-2.5 rounded-full flex items-center gap-2 shadow-xl">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="font-semibold text-sm">Copied Prompt</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isGenerating && (
            <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[2rem] bg-white/50">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-slate-200" />
              </div>
              <p className="text-slate-400 text-sm">Enter a verse for literal visual prompts without text elements.</p>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-8 h-48 animate-pulse mb-6" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-6 h-32 animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <footer className="text-center border-t border-slate-100 pt-8 mt-12">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.4em]">
            Literal & Text-Free Visualization
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
