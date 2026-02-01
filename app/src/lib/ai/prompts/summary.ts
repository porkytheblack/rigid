// Exploration Summary - Generate executive summaries
import type { ContextData } from '../types';

export function buildSummarySystemPrompt(): string {
  return `You are Rigid, generating executive summaries of exploration sessions for the QA and documentation platform.

## Your Task
Create a concise, professional summary of the exploration that can be shared with team members or used for future reference.

## Summary Structure
1. **Overview** (1-2 sentences): What was explored and why
2. **Key Findings**: Important discoveries, issues found, observations
3. **Metrics**: Quantitative data (issues found, tests passed/failed, coverage)
4. **Recommendations**: Suggested next steps or areas needing attention

## Guidelines
- Be concise - aim for 2-3 paragraphs maximum
- Focus on actionable insights
- Use professional language suitable for team communication
- Highlight critical issues prominently
- Include both positives and areas for improvement`;
}

export function buildSummaryUserMessage(context: ContextData): string {
  const parts: string[] = [];

  if (!context.exploration) {
    return 'No exploration is currently selected. Please navigate to an exploration to generate a summary.';
  }

  parts.push(`## Exploration: ${context.exploration.name}`);
  parts.push(`Status: ${context.exploration.status}`);
  parts.push(`Created: ${formatDate(context.exploration.created_at)}`);

  if (context.app) {
    parts.push(`App: ${context.app.name}`);
  }

  // Content counts
  parts.push(`\n## Content Summary`);
  parts.push(`- Screenshots: ${context.screenshots?.length || 0}`);
  parts.push(`- Recordings: ${context.recordings?.length || 0}`);
  parts.push(`- Annotations: ${(context.annotations?.length || 0) + (context.screenshotMarkers?.length || 0)}`);
  parts.push(`- Document blocks: ${context.documentBlocks?.length || 0}`);
  parts.push(`- Diagrams: ${context.diagrams?.length || 0}`);

  // Issues breakdown
  if (context.issues && context.issues.length > 0) {
    parts.push(`\n## Issues Found (${context.issues.length})`);

    const byPriority = {
      critical: context.issues.filter(i => i.priority === 'critical').length,
      high: context.issues.filter(i => i.priority === 'high').length,
      medium: context.issues.filter(i => i.priority === 'medium').length,
      low: context.issues.filter(i => i.priority === 'low').length,
    };

    parts.push(`- Critical: ${byPriority.critical}`);
    parts.push(`- High: ${byPriority.high}`);
    parts.push(`- Medium: ${byPriority.medium}`);
    parts.push(`- Low: ${byPriority.low}`);

    // List critical and high priority issues
    const importantIssues = context.issues.filter(i =>
      i.priority === 'critical' || i.priority === 'high'
    );

    if (importantIssues.length > 0) {
      parts.push(`\n### Important Issues`);
      importantIssues.forEach(issue => {
        parts.push(`- [${issue.priority.toUpperCase()}] #${issue.number}: ${issue.title}`);
        if (issue.description) {
          parts.push(`  ${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}`);
        }
      });
    }
  }

  // Checklist status
  if (context.checklistItems && context.checklistItems.length > 0) {
    parts.push(`\n## Checklist Status`);

    const byStatus = {
      passing: context.checklistItems.filter(c => c.status === 'passing').length,
      failing: context.checklistItems.filter(c => c.status === 'failing').length,
      untested: context.checklistItems.filter(c => c.status === 'untested').length,
      blocked: context.checklistItems.filter(c => c.status === 'blocked').length,
      skipped: context.checklistItems.filter(c => c.status === 'skipped').length,
    };

    parts.push(`- Passing: ${byStatus.passing}`);
    parts.push(`- Failing: ${byStatus.failing}`);
    parts.push(`- Untested: ${byStatus.untested}`);
    parts.push(`- Blocked: ${byStatus.blocked}`);
    parts.push(`- Skipped: ${byStatus.skipped}`);

    const total = context.checklistItems.length;
    const completed = byStatus.passing + byStatus.skipped;
    const coverage = total > 0 ? Math.round((completed / total) * 100) : 0;
    parts.push(`\nCoverage: ${coverage}%`);
  }

  // Annotations summary
  if ((context.annotations && context.annotations.length > 0) ||
      (context.screenshotMarkers && context.screenshotMarkers.length > 0)) {
    parts.push(`\n## Annotations Overview`);

    const allAnnotations = [
      ...(context.annotations || []).map(a => ({ severity: a.severity, title: a.title })),
      ...(context.screenshotMarkers || []).map(m => ({ severity: m.severity, title: m.title })),
    ];

    const bySeverity = {
      error: allAnnotations.filter(a => a.severity === 'error').length,
      warning: allAnnotations.filter(a => a.severity === 'warning').length,
      info: allAnnotations.filter(a => a.severity === 'info').length,
      success: allAnnotations.filter(a => a.severity === 'success').length,
    };

    parts.push(`- Errors: ${bySeverity.error}`);
    parts.push(`- Warnings: ${bySeverity.warning}`);
    parts.push(`- Info: ${bySeverity.info}`);
    parts.push(`- Success: ${bySeverity.success}`);
  }

  // Documentation summary
  if (context.documentBlocks && context.documentBlocks.length > 0) {
    parts.push(`\n## Documentation`);

    const headings = context.documentBlocks.filter(b =>
      b.block_type === 'heading1' || b.block_type === 'heading2' || b.block_type === 'heading3'
    );

    if (headings.length > 0) {
      parts.push(`Sections covered:`);
      headings.slice(0, 10).forEach(h => {
        const prefix = h.block_type === 'heading1' ? '#' :
                       h.block_type === 'heading2' ? '##' : '###';
        parts.push(`- ${prefix} ${h.content}`);
      });
    }
  }

  parts.push(`\n## Request`);
  parts.push(`Generate a professional executive summary of this exploration that I can share with my team.`);

  return parts.join('\n');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Generate a quick text summary without AI
export function generateQuickSummary(context: ContextData): string {
  if (!context.exploration) {
    return 'No exploration selected.';
  }

  const parts: string[] = [];

  parts.push(`# ${context.exploration.name}`);
  parts.push(`Status: ${context.exploration.status}`);
  parts.push('');

  // Issues
  if (context.issues && context.issues.length > 0) {
    const critical = context.issues.filter(i => i.priority === 'critical').length;
    const high = context.issues.filter(i => i.priority === 'high').length;
    parts.push(`## Issues: ${context.issues.length} found`);
    if (critical > 0) parts.push(`- ${critical} critical`);
    if (high > 0) parts.push(`- ${high} high priority`);
    parts.push('');
  }

  // Checklist
  if (context.checklistItems && context.checklistItems.length > 0) {
    const passing = context.checklistItems.filter(c => c.status === 'passing').length;
    const total = context.checklistItems.length;
    parts.push(`## Checklist: ${passing}/${total} passing`);
    parts.push('');
  }

  // Evidence
  const evidenceCount = (context.screenshots?.length || 0) + (context.recordings?.length || 0);
  if (evidenceCount > 0) {
    parts.push(`## Evidence: ${evidenceCount} items`);
    if (context.screenshots?.length) parts.push(`- ${context.screenshots.length} screenshots`);
    if (context.recordings?.length) parts.push(`- ${context.recordings.length} recordings`);
  }

  return parts.join('\n');
}
