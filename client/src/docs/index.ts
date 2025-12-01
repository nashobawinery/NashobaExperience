import type { ReactNode } from "react";

export interface DocSection {
  id: string;
  title: string;
  content: ReactNode;
}

export interface ModuleDocumentation {
  moduleKey: string;
  moduleName: string;
  description: string;
  lastUpdated?: string;
  sections: DocSection[];
}

export const moduleDocRegistry: Record<string, ModuleDocumentation> = {};

export function registerModuleDocs(docs: ModuleDocumentation) {
  moduleDocRegistry[docs.moduleKey] = docs;
}

export function getModuleDocs(moduleKey: string): ModuleDocumentation | null {
  return moduleDocRegistry[moduleKey] || null;
}
