
export interface GeneratedPrompt {
  id: string;
  style: string;
  content: string;
  explanation: string;
}

export interface PromptResponse {
  prompts: {
    style: string;
    content: string;
    explanation: string;
  }[];
}

export interface BibleBook {
  name: string;
  chapters: number;
}
