"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import { useDiagramsStore } from "@/lib/stores";
import type { DiagramNode, DiagramEdge } from "@/lib/tauri/types";

interface UseDiagramOptions {
  diagramId: string;
  // Node type for React Flow - simplified to 'graph' for all diagrams
  // Legacy values (mindmap, flow, dependency) are still accepted for backward compat
  nodeType?: string;
}

const DEFAULT_NODE_TYPE = "graph";

interface UseDiagramReturn {
  // Data
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  diagramName: string;

  // Handlers for React Flow
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => Promise<void>;

  // Node operations
  addNode: (label: string, nodeType?: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  updateNodeLabel: (nodeId: string, label: string) => Promise<void>;
  updateNodeNotes: (nodeId: string, notes: string) => Promise<void>;
  updateNodeType: (nodeId: string, nodeType: string) => Promise<void>;
  updateNodeMedia: (nodeId: string, imageUrl?: string, videoUrl?: string) => void;

  // Edge operations
  deleteEdge: (edgeId: string) => Promise<void>;

  // Diagram operations
  updateDiagramName: (name: string) => Promise<void>;
}

// Convert store node to React Flow node
function toFlowNode(node: DiagramNode, nodeType: string): Node {
  return {
    id: node.id,
    type: nodeType,
    position: { x: node.position_x, y: node.position_y },
    data: {
      label: node.label,
      notes: node.notes || undefined,
      nodeType: node.node_type || "default",
    },
  };
}

// Parse style_data JSON to get handle information
function parseStyleData(styleData: string | null): { sourceHandle?: string; targetHandle?: string } {
  if (!styleData) return {};
  try {
    return JSON.parse(styleData);
  } catch {
    return {};
  }
}

// Convert store edge to React Flow edge
function toFlowEdge(edge: DiagramEdge): Edge {
  const styleData = parseStyleData(edge.style_data);
  return {
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    sourceHandle: styleData.sourceHandle,
    targetHandle: styleData.targetHandle,
    label: edge.label || undefined,
    type: "default",
    style: { strokeWidth: 2, stroke: "#525252" },
    markerEnd: { type: "arrowclosed" as const, color: "#525252" },
  };
}

export function useDiagram({ diagramId, nodeType }: UseDiagramOptions): UseDiagramReturn {
  const resolvedNodeType = nodeType || DEFAULT_NODE_TYPE;
  const {
    currentDiagram,
    loadDiagram,
    update: updateDiagram,
    addNode: storeAddNode,
    updateNode: storeUpdateNode,
    deleteNode: storeDeleteNode,
    addEdge: storeAddEdge,
    deleteEdge: storeDeleteEdge,
    loading,
  } = useDiagramsStore();

  // LOCAL STATE - React Flow controls these directly
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track pending position saves with debounce
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const SAVE_DELAY = 800; // ms to wait after last position change before saving

  // Load diagram on mount
  useEffect(() => {
    loadDiagram(diagramId);
  }, [diagramId, loadDiagram]);

  // Initialize local state from store (only once when data loads)
  useEffect(() => {
    if (currentDiagram && !isInitialized) {
      setNodes(currentDiagram.nodes.map((n) => toFlowNode(n, resolvedNodeType)));
      setEdges(currentDiagram.edges.map(toFlowEdge));
      setIsInitialized(true);
    }
  }, [currentDiagram, resolvedNodeType, isInitialized]);

  // Reset initialization when diagram ID changes
  useEffect(() => {
    setIsInitialized(false);
  }, [diagramId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  const diagramName = currentDiagram?.diagram.name || "";

  // Handle node changes - update local state immediately, debounce saves
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));

    // Debounce position saves to backend
    for (const change of changes) {
      if (change.type === "position" && change.position && !change.dragging) {
        const nodeId = change.id;
        const pos = change.position;

        // Clear any existing timer for this node
        if (saveTimers.current[nodeId]) {
          clearTimeout(saveTimers.current[nodeId]);
        }

        // Set a new timer to save after inactivity
        saveTimers.current[nodeId] = setTimeout(() => {
          storeUpdateNode(nodeId, {
            position_x: pos.x,
            position_y: pos.y,
          }).catch((err) => console.error("Failed to save position:", err));
          delete saveTimers.current[nodeId];
        }, SAVE_DELAY);
      }
    }
  }, [storeUpdateNode]);

  // Handle edge changes - update local state
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Handle new connections
  const onConnect = useCallback(async (connection: Connection) => {
    if (connection.source && connection.target) {
      try {
        // Store handle info in style_data so connections render at correct positions
        const styleData = JSON.stringify({
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
        const newEdge = await storeAddEdge({
          diagram_id: diagramId,
          source_node_id: connection.source,
          target_node_id: connection.target,
          style_data: styleData,
        });
        // Add to local state
        setEdges((eds) => [...eds, toFlowEdge(newEdge)]);
      } catch (err) {
        console.error("Failed to create edge:", err);
      }
    }
  }, [diagramId, storeAddEdge]);

  // Node operations
  const addNode = useCallback(async (label: string, type?: string) => {
    try {
      const newNode = await storeAddNode({
        diagram_id: diagramId,
        node_type: type || "default",
        label,
        position_x: 250 + Math.random() * 100,
        position_y: 200 + Math.random() * 100,
      });
      // Add to local state
      setNodes((nds) => [...nds, toFlowNode(newNode, resolvedNodeType)]);
    } catch (err) {
      console.error("Failed to add node:", err);
    }
  }, [diagramId, storeAddNode, resolvedNodeType]);

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await storeDeleteNode(nodeId);
      // Remove from local state
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      // Also remove connected edges
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    } catch (err) {
      console.error("Failed to delete node:", err);
    }
  }, [storeDeleteNode]);

  const updateNodeLabel = useCallback(async (nodeId: string, label: string) => {
    try {
      await storeUpdateNode(nodeId, { label });
      // Update local state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        )
      );
    } catch (err) {
      console.error("Failed to update node label:", err);
    }
  }, [storeUpdateNode]);

  const updateNodeNotes = useCallback(async (nodeId: string, notes: string) => {
    try {
      await storeUpdateNode(nodeId, { notes: notes || null });
      // Update local state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, notes: notes || undefined } } : n
        )
      );
    } catch (err) {
      console.error("Failed to update node notes:", err);
    }
  }, [storeUpdateNode]);

  const updateNodeType = useCallback(async (nodeId: string, type: string) => {
    try {
      await storeUpdateNode(nodeId, { node_type: type });
      // Update local state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, nodeType: type } } : n
        )
      );
    } catch (err) {
      console.error("Failed to update node type:", err);
    }
  }, [storeUpdateNode]);

  // Update node media URLs (local state only - for display purposes)
  const updateNodeMedia = useCallback((nodeId: string, imageUrl?: string, videoUrl?: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, imageUrl, videoUrl } }
          : n
      )
    );
  }, []);

  // Edge operations
  const deleteEdge = useCallback(async (edgeId: string) => {
    try {
      await storeDeleteEdge(edgeId);
      // Remove from local state
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    } catch (err) {
      console.error("Failed to delete edge:", err);
    }
  }, [storeDeleteEdge]);

  // Diagram operations
  const updateDiagramName = useCallback(async (name: string) => {
    try {
      await updateDiagram(diagramId, { name });
    } catch (err) {
      console.error("Failed to update diagram name:", err);
    }
  }, [diagramId, updateDiagram]);

  return {
    nodes,
    edges,
    isLoading: loading,
    diagramName,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    updateNodeLabel,
    updateNodeNotes,
    updateNodeType,
    updateNodeMedia,
    deleteEdge,
    updateDiagramName,
  };
}
