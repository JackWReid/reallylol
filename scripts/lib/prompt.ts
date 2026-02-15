/** Readline-based terminal prompts. */

import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/** Prompt the user for text input. */
export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/** Close the readline interface. Call when done prompting. */
export function closePrompt(): void {
  rl.close();
}
