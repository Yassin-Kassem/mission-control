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

export interface DroneManifest {
  name: string;
  description: string;
  triggers: DroneTriggers;
  opinions: DroneOpinions;
  signals: DroneSignals;
  priority: number;
  escalation: string;
}

export function parseDroneManifest(yamlContent: string): DroneManifest {
  const raw = YAML.parse(yamlContent) ?? {};
  return {
    name: raw.name ?? '',
    description: raw.description ?? '',
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
  };
}

export function validateManifest(manifest: DroneManifest): string[] {
  const errors: string[] = [];
  if (!manifest.name) errors.push('name is required');
  if (!manifest.description) errors.push('description is required');
  return errors;
}
