// Session Resumption - Analyze recent activity and suggest next steps
import type { SessionSummary, ContextData } from '../types';

export function buildSessionResumeSystemPrompt(): string {
  return `You are Rigid, helping users pick up where they left off in their QA and documentation work.

## Your Task
Analyze the user's recent activity and the current context to suggest what they should work on next.

## Guidelines
1. Be specific and actionable - don't just say "continue working"
2. Prioritize by impact - critical issues before nice-to-haves
3. Consider the flow - what naturally comes next?
4. Be concise - 3-5 actionable suggestions maximum

## Output Format
Provide a brief summary of recent activity followed by numbered suggestions for next steps.
Each suggestion should explain WHY it's a good next step.`;
}

export function buildSessionResumeUserMessage(context: ContextData, summary?: SessionSummary): string {
  const parts: string[] = [];

  parts.push(`## Current Context`);

  if (context.app) {
    parts.push(`App: ${context.app.name}`);
  }

  if (context.exploration) {
    parts.push(`Current Exploration: ${context.exploration.name} (${context.exploration.status})`);
  }

  // Issues summary
  if (context.issues && context.issues.length > 0) {
    const openIssues = context.issues.filter(i => i.status === 'open');
    const inProgressIssues = context.issues.filter(i => i.status === 'in_progress');
    const criticalIssues = context.issues.filter(i => i.priority === 'critical' && i.status !== 'closed');

    parts.push(`\n## Issues Overview`);
    parts.push(`- Total issues: ${context.issues.length}`);
    parts.push(`- Open: ${openIssues.length}`);
    parts.push(`- In Progress: ${inProgressIssues.length}`);

    if (criticalIssues.length > 0) {
      parts.push(`\n### Critical Issues (${criticalIssues.length})`);
      criticalIssues.forEach(issue => {
        parts.push(`- #${issue.number}: ${issue.title} (${issue.status})`);
      });
    }
  }

  // Features summary
  if (context.features && context.features.length > 0) {
    const inProgressFeatures = context.features.filter(f => f.status === 'in_progress');
    const plannedFeatures = context.features.filter(f => f.status === 'planned');

    parts.push(`\n## Features Overview`);
    parts.push(`- Total features: ${context.features.length}`);
    parts.push(`- In Progress: ${inProgressFeatures.length}`);
    parts.push(`- Planned: ${plannedFeatures.length}`);

    if (inProgressFeatures.length > 0) {
      parts.push(`\n### In-Progress Features`);
      inProgressFeatures.forEach(feature => {
        parts.push(`- ${feature.name}: ${feature.description || 'No description'}`);
      });
    }
  }

  // Checklist summary
  if (context.checklistItems && context.checklistItems.length > 0) {
    const untestedItems = context.checklistItems.filter(c => c.status === 'untested');
    const failingItems = context.checklistItems.filter(c => c.status === 'failing');

    if (untestedItems.length > 0 || failingItems.length > 0) {
      parts.push(`\n## Checklist Status`);
      parts.push(`- Untested items: ${untestedItems.length}`);
      parts.push(`- Failing items: ${failingItems.length}`);

      if (failingItems.length > 0) {
        parts.push(`\n### Failing Items`);
        failingItems.slice(0, 5).forEach(item => {
          parts.push(`- ${item.title}`);
        });
      }
    }
  }

  // Session history if available
  if (summary) {
    if (summary.recentlyEditedItems.length > 0) {
      parts.push(`\n## Recently Edited`);
      summary.recentlyEditedItems.slice(0, 5).forEach(item => {
        parts.push(`- ${item.type}: ${item.title}`);
      });
    }

    if (summary.incompleteWork.length > 0) {
      parts.push(`\n## Potentially Incomplete Work`);
      summary.incompleteWork.forEach(item => {
        parts.push(`- ${item.title} (${item.reason})`);
      });
    }
  }

  parts.push(`\n## Request`);
  parts.push(`Based on the above context, suggest what I should work on next. Prioritize by importance and consider what logically flows from recent activity.`);

  return parts.join('\n');
}

// Quick resume suggestions for the dashboard
export function generateQuickResumeSuggestions(context: ContextData): string[] {
  const suggestions: string[] = [];

  // Critical issues first
  const criticalIssues = context.issues?.filter(i =>
    i.priority === 'critical' && (i.status === 'open' || i.status === 'in_progress')
  ) || [];

  if (criticalIssues.length > 0) {
    suggestions.push(`Address ${criticalIssues.length} critical issue${criticalIssues.length > 1 ? 's' : ''}`);
  }

  // Failing checklist items
  const failingItems = context.checklistItems?.filter(c => c.status === 'failing') || [];
  if (failingItems.length > 0) {
    suggestions.push(`Review ${failingItems.length} failing checklist item${failingItems.length > 1 ? 's' : ''}`);
  }

  // In-progress features
  const inProgressFeatures = context.features?.filter(f => f.status === 'in_progress') || [];
  if (inProgressFeatures.length > 0) {
    const feature = inProgressFeatures[0];
    suggestions.push(`Continue work on "${feature.name}"`);
  }

  // Draft explorations
  if (context.exploration?.status === 'draft') {
    suggestions.push(`Complete exploration "${context.exploration.name}"`);
  }

  // Untested items
  const untestedItems = context.checklistItems?.filter(c => c.status === 'untested') || [];
  if (untestedItems.length > 0 && suggestions.length < 5) {
    suggestions.push(`Test ${untestedItems.length} untested item${untestedItems.length > 1 ? 's' : ''}`);
  }

  return suggestions;
}
