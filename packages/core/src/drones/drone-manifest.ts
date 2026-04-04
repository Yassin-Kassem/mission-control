import YAML from 'yaml';

export interface DroneTriggers {
  taskSize?: string;
  keywords?: string[];
  fileCount?: string;
  [key: string]: unknown;
}

export interface DroneOpinions {
  requires: string[];
  suggests: string[];
  blocks: string[];
}

export interface DroneSignals {
  emits: string[];
  listens: string[];
}

export type DroneType = 'tool' | 'ai';

export interface DroneManifest {
  name: string;
  description: string;
  type: DroneType;
  model?: string;
  triggers: DroneTriggers;
  opinions: DroneOpinions;
  signals: DroneSignals;
  priority: number;
  escalation: string;
  inputs?: string[];   // files this drone reads from .mctl/mission/
  outputs?: string[];  // files this drone writes to .mctl/mission/
}

export function parseDroneManifest(yamlContent: string): DroneManifest {
  const raw = YAML.parse(yamlContent) ?? {};
  return {
    name: raw.name ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'ai',
    model: raw.model,
    triggers: raw.triggers ?? {},
    opinions: {
      requires: raw.opinions?.requires ?? [],
      suggests: raw.opinions?.suggests ?? [],
      blocks: raw.opinions?.blocks ?? [],
    },
    signals: {
      emits: raw.signals?.emits ?? [],
      listens: raw.signals?.listens ?? [],
    },
    priority: raw.priority ?? 0,
    escalation: raw.escalation ?? 'user',
    inputs: raw.inputs ?? [],
    outputs: raw.outputs ?? [],
  };
}

export function validateManifest(manifest: DroneManifest): string[] {
  const errors: string[] = [];
  if (!manifest.name) errors.push('name is required');
  if (!manifest.description) errors.push('description is required');
  return errors;
}
