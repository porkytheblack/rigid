"use client";

import { memo } from "react";
import { BaseNode, EditableLabel } from "./BaseNode";
import { InlineImage, InlineVideo } from "@/components/media";
import {
  Lightbulb,
  FileText,
  Database,
  Server,
  Globe,
  User,
  Cog,
  Zap,
  MessageSquare,
  FolderOpen,
  Box,
  Layout,
  type LucideIcon,
} from "lucide-react";

// Node type configuration with icons and colors
export interface NodeTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

// Available node types for graphs
export const nodeTypeConfig: Record<string, NodeTypeConfig> = {
  default: {
    label: "Node",
    icon: Box,
    color: "#6366f1",
    bgColor: "rgba(99, 102, 241, 0.12)",
  },
  idea: {
    label: "Idea",
    icon: Lightbulb,
    color: "#eab308",
    bgColor: "rgba(234, 179, 8, 0.12)",
  },
  note: {
    label: "Note",
    icon: FileText,
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.12)",
  },
  database: {
    label: "Database",
    icon: Database,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.12)",
  },
  server: {
    label: "Server",
    icon: Server,
    color: "#f97316",
    bgColor: "rgba(249, 115, 22, 0.12)",
  },
  api: {
    label: "API",
    icon: Globe,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.12)",
  },
  user: {
    label: "User",
    icon: User,
    color: "#06b6d4",
    bgColor: "rgba(6, 182, 212, 0.12)",
  },
  service: {
    label: "Service",
    icon: Cog,
    color: "#f43f5e",
    bgColor: "rgba(244, 63, 94, 0.12)",
  },
  action: {
    label: "Action",
    icon: Zap,
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.12)",
  },
  message: {
    label: "Message",
    icon: MessageSquare,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.12)",
  },
  folder: {
    label: "Folder",
    icon: FolderOpen,
    color: "#84cc16",
    bgColor: "rgba(132, 204, 22, 0.12)",
  },
  component: {
    label: "Component",
    icon: Layout,
    color: "#ec4899",
    bgColor: "rgba(236, 72, 153, 0.12)",
  },
};

// Get node type names for UI
export const nodeTypeNames = Object.keys(nodeTypeConfig);

// Node data interface
export interface GraphNodeData {
  label: string;
  notes?: string;
  nodeType?: string;
  // Media attachments
  imageUrl?: string;
  videoUrl?: string;
  // Optional custom styling override
  color?: string;
}

// Custom node component props
interface CustomNodeProps {
  data: GraphNodeData;
  selected: boolean;
}

// Unified Graph Node - renders based on nodeType
export const GraphNode = memo(function GraphNode({ data, selected }: CustomNodeProps) {
  const nodeType = data.nodeType || "default";
  const config = nodeTypeConfig[nodeType] || nodeTypeConfig.default;
  const color = data.color || config.color;
  const bgColor = config.bgColor;
  const Icon = config.icon;

  const hasMedia = data.imageUrl || data.videoUrl;

  return (
    <BaseNode
      data={{ ...data, color, bgColor }}
      selected={selected}
      style={{
        backgroundColor: bgColor,
        borderLeft: `3px solid ${color}`,
        minWidth: hasMedia ? 200 : 160,
        maxWidth: 280,
      }}
    >
      {/* Media Preview */}
      {hasMedia && (
        <div className="border-b border-white/10">
          {data.imageUrl && (
            <InlineImage
              src={data.imageUrl}
              alt={data.label}
              className="w-full h-32 object-cover"
            />
          )}
          {data.videoUrl && !data.imageUrl && (
            <InlineVideo
              src={data.videoUrl}
              className="w-full h-32"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <Icon
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color }}
          />
          <div className="flex-1 min-w-0">
            <EditableLabel
              label={data.label}
              className="text-[13px] font-medium text-white"
            />
            {data.notes && (
              <p className="text-[11px] text-white/60 mt-1 line-clamp-2">
                {data.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

// Export node types map for React Flow - simplified to single type
export const graphNodeTypes = {
  graph: GraphNode,
};

// Legacy exports for backward compatibility during migration
export const architectureNodeTypes = {
  architecture: GraphNode,
  graph: GraphNode,
};

export const explorationNodeTypes = {
  mindmap: GraphNode,
  flow: GraphNode,
  dependency: GraphNode,
  graph: GraphNode,
};

// Legacy type exports for compatibility
export type ArchNodeType = "default" | "graph";
export interface ArchitectureNodeData extends GraphNodeData {}
export interface MindMapNodeData extends GraphNodeData {}
export interface FlowNodeData extends GraphNodeData {}
export interface DependencyNodeData extends GraphNodeData {}
