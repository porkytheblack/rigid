// Context Service - Gathers context from stores based on current route
import type { Route } from '@/lib/stores/router';
import type { ContextData, Citation, CitationType } from './types';
import {
  apps as appsCommands,
  tests as testsCommands,
  screenshots as screenshotsCommands,
  recordings as recordingsCommands,
  annotations as annotationsCommands,
  issues as issuesCommands,
  features as featuresCommands,
  checklist as checklistCommands,
  documentBlocks as documentBlocksCommands,
  architectureDocs as architectureDocsCommands,
  diagrams as diagramsCommands,
  demos as demosCommands,
} from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

// =============================================================================
// Context Gathering
// =============================================================================

export async function gatherContextForRoute(route: Route): Promise<ContextData> {
  const context: ContextData = { route: deepClone(route) };

  try {
    switch (route.name) {
      case 'home': {
        // Home view - no specific app selected, general context
        // Don't auto-select first app - user is at the home/app selection level
        break;
      }

      case 'app': {
        // App view - gather app details (no specific exploration selected)
        context.app = deepClone(await appsCommands.get(route.appId));
        // Don't set exploration - we're at the app level, not in a specific exploration
        // Gather app-wide data
        context.issues = deepClone(await issuesCommands.list({ limit: 20 }));
        context.features = deepClone(await featuresCommands.list({ app_id: route.appId }));
        break;
      }

      case 'exploration': {
        // Exploration view - gather full exploration data
        context.app = deepClone(await appsCommands.get(route.appId));
        context.exploration = deepClone(await testsCommands.get(route.explorationId));

        // Gather all exploration content - clone immediately to avoid frozen objects
        const [screenshots, recordings, issues, checklistItems, documentBlocks, diagrams] = await Promise.all([
          screenshotsCommands.list({ test_id: route.explorationId }),
          recordingsCommands.list({ test_id: route.explorationId }),
          issuesCommands.list({ test_id: route.explorationId }),
          checklistCommands.list({ test_id: route.explorationId }),
          documentBlocksCommands.list(route.explorationId),
          diagramsCommands.list({ test_id: route.explorationId }),
        ]);

        // Deep clone all arrays to ensure they're mutable
        context.screenshots = deepClone(screenshots);
        context.recordings = deepClone(recordings);
        context.issues = deepClone(issues);
        context.checklistItems = deepClone(checklistItems);
        context.documentBlocks = deepClone(documentBlocks);

        // Build lookup maps from cloned data (not frozen originals)
        context.screenshotMap = new Map(context.screenshots.map(s => [s.id, s]));
        context.recordingMap = new Map(context.recordings.map(r => [r.id, r]));

        // Gather screenshot markers for each screenshot
        if (screenshots.length > 0) {
          const markersArrays = await Promise.all(
            screenshots.map((s) => screenshotsCommands.listMarkers(s.id))
          );
          context.screenshotMarkers = deepClone(markersArrays.flat());
        }

        // Gather annotations for each recording
        if (recordings.length > 0) {
          const annotationsArrays = await Promise.all(
            recordings.map((r) => annotationsCommands.list(r.id))
          );
          context.annotations = deepClone(annotationsArrays.flat());
        }

        // Get diagram data
        if (diagrams.length > 0) {
          const diagramsData = await Promise.all(
            diagrams.map((d) => diagramsCommands.getWithData(d.id))
          );
          context.diagrams = deepClone(diagramsData);
        }
        break;
      }

      case 'screenshot-editor': {
        context.app = deepClone(await appsCommands.get(route.appId));
        context.exploration = deepClone(await testsCommands.get(route.explorationId));
        const screenshot = await screenshotsCommands.get(route.screenshotId);
        context.screenshots = [deepClone(screenshot)];
        context.screenshotMarkers = deepClone(await screenshotsCommands.listMarkers(route.screenshotId));
        break;
      }

      case 'video-editor': {
        context.app = deepClone(await appsCommands.get(route.appId));
        context.exploration = deepClone(await testsCommands.get(route.explorationId));
        const recording = await recordingsCommands.get(route.recordingId);
        context.recordings = [deepClone(recording)];
        context.annotations = deepClone(await annotationsCommands.list(route.recordingId));
        break;
      }

      case 'architecture-doc': {
        context.app = deepClone(await appsCommands.get(route.appId));
        context.architectureDoc = deepClone(await architectureDocsCommands.getWithBlocks(route.docId));
        // Get diagrams associated with this architecture doc
        const archDiagrams = await diagramsCommands.list({ architecture_doc_id: route.docId });
        if (archDiagrams.length > 0) {
          const diagramsData = await Promise.all(
            archDiagrams.map((d) => diagramsCommands.getWithData(d.id))
          );
          context.diagrams = deepClone(diagramsData);
        }
        break;
      }

      case 'features-kanban': {
        context.app = deepClone(await appsCommands.get(route.appId));
        context.features = deepClone(await featuresCommands.list({ app_id: route.appId }));
        break;
      }

      case 'demo-view':
      case 'demo-editor': {
        context.app = deepClone(await appsCommands.get(route.appId));
        try {
          context.demoWithData = deepClone(await demosCommands.getWithData(route.demoId));
          context.demo = context.demoWithData?.demo;
        } catch {
          // Demo might not exist yet
          context.demo = deepClone(await demosCommands.get(route.demoId));
        }
        break;
      }

      case 'demo-video-editor': {
        context.app = deepClone(await appsCommands.get(route.appId));
        try {
          context.demoWithData = deepClone(await demosCommands.getWithData(route.demoId));
          context.demo = context.demoWithData?.demo;
        } catch {
          context.demo = deepClone(await demosCommands.get(route.demoId));
        }
        break;
      }

      case 'settings': {
        // No specific context for settings
        break;
      }

      default: {
        // For other routes, try to get basic app context if available
        if ('appId' in route) {
          context.app = deepClone(await appsCommands.get((route as { appId: string }).appId));
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error gathering context:', error);
  }

  return context;
}

// =============================================================================
// Context Formatting
// =============================================================================

export function formatContextAsPrompt(context: ContextData): string {
  const sections: string[] = [];

  // App info
  if (context.app) {
    sections.push(`## App: ${context.app.name}
${context.app.description || 'No description'}
${context.app.requirements ? `\nRequirements: ${context.app.requirements}` : ''}`);
  }

  // Current location
  sections.push(`## Current Location: ${formatRoute(context.route)}`);

  // Exploration info
  if (context.exploration) {
    sections.push(`## Current Exploration: ${context.exploration.name}
Status: ${context.exploration.status}
Created: ${formatDate(context.exploration.created_at)}`);
  }

  // Documentation
  if (context.documentBlocks && context.documentBlocks.length > 0) {
    const docContent = [...context.documentBlocks]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(block => formatDocumentBlock(block))
      .join('\n');
    sections.push(`## Documentation\n${docContent}`);
  }

  // Architecture documentation
  if (context.architectureDoc) {
    const archBlocks = [...context.architectureDoc.blocks]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(block => formatArchitectureBlock(block))
      .join('\n');
    sections.push(`## Architecture: ${context.architectureDoc.doc.name}\n${archBlocks}`);
  }

  // Screenshots
  if (context.screenshots && context.screenshots.length > 0) {
    const screenshotList = context.screenshots
      .map(s => `- [Screenshot: ${s.title}] ${s.description || 'No description'}`)
      .join('\n');
    sections.push(`## Screenshots (${context.screenshots.length})\n${screenshotList}`);
  }

  // Screenshot Markers (annotations on screenshots)
  if (context.screenshotMarkers && context.screenshotMarkers.length > 0) {
    const markerList = context.screenshotMarkers
      .map(m => {
        const screenshot = context.screenshotMap?.get(m.screenshot_id);
        const screenshotRef = screenshot ? ` on [Screenshot: ${screenshot.title}]` : '';
        return `- [${m.severity.toUpperCase()}${screenshotRef}] ${m.title}: ${m.description || 'No description'}`;
      })
      .join('\n');
    sections.push(`## Screenshot Annotations (${context.screenshotMarkers.length})\n${markerList}`);
  }

  // Recordings
  if (context.recordings && context.recordings.length > 0) {
    const recordingList = context.recordings
      .map(r => `- [Recording: ${r.name}] Duration: ${r.duration_ms ? formatDuration(r.duration_ms) : 'Unknown'}`)
      .join('\n');
    sections.push(`## Recordings (${context.recordings.length})\n${recordingList}`);
  }

  // Annotations (on recordings/videos)
  if (context.annotations && context.annotations.length > 0) {
    const annotationList = context.annotations
      .map(a => {
        const recording = context.recordingMap?.get(a.recording_id);
        const recordingRef = recording ? ` in [Recording: ${recording.name}]` : '';
        return `- [${a.severity.toUpperCase()} at ${formatDuration(a.timestamp_ms)}${recordingRef}] ${a.title}: ${a.description || 'No description'}`;
      })
      .join('\n');
    sections.push(`## Recording Annotations (${context.annotations.length})\n${annotationList}`);
  }

  // Issues (with linked screenshot/recording info)
  if (context.issues && context.issues.length > 0) {
    const issueList = context.issues
      .map(i => {
        const linkedItems: string[] = [];
        if (i.screenshot_id) {
          const screenshot = context.screenshotMap?.get(i.screenshot_id);
          linkedItems.push(screenshot ? `Screenshot: ${screenshot.title}` : 'Screenshot attached');
        }
        if (i.recording_id) {
          const recording = context.recordingMap?.get(i.recording_id);
          linkedItems.push(recording ? `Recording: ${recording.name}` : 'Recording attached');
        }
        const linkedInfo = linkedItems.length > 0 ? ` [${linkedItems.join(', ')}]` : '';
        return `- [Issue #${i.number}: ${i.priority.toUpperCase()}] ${i.title} (${i.status})${linkedInfo}`;
      })
      .join('\n');
    sections.push(`## Issues (${context.issues.length})\n${issueList}`);
  }

  // Features
  if (context.features && context.features.length > 0) {
    const featureList = context.features
      .map(f => `- [Feature: ${f.status}] ${f.name}: ${f.description || 'No description'}`)
      .join('\n');
    sections.push(`## Features (${context.features.length})\n${featureList}`);
  }

  // Checklist
  if (context.checklistItems && context.checklistItems.length > 0) {
    const checklistList = context.checklistItems
      .map(c => `- [${c.status.toUpperCase()}] ${c.title}`)
      .join('\n');
    sections.push(`## Checklist (${context.checklistItems.length})\n${checklistList}`);
  }

  // Diagrams
  if (context.diagrams && context.diagrams.length > 0) {
    const diagramList = context.diagrams
      .map(d => `- [${d.diagram.diagram_type}] ${d.diagram.name} (${d.nodes.length} nodes, ${d.edges.length} edges)`)
      .join('\n');
    sections.push(`## Diagrams (${context.diagrams.length})\n${diagramList}`);
  }

  // Demo
  if (context.demo) {
    const demoInfo = `## Demo: ${context.demo.name}
Format: ${context.demo.format} (${context.demo.width}x${context.demo.height})
Duration: ${formatDuration(context.demo.duration_ms)}
Frame Rate: ${context.demo.frame_rate} fps`;
    sections.push(demoInfo);

    // Include demo tracks and clips if available
    if (context.demoWithData) {
      const { tracks, clips, background } = context.demoWithData;
      if (tracks.length > 0) {
        const trackList = tracks
          .map(t => `- [Track: ${t.track_type}] ${t.name || 'Unnamed'}`)
          .join('\n');
        sections.push(`### Demo Tracks (${tracks.length})\n${trackList}`);
      }
      if (clips.length > 0) {
        const clipList = clips
          .slice(0, 20) // Limit to avoid huge context
          .map(c => `- [Clip: ${c.source_type}] ${c.name} (${formatDuration(c.start_time_ms)}-${formatDuration(c.start_time_ms + c.duration_ms)})`)
          .join('\n');
        sections.push(`### Demo Clips (${clips.length})\n${clipList}`);
      }
      if (background) {
        sections.push(`### Background: ${background.background_type}`);
      }
    }
  }

  return sections.join('\n\n');
}

// =============================================================================
// Citation Extraction
// =============================================================================

const CITATION_PATTERN = /\[([^\]:]+):\s*([^\]]+)\]/g;

export function extractCitationsFromResponse(response: string, context: ContextData): Citation[] {
  const citations: Citation[] = [];
  const matches = response.matchAll(CITATION_PATTERN);

  for (const match of matches) {
    const [, typeStr, title] = match;
    const type = mapStringToType(typeStr.toLowerCase().trim());
    if (!type) continue;

    const citation = findSourceByTypeAndTitle(type, title.trim(), context);
    if (citation && !citations.some(c => c.id === citation.id && c.type === citation.type)) {
      citations.push(citation);
    }
  }

  return citations;
}

function mapStringToType(str: string): CitationType | null {
  const typeMap: Record<string, CitationType> = {
    'screenshot': 'screenshot',
    'recording': 'recording',
    'annotation': 'annotation',
    'issue': 'issue',
    'feature': 'feature',
    'exploration': 'exploration',
    'architecture': 'architecture_doc',
    'architecture_doc': 'architecture_doc',
    'document': 'document',
    'doc': 'document',
    'diagram': 'diagram',
    'checklist': 'checklist',
    'info': 'annotation',
    'warning': 'annotation',
    'error': 'annotation',
    'success': 'annotation',
  };
  return typeMap[str] || null;
}

function findSourceByTypeAndTitle(type: CitationType, title: string, context: ContextData): Citation | null {
  const titleLower = title.toLowerCase();

  switch (type) {
    case 'screenshot': {
      const screenshot = context.screenshots?.find(s => s.title.toLowerCase().includes(titleLower));
      if (screenshot && context.exploration) {
        return {
          type: 'screenshot',
          id: screenshot.id,
          title: screenshot.title,
          snippet: screenshot.description || undefined,
          route: {
            name: 'screenshot-editor',
            appId: context.app?.id || '',
            explorationId: context.exploration.id,
            screenshotId: screenshot.id,
          },
        };
      }
      break;
    }

    case 'recording': {
      const recording = context.recordings?.find(r => r.name.toLowerCase().includes(titleLower));
      if (recording && context.exploration) {
        return {
          type: 'recording',
          id: recording.id,
          title: recording.name,
          route: {
            name: 'video-editor',
            appId: context.app?.id || '',
            explorationId: context.exploration.id,
            recordingId: recording.id,
          },
        };
      }
      break;
    }

    case 'annotation': {
      const annotation = context.annotations?.find(a => a.title.toLowerCase().includes(titleLower));
      const marker = context.screenshotMarkers?.find(m => m.title.toLowerCase().includes(titleLower));
      if (annotation) {
        return {
          type: 'annotation',
          id: annotation.id,
          title: annotation.title,
          snippet: annotation.description || undefined,
        };
      }
      if (marker) {
        return {
          type: 'annotation',
          id: marker.id,
          title: marker.title,
          snippet: marker.description || undefined,
        };
      }
      break;
    }

    case 'issue': {
      const issue = context.issues?.find(i =>
        i.title.toLowerCase().includes(titleLower) ||
        `#${i.number}` === title
      );
      if (issue) {
        return {
          type: 'issue',
          id: issue.id,
          title: `#${issue.number}: ${issue.title}`,
          snippet: issue.description || undefined,
        };
      }
      break;
    }

    case 'feature': {
      const feature = context.features?.find(f => f.name.toLowerCase().includes(titleLower));
      if (feature && context.app) {
        return {
          type: 'feature',
          id: feature.id,
          title: feature.name,
          snippet: feature.description || undefined,
          route: {
            name: 'features-kanban',
            appId: context.app.id,
          },
        };
      }
      break;
    }

    case 'exploration': {
      if (context.exploration?.name.toLowerCase().includes(titleLower)) {
        return {
          type: 'exploration',
          id: context.exploration.id,
          title: context.exploration.name,
          route: {
            name: 'exploration',
            appId: context.app?.id || '',
            explorationId: context.exploration.id,
          },
        };
      }
      break;
    }

    case 'architecture_doc': {
      if (context.architectureDoc?.doc.name.toLowerCase().includes(titleLower)) {
        return {
          type: 'architecture_doc',
          id: context.architectureDoc.doc.id,
          title: context.architectureDoc.doc.name,
          route: {
            name: 'architecture-doc',
            appId: context.app?.id || '',
            docId: context.architectureDoc.doc.id,
          },
        };
      }
      break;
    }
  }

  return null;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

export function formatRoute(route: Route): string {
  switch (route.name) {
    case 'home':
      return 'Home';
    case 'app':
      return 'App Overview';
    case 'exploration':
      return `Exploration${route.tab ? ` (${route.tab})` : ''}`;
    case 'screenshot-editor':
      return 'Screenshot Editor';
    case 'video-editor':
      return 'Video Editor';
    case 'diagram-editor':
      return 'Diagram Editor';
    case 'architecture-doc':
      return 'Architecture Document';
    case 'architecture-diagram-editor':
      return 'Architecture Diagram Editor';
    case 'features-kanban':
      return 'Features Kanban';
    case 'demo-view':
      return 'Demo View';
    case 'demo-editor':
      return 'Demo Editor';
    case 'demo-video-editor':
      return 'Demo Video Editor';
    case 'settings':
      return 'Settings';
    default: {
      // Exhaustive check - should never reach here
      const _exhaustive: never = route;
      return String(_exhaustive);
    }
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatDocumentBlock(block: import('@/lib/tauri/types').DocumentBlock): string {
  const prefix = '  '.repeat(block.indent_level);
  switch (block.block_type) {
    case 'heading1':
      return `${prefix}# ${block.content}`;
    case 'heading2':
      return `${prefix}## ${block.content}`;
    case 'heading3':
      return `${prefix}### ${block.content}`;
    case 'quote':
      return `${prefix}> ${block.content}`;
    case 'code':
      return `${prefix}\`\`\`${block.language || ''}\n${prefix}${block.content}\n${prefix}\`\`\``;
    case 'callout':
      return `${prefix}[${block.callout_type?.toUpperCase() || 'INFO'}] ${block.content}`;
    case 'divider':
      return `${prefix}---`;
    case 'todo':
      return `${prefix}- [${block.checked ? 'x' : ' '}] ${block.content}`;
    case 'bulletList':
      return `${prefix}- ${block.content}`;
    case 'numberedList':
      return `${prefix}1. ${block.content}`;
    default:
      return `${prefix}${block.content}`;
  }
}

function formatArchitectureBlock(block: import('@/lib/tauri/types').ArchitectureDocBlock): string {
  const prefix = '  '.repeat(block.indent_level);
  if (block.block_type === 'mermaid' && block.mermaid_code) {
    return `${prefix}\`\`\`mermaid\n${block.mermaid_code}\n\`\`\``;
  }
  // Use same formatting as document blocks - cast to compatible type
  return formatDocumentBlock(block as unknown as import('@/lib/tauri/types').DocumentBlock);
}

// =============================================================================
// Context Summary (for display)
// =============================================================================

export function getContextSummary(context: ContextData): string {
  const parts: string[] = [];

  if (context.app) {
    parts.push(context.app.name);
  }

  // Add location indicator based on route
  if (context.exploration) {
    parts.push(context.exploration.name);
  } else if (context.architectureDoc) {
    parts.push(context.architectureDoc.doc.name);
  } else if (context.demo) {
    parts.push(context.demo.name);
  } else if (context.route.name === 'app') {
    parts.push('Overview');
  } else if (context.route.name === 'features-kanban') {
    parts.push('Features');
  } else if (context.route.name === 'home') {
    parts.push('Home');
  }

  const counts: string[] = [];
  if (context.screenshots?.length) counts.push(`${context.screenshots.length} screenshots`);
  if (context.recordings?.length) counts.push(`${context.recordings.length} recordings`);
  if (context.annotations?.length) counts.push(`${context.annotations.length} annotations`);
  if (context.issues?.length) counts.push(`${context.issues.length} issues`);
  if (context.features?.length) counts.push(`${context.features.length} features`);

  if (counts.length > 0) {
    parts.push(`(${counts.join(', ')})`);
  }

  return parts.join(' > ') || 'No context';
}
