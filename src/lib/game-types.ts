export type GameData = {
  chosung: string;
  date: string;
};

export type GuessResult =
  | { correct: true; valid: true; date: string }
  | { correct: false; valid: false; reason: string; date: string }
  | { correct: false; valid: true; hint: string; date: string };

export type LogEntry = {
  input: string;
  result: GuessResult;
  attempt: number;
  jamoState?: {
    jamos: string[];
    revealed: boolean[];
    newIndex?: number;
  };
};
