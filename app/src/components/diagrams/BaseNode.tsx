"use client";

import { memo, useState, useRef, useEffect, ReactNode } from "react";
import { Handle, Position, useStore } from "@xyflow/react";

export interface BaseNodeData {
  label: string;
  notes?: string;
  color: string;
  bgColor: string;
  onLabelChange?: (label: string) => void;
}

interface BaseNodeProps {
  data: BaseNodeData;
  selected: boolean;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showHandles?: boolean;
}

// Shared handle component that provides both source and target at each position
function NodeHandles({ color, visible }: { color: string; visible: boolean }) {
  const baseStyle: React.CSSProperties = {
    background: color,
    width: 10,
    height: 10,
    border: "2px solid rgba(255, 255, 255, 0.8)",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
    transform: visible ? "scale(1)" : "scale(0.5)",
  };

  return (
    <>
      {/* Each position has both source and target handles with unique IDs */}
      <Handle id="top-target" type="target" position={Position.Top} style={baseStyle} />
      <Handle id="top-source" type="source" position={Position.Top} style={baseStyle} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={baseStyle} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={baseStyle} />
      <Handle id="left-target" type="target" position={Position.Left} style={baseStyle} />
      <Handle id="left-source" type="source" position={Position.Left} style={baseStyle} />
      <Handle id="right-target" type="target" position={Position.Right} style={baseStyle} />
      <Handle id="right-source" type="source" position={Position.Right} style={baseStyle} />
    </>
  );
}

// Editable label component
function EditableLabel({
  label,
  onLabelChange,
  className = "",
}: {
  label: string;
  onLabelChange?: (label: string) => void;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(label);
  }, [label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (onLabelChange && editValue.trim() && editValue !== label) {
      onLabelChange(editValue.trim());
    } else {
      setEditValue(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(label);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-transparent outline-none w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={className}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: "text" }}
    >
      {label}
    </span>
  );
}

// Base node wrapper - provides consistent structure
export const BaseNode = memo(function BaseNode({
  data,
  selected,
  children,
  className = "",
  style = {},
  showHandles = true,
}: BaseNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Check if we're currently connecting (dragging an edge)
  const isConnecting = useStore((state) => state.connection.inProgress);

  // Show handles when: hovering, selected, or connecting
  const handlesVisible = isHovered || selected || isConnecting;

  return (
    <div
      className={`relative transition-shadow ${selected ? "ring-2 ring-white/80" : ""} ${className}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showHandles && <NodeHandles color={data.color} visible={handlesVisible} />}
      {children}
    </div>
  );
});

export { EditableLabel, NodeHandles };
