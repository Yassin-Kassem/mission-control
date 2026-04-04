import type { DroneManifest } from './drone-manifest.js';

export interface DispatchPrompt {
  drone: string;
  type: 'tool' | 'ai';
  model?: string;
  command?: string;       // for tool drones
  prompt?: string;        // for AI drones
  inputs: string[];       // files to read from .mctl/mission/
  outputs: string[];      // files to write to .mctl/mission/
}

export interface MissionDispatchPlan {
  missionId: string;
  description: string;
  steps: DispatchPrompt[];
}

export class DronePromptBuilder {
  private skills = new Map<string, string>();
  private memoryContext = '';
  private customContext = '';

  registerSkill(droneName: string, skillContent: string): void {
    this.skills.set(droneName, skillContent);
  }

  setMemoryContext(context: string): void {
    this.memoryContext = context;
  }

  setCustomContext(context: string): void {
    this.customContext = context;
  }

  buildPrompt(manifest: DroneManifest, task: string): DispatchPrompt {
    if (manifest.type === 'tool') {
      return {
        drone: manifest.name,
        type: 'tool',
        command: `npx @missionctl/cli drone exec ${manifest.name}`,
        inputs: manifest.inputs ?? [],
        outputs: manifest.outputs ?? [],
      };
    }

    const skill = this.skills.get(manifest.name);
    if (!skill) {
      throw new Error(`No skill registered for AI drone "${manifest.name}". Cannot dispatch without behavior definition.`);
    }

    const sections: string[] = [];

    sections.push(`You are a Mission Control drone. Your role: **${manifest.name}** — ${manifest.description}`);
    sections.push(`\n## Task\n\n${task}`);

    if (this.memoryContext) {
      sections.push(`\n## Project Memory\n\nThe following was learned from previous missions:\n${this.memoryContext}`);
    }

    if (this.customContext) {
      sections.push(`\n## Additional Context\n\n${this.customContext}`);
    }

    sections.push(`\n## Behavior\n\n${skill}`);

    const inputFiles = manifest.inputs ?? [];
    const outputFiles = manifest.outputs ?? [];

    if (inputFiles.length > 0) {
      sections.push(`\n## Required Reads\n\nBefore starting, read these files from the project:\n${inputFiles.map((f) => `- \`.mctl/mission/${f}\``).join('\n')}`);
    }

    if (outputFiles.length > 0) {
      sections.push(`\n## Required Writes\n\nYou MUST write your output to:\n${outputFiles.map((f) => `- \`.mctl/mission/${f}\``).join('\n')}`);
    }

    sections.push(`\n## Communication Protocol\n\n- Write all output files BEFORE reporting\n- Your final message must be a one-line status summary\n- Do NOT read files that aren't in your input list unless the skill instructs you to\n- Do NOT modify files outside the scope of your task`);

    return {
      drone: manifest.name,
      type: 'ai',
      model: manifest.model,
      prompt: sections.join('\n'),
      inputs: inputFiles,
      outputs: outputFiles,
    };
  }

  buildPlan(missionId: string, description: string, drones: DroneManifest[]): MissionDispatchPlan {
    return {
      missionId,
      description,
      steps: drones.map((d) => this.buildPrompt(d, description)),
    };
  }
}
