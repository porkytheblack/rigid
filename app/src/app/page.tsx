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
    case "settings":
      return <SettingsView />;
    default:
      return <HomeView />;
  }
}
