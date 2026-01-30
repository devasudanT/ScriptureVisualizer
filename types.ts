
export interface GeneratedPrompt {
  id: string;
  style: string;
  content: string;
}

export interface PromptResponse {
  verseText: string;
  prompts: {
    style: string;
    content: string;
  }[];
}

export interface BibleBook {
  name: string;
  chapters: number;
}
