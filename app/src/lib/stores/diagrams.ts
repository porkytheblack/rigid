import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Diagram,
  DiagramFilter,
  NewDiagram,
  UpdateDiagram,
  DiagramWithData,
  DiagramNode,
  NewDiagramNode,
  UpdateDiagramNode,
  DiagramEdge,
  NewDiagramEdge,
  UpdateDiagramEdge,
  NodeAttachment,
  NewNodeAttachment,
} from '@/lib/tauri/types';
import { diagrams as diagramCommands } from '@/lib/tauri/commands';

interface DiagramsState {
  items: Diagram[];
  selectedId: string | null;
  currentDiagram: DiagramWithData | null;
  filter: DiagramFilter;
  loading: boolean;
  error: string | null;
}

interface DiagramsActions {
  load: () => Promise<void>;
  loadByExploration: (explorationId: string) => Promise<void>;
  loadByArchitectureDoc: (docId: string) => Promise<void>;
  loadDiagram: (id: string) => Promise<DiagramWithData>;
  setFilter: (filter: DiagramFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewDiagram) => Promise<Diagram>;
  update: (id: string, updates: UpdateDiagram) => Promise<Diagram>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Diagram | undefined;
  clearError: () => void;
  clearCurrentDiagram: () => void;

  // Node operations
  addNode: (node: NewDiagramNode) => Promise<DiagramNode>;
  updateNode: (id: string, updates: UpdateDiagramNode) => Promise<DiagramNode>;
  deleteNode: (id: string) => Promise<void>;
  bulkUpdateNodes: (updates: [string, UpdateDiagramNode][]) => Promise<void>;

  // Edge operations
  addEdge: (edge: NewDiagramEdge) => Promise<DiagramEdge>;
  updateEdge: (id: string, updates: UpdateDiagramEdge) => Promise<DiagramEdge>;
  deleteEdge: (id: string) => Promise<void>;

  // Attachment operations
  addAttachment: (attachment: NewNodeAttachment) => Promise<NodeAttachment>;
  deleteAttachment: (id: string) => Promise<void>;
  listAttachments: (nodeId: string) => Promise<NodeAttachment[]>;
}

type DiagramsStore = DiagramsState & DiagramsActions;

export const useDiagramsStore = create<DiagramsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    currentDiagram: null,
    filter: {},
    loading: false,
    error: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await diagramCommands.list(get().filter);
        set((state) => {
          state.items = items;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    loadByExploration: async (explorationId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.filter = { ...state.filter, test_id: explorationId };
      });

      try {
        const items = await diagramCommands.listByTest(explorationId);
        set((state) => {
          state.items = items;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    loadByArchitectureDoc: async (docId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.filter = { ...state.filter, architecture_doc_id: docId };
      });

      try {
        const items = await diagramCommands.listByArchitectureDoc(docId);
        set((state) => {
          state.items = items;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    loadDiagram: async (id: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const diagramWithData = await diagramCommands.getWithData(id);
        set((state) => {
          state.currentDiagram = diagramWithData;
          state.selectedId = id;
          state.loading = false;
        });
        return diagramWithData;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    setFilter: (filter) => {
      set((state) => {
        state.filter = filter;
      });
      get().load();
    },

    select: (id) => {
      set((state) => {
        state.selectedId = id;
      });
    },

    create: async (data) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const diagram = await diagramCommands.create(data);
        set((state) => {
          state.items.unshift(diagram);
          state.loading = false;
        });
        return diagram;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    update: async (id, updates) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as Diagram;
        }
        if (state.currentDiagram?.diagram.id === id) {
          state.currentDiagram.diagram = { ...state.currentDiagram.diagram, ...updates } as Diagram;
        }
      });

      try {
        const diagram = await diagramCommands.update(id, updates);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = diagram;
          }
          if (state.currentDiagram?.diagram.id === id) {
            state.currentDiagram.diagram = diagram;
          }
        });
        return diagram;
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    delete: async (id) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        state.items = state.items.filter((item) => item.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
        if (state.currentDiagram?.diagram.id === id) {
          state.currentDiagram = null;
        }
      });

      try {
        await diagramCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    getById: (id) => {
      return get().items.find((item) => item.id === id);
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    clearCurrentDiagram: () => {
      set((state) => {
        state.currentDiagram = null;
        state.selectedId = null;
      });
    },

    // Node operations
    addNode: async (node) => {
      try {
        const newNode = await diagramCommands.createNode(node);
        set((state) => {
          if (state.currentDiagram && state.currentDiagram.diagram.id === node.diagram_id) {
            state.currentDiagram.nodes.push(newNode);
          }
        });
        return newNode;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    updateNode: async (id, updates) => {
      try {
        const updatedNode = await diagramCommands.updateNode(id, updates);
        set((state) => {
          if (state.currentDiagram) {
            const index = state.currentDiagram.nodes.findIndex((n) => n.id === id);
            if (index !== -1) {
              state.currentDiagram.nodes[index] = updatedNode;
            }
          }
        });
        return updatedNode;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    deleteNode: async (id) => {
      try {
        await diagramCommands.deleteNode(id);
        set((state) => {
          if (state.currentDiagram) {
            state.currentDiagram.nodes = state.currentDiagram.nodes.filter((n) => n.id !== id);
            // Also remove edges connected to this node
            state.currentDiagram.edges = state.currentDiagram.edges.filter(
              (e) => e.source_node_id !== id && e.target_node_id !== id
            );
          }
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    bulkUpdateNodes: async (updates) => {
      try {
        await diagramCommands.bulkUpdateNodes(updates);
        // Reload diagram to get fresh data
        const current = get().currentDiagram;
        if (current) {
          await get().loadDiagram(current.diagram.id);
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    // Edge operations
    addEdge: async (edge) => {
      try {
        const newEdge = await diagramCommands.createEdge(edge);
        set((state) => {
          if (state.currentDiagram && state.currentDiagram.diagram.id === edge.diagram_id) {
            state.currentDiagram.edges.push(newEdge);
          }
        });
        return newEdge;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    updateEdge: async (id, updates) => {
      try {
        const updatedEdge = await diagramCommands.updateEdge(id, updates);
        set((state) => {
          if (state.currentDiagram) {
            const index = state.currentDiagram.edges.findIndex((e) => e.id === id);
            if (index !== -1) {
              state.currentDiagram.edges[index] = updatedEdge;
            }
          }
        });
        return updatedEdge;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    deleteEdge: async (id) => {
      try {
        await diagramCommands.deleteEdge(id);
        set((state) => {
          if (state.currentDiagram) {
            state.currentDiagram.edges = state.currentDiagram.edges.filter((e) => e.id !== id);
          }
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    // Attachment operations
    addAttachment: async (attachment) => {
      try {
        const newAttachment = await diagramCommands.createAttachment(attachment);
        return newAttachment;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    deleteAttachment: async (id) => {
      try {
        await diagramCommands.deleteAttachment(id);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    listAttachments: async (nodeId) => {
      try {
        return await diagramCommands.listAttachments(nodeId);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },
  }))
);
