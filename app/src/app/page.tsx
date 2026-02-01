"use client";

import { useRouterStore } from "@/lib/stores";
import {
  HomeView,
  AppView,
  ExplorationView,
  ScreenshotEditorView,
  VideoEditorView,
  DiagramEditorView,
  ArchitectureDocView,
  ArchitectureDiagramEditorView,
  DemoView,
  DemoEditorView,
  FeaturesKanbanView,
  SettingsView,
} from "@/views";

export default function App() {
  const { route } = useRouterStore();

  switch (route.name) {
    case "home":
      return <HomeView />;
    case "app":
      return <AppView appId={route.appId} />;
    case "exploration":
      return <ExplorationView appId={route.appId} explorationId={route.explorationId} initialTab={route.tab} />;
    case "screenshot-editor":
      return (
        <ScreenshotEditorView
          appId={route.appId}
          explorationId={route.explorationId}
          screenshotId={route.screenshotId}
        />
      );
    case "video-editor":
      return (
        <VideoEditorView
          appId={route.appId}
          explorationId={route.explorationId}
          recordingId={route.recordingId}
          initialTimestamp={route.timestamp}
        />
      );
    case "diagram-editor":
      return (
        <DiagramEditorView
          appId={route.appId}
          explorationId={route.explorationId}
          diagramId={route.diagramId}
        />
      );
    case "architecture-doc":
      return (
        <ArchitectureDocView
          appId={route.appId}
          docId={route.docId}
        />
      );
    case "architecture-diagram-editor":
      return (
        <ArchitectureDiagramEditorView
          appId={route.appId}
          docId={route.docId}
          diagramId={route.diagramId}
        />
      );
    case "demo-view":
      return (
        <DemoView
          appId={route.appId}
          demoId={route.demoId}
          initialTab={route.tab}
        />
      );
    case "demo-editor":
      return (
        <DemoEditorView
          appId={route.appId}
          demoId={route.demoId}
          parentDemoId={route.parentDemoId}
        />
      );
    case "demo-video-editor":
      return (
        <DemoEditorView
          appId={route.appId}
          demoId={route.demoId}
          videoId={route.videoId}
          parentDemoId={route.parentDemoId}
        />
      );
    case "features-kanban":
      return <FeaturesKanbanView appId={route.appId} />;
    case "settings":
      return <SettingsView />;
    default:
      return <HomeView />;
  }
}
