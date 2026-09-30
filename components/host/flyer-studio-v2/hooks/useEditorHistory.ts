"use client";

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { HISTORY_LIMIT } from "../config";
import { cloneElements, snapshotsEqual } from "../editor-utils";
import type { CanvasElement } from "../types";

type ElementsUpdater =
  | CanvasElement[]
  | ((current: CanvasElement[]) => CanvasElement[]);

export function useEditorHistory(initialElements: CanvasElement[]) {
  const pastRef = useRef<CanvasElement[][]>([]);
  const futureRef = useRef<CanvasElement[][]>([]);
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [historyVersion, setHistoryVersion] = useState(0);

  const remember = useCallback((snapshot: CanvasElement[]) => {
    pastRef.current.push(cloneElements(snapshot));
    if (pastRef.current.length > HISTORY_LIMIT) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setHistoryVersion((value) => value + 1);
  }, []);

  const commitElements = useCallback(
    (next: ElementsUpdater) => {
      setElements((current) => {
        const resolved =
          typeof next === "function" ? next(current) : cloneElements(next);

        if (snapshotsEqual(current, resolved)) return current;

        remember(current);
        return resolved;
      });
    },
    [remember]
  );

  const updateElement = useCallback(
    (
      id: string,
      patch:
        | Partial<CanvasElement>
        | ((element: CanvasElement) => Partial<CanvasElement>),
      recordHistory = true
    ) => {
      const updater = (current: CanvasElement[]) =>
        current.map((element) =>
          element.id === id
            ? {
                ...element,
                ...(typeof patch === "function" ? patch(element) : patch),
              }
            : element
        );

      if (recordHistory) commitElements(updater);
      else setElements(updater);
    },
    [commitElements]
  );

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;

    setElements((current) => {
      futureRef.current.push(cloneElements(current));
      return cloneElements(previous);
    });
    setHistoryVersion((value) => value + 1);
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;

    setElements((current) => {
      pastRef.current.push(cloneElements(current));
      return cloneElements(next);
    });
    setHistoryVersion((value) => value + 1);
  }, []);

  const commitSnapshot = useCallback(
    (startSnapshot: CanvasElement[]) => {
      setElements((current) => {
        if (!snapshotsEqual(startSnapshot, current)) {
          remember(startSnapshot);
        }
        return current;
      });
    },
    [remember]
  );

  const resetElements = useCallback((next: CanvasElement[]) => {
    pastRef.current = [];
    futureRef.current = [];
    setElements(cloneElements(next));
    setHistoryVersion((value) => value + 1);
  }, []);

  const jumpToHistory = useCallback((index: number) => {
    const timeline = [...pastRef.current, cloneElements(elements), ...futureRef.current.slice().reverse()];
    if (index < 0 || index >= timeline.length || index === pastRef.current.length) return;
    const selected = timeline[index];
    pastRef.current = timeline.slice(0, index).map(cloneElements);
    futureRef.current = timeline.slice(index + 1).reverse().map(cloneElements);
    setElements(cloneElements(selected));
    setHistoryVersion((value) => value + 1);
  }, [elements]);

  return {
    elements,
    setElements: setElements as Dispatch<SetStateAction<CanvasElement[]>>,
    commitElements,
    updateElement,
    undo,
    redo,
    commitSnapshot,
    resetElements,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    historySteps: [...pastRef.current, elements, ...futureRef.current.slice().reverse()].map((snapshot, index) => ({ index, layerCount: snapshot.length, current: index === pastRef.current.length })),
    historyVersion,
    jumpToHistory,
  };
}
