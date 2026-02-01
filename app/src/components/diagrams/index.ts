export { BaseNode, EditableLabel, NodeHandles } from "./BaseNode";
export {
  GraphNode,
  graphNodeTypes,
  // Legacy exports for backward compatibility
  architectureNodeTypes,
  explorationNodeTypes,
  nodeTypeConfig,
  nodeTypeNames,
  type NodeTypeConfig,
  type GraphNodeData,
  type ArchNodeType,
  type ArchitectureNodeData,
  type MindMapNodeData,
  type FlowNodeData,
  type DependencyNodeData,
} from "./nodes";
export { useDiagram } from "./useDiagram";
export { DiagramCanvas } from "./DiagramCanvas";
export { NodeCommandPalette, useNodeCommandPalette } from "./NodeCommandPalette";
