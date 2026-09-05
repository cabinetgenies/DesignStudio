import type { V2MaterialZone } from "./materials";

export interface V2Assembly {
  id: string;
  name: string;
  originalName: string;
  hierarchyPath: string;
  productCode?: string;
  meshIds: string[];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    center: [number, number, number];
  };
  proposedZone: V2MaterialZone | null;
  confidence: number;
  reasons: string[];
}

interface NodeEntry {
  id: string;
  name: string;
  path: string;
  depth: number;
}

const PRODUCT_PATTERN = /^(B|DB|SB|W|UC|FS|BFL|WFL|DD|TBW|CM|TKBM|GD)[0-9]/i;

export function classifyDaeAssemblies(xml: string): V2Assembly[] {
  const nodes: NodeEntry[] = [];
  const stack: string[] = [];
  const nodePattern = /<node\s+[^>]*\bid="([^"]*)"[^>]*\bname="([^"]*)"[^>]*>/g;
  const closePattern = /<\/node>/g;

  let nodeMatch: RegExpExecArray | null;
  let closeMatch: RegExpExecArray | null;
  let closeLast = 0;

  while ((nodeMatch = nodePattern.exec(xml)) !== null) {
    const closeSearchFrom = Math.max(closeLast, nodeMatch.index);
    closePattern.lastIndex = closeSearchFrom;
    while ((closeMatch = closePattern.exec(xml)) !== null && closeMatch.index < nodeMatch.index) {
      stack.pop();
      closeLast = closePattern.lastIndex;
    }
    const path = [...stack, nodeMatch[1]].join("/");
    nodes.push({
      id: nodeMatch[1],
      name: nodeMatch[2],
      path,
      depth: stack.length,
    });
    stack.push(nodeMatch[1]);
  }

  const assemblies: V2Assembly[] = [];
  nodes.forEach((node, index) => {
    const classification = classifyNode(node.name, node.path);
    if (!classification.zone) {
      return;
    }
    assemblies.push({
      id: `dae-${index}-${node.name.replace(/[^a-z0-9]+/gi, "_")}`,
      name: node.name,
      originalName: node.name,
      hierarchyPath: node.path,
      productCode: PRODUCT_PATTERN.test(node.name)
        ? node.name.match(/^[A-Z0-9.-]+/i)?.[0]
        : undefined,
      meshIds: [],
      bounds: {
        min: [0, 0, 0],
        max: [0, 0, 0],
        center: [0, 0, 0],
      },
      proposedZone: classification.zone,
      confidence: classification.confidence,
      reasons: classification.reasons,
    });
  });

  return assemblies;
}

function classifyNode(
  name: string,
  path: string,
): { zone: V2MaterialZone | null; confidence: number; reasons: string[] } {
  const lower = name.toLowerCase();
  void path;

  if (/^(scene|root|wall group|design|room|group|layer)$/i.test(lower)) {
    return { zone: null, confidence: 0, reasons: ["Generic container"] };
  }

  if (
    lower === "wall" ||
    lower === "surface-wall" ||
    lower.startsWith("wall-")
  ) {
    return { zone: "walls", confidence: 0.7, reasons: ["Wall name"] };
  }
  if (/floor/i.test(lower)) {
    return { zone: "floor", confidence: 0.55, reasons: ["Floor name"] };
  }
  if (/counter|worktop/i.test(lower)) {
    return { zone: "countertops", confidence: 0.55, reasons: ["Countertop name"] };
  }
  if (/backsplash|splash/i.test(lower)) {
    return { zone: "backsplash", confidence: 0.55, reasons: ["Backsplash name"] };
  }
  if (/hood|vent/i.test(lower)) {
    return { zone: "hood", confidence: 0.55, reasons: ["Hood name"] };
  }
  if (/handle|knob|pull|hinge/i.test(lower)) {
    return { zone: "hardware", confidence: 0.6, reasons: ["Hardware name"] };
  }
  if (/sink|faucet|tap|plumb/i.test(lower)) {
    return { zone: "plumbing", confidence: 0.6, reasons: ["Plumbing name"] };
  }
  if (/range|oven|fridge|refrigerator|dishwasher|microwave|appliance/i.test(lower)) {
    return { zone: "appliances", confidence: 0.6, reasons: ["Appliance name"] };
  }
  if (/island/i.test(lower)) {
    return { zone: "island", confidence: 0.55, reasons: ["Island name"] };
  }
  if (/uc|pantry|tall/i.test(lower)) {
    return { zone: "tall", confidence: 0.5, reasons: ["Tall cabinet name"] };
  }
  if (PRODUCT_PATTERN.test(name)) {
    if (/^w/i.test(name)) {
      return { zone: "perimeter", confidence: 0.5, reasons: ["Wall cabinet code"] };
    }
    return { zone: "perimeter", confidence: 0.45, reasons: ["Cabinet product code"] };
  }
  return { zone: null, confidence: 0, reasons: ["Needs review"] };
}
