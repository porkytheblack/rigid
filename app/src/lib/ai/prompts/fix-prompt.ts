// Fix Prompt Generator - Generates actionable prompts for coding AI agents
import type { FixPromptContext } from '../types';

export function buildFixPromptSystemPrompt(): string {
  return `You are a specialized assistant that generates clear, actionable bug fix prompts for coding AI agents (Claude Code, Cursor, Copilot, etc.).

## Your Task
Generate a structured, detailed prompt that a coding AI can use to fix the described issue. The prompt should be:
1. Clear and unambiguous
2. Include all relevant context
3. Specify expected behavior
4. Be immediately actionable

## Output Format
Generate the fix prompt in markdown format with these sections:
- **Issue Summary**: One-line description
- **Priority**: Critical/High/Medium/Low
- **Reproduction Steps**: If available
- **Current Behavior**: What's happening now
- **Expected Behavior**: What should happen
- **Relevant Context**: Files, components, or areas affected
- **Suggested Approach**: If obvious from the context

Do NOT include pleasantries or explanations to the user - output ONLY the fix prompt that can be copied directly.`;
}

export function buildFixPromptUserMessage(context: FixPromptContext): string {
  const parts: string[] = [];

  // Issue details
  parts.push(`## Issue #${context.issue.number}: ${context.issue.title}`);
  parts.push(`Priority: ${context.issue.priority}`);
  parts.push(`Status: ${context.issue.status}`);

  if (context.issue.description) {
    parts.push(`\nDescription:\n${context.issue.description}`);
  }

  // Linked exploration
  if (context.relatedExploration) {
    parts.push(`\nRelated Exploration: ${context.relatedExploration.name}`);
  }

  // Linked feature
  if (context.relatedFeature) {
    parts.push(`\nRelated Feature: ${context.relatedFeature.name}`);
    if (context.relatedFeature.description) {
      parts.push(`Feature Description: ${context.relatedFeature.description}`);
    }
  }

  // Screenshot evidence
  if (context.linkedScreenshot) {
    parts.push(`\n## Visual Evidence`);
    parts.push(`Screenshot: ${context.linkedScreenshot.title}`);
    if (context.linkedScreenshot.description) {
      parts.push(`Description: ${context.linkedScreenshot.description}`);
    }
  }

  // Screenshot markers (annotations on the screenshot)
  if (context.screenshotMarkers && context.screenshotMarkers.length > 0) {
    parts.push(`\nScreenshot Annotations:`);
    context.screenshotMarkers.forEach((marker, idx) => {
      parts.push(`${idx + 1}. [${marker.severity.toUpperCase()}] ${marker.title}`);
      if (marker.description) {
        parts.push(`   ${marker.description}`);
      }
    });
  }

  // Recording evidence
  if (context.linkedRecording) {
    parts.push(`\n## Recording Evidence`);
    parts.push(`Recording: ${context.linkedRecording.name}`);
    if (context.linkedRecording.duration_ms) {
      parts.push(`Duration: ${formatDuration(context.linkedRecording.duration_ms)}`);
    }
  }

  // Recording annotations
  if (context.annotations && context.annotations.length > 0) {
    parts.push(`\nRecording Annotations:`);
    context.annotations.forEach((annotation, idx) => {
      const timestamp = formatDuration(annotation.timestamp_ms);
      parts.push(`${idx + 1}. [${annotation.severity.toUpperCase()} at ${timestamp}] ${annotation.title}`);
      if (annotation.description) {
        parts.push(`   ${annotation.description}`);
      }
    });
  }

  parts.push(`\nGenerate a fix prompt for this issue that a coding AI can use directly.`);

  return parts.join('\n');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Generate a fix prompt for a specific issue
export function generateQuickFixPrompt(context: FixPromptContext): string {
  const parts: string[] = [];

  parts.push(`# Fix: ${context.issue.title}`);
  parts.push('');
  parts.push(`**Priority:** ${context.issue.priority.toUpperCase()}`);
  parts.push('');

  if (context.issue.description) {
    parts.push(`## Issue`);
    parts.push(context.issue.description);
    parts.push('');
  }

  if (context.screenshotMarkers && context.screenshotMarkers.length > 0) {
    parts.push(`## Visual Issues Found`);
    context.screenshotMarkers.forEach(marker => {
      parts.push(`- **${marker.title}**: ${marker.description || 'See screenshot'}`);
    });
    parts.push('');
  }

  if (context.annotations && context.annotations.length > 0) {
    const errors = context.annotations.filter(a => a.severity === 'error');
    if (errors.length > 0) {
      parts.push(`## Errors Observed`);
      errors.forEach(error => {
        parts.push(`- ${error.title}: ${error.description || 'See recording'}`);
      });
      parts.push('');
    }
  }

  parts.push(`## Task`);
  parts.push(`Investigate and fix the issue described above. Check related files and ensure the fix doesn't introduce regressions.`);

  return parts.join('\n');
}
