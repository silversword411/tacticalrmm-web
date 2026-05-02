// How far from each edge the scroll zone extends (px).
const SCROLL_ZONE = 120;
// Peak scroll speed at the very edge (px/s).
const MAX_SPEED = 4800;
// Exponential smoothing factor per frame — lower = more inertia.
const SMOOTH = 0.18;

function easeScroll(t: number): number {
  return t * t * t;
}

function computeTargetSpeed(el: HTMLElement, clientY: number): number {
  const rect = el.getBoundingClientRect();
  const distTop = clientY - rect.top;
  const distBottom = rect.bottom - clientY;

  if (distTop >= 0 && distTop < SCROLL_ZONE) {
    return -easeScroll(1 - distTop / SCROLL_ZONE) * MAX_SPEED;
  }
  if (distBottom >= 0 && distBottom < SCROLL_ZONE) {
    return easeScroll(1 - distBottom / SCROLL_ZONE) * MAX_SPEED;
  }
  return 0;
}

export interface DragScrollHandle {
  /** Call on every dragover/pointermove with the current clientY to update scroll speed. */
  update(clientY: number): void;
  /** Attach a native dragover listener to an element so updates fire over non-row areas. */
  attach(el: HTMLElement): void;
  /** Detach the listener added by attach(). */
  detach(el: HTMLElement): void;
  /** Let velocity coast to zero and stop. */
  stop(): void;
}

/**
 * Creates an independent drag-scroll controller for a given scroll container.
 *
 * Usage:
 *   const scroll = useDragScroll(scrollEl)
 *   scroll.attach(scrollEl)          // native dragover coverage
 *   // on dragover: scroll.update(ev.clientY)
 *   // on dragend:  scroll.detach(scrollEl); scroll.stop()
 */
export function useDragScroll(getEl: () => HTMLElement | null): DragScrollHandle {
  let raf: number | null = null;
  let velocity = 0;
  let targetSpeed = 0;
  let lastTs: number | null = null;

  function update(clientY: number) {
    const el = getEl();
    if (!el) return;

    const prevTarget = targetSpeed;
    targetSpeed = computeTargetSpeed(el, clientY);

    // Reset velocity on direction flip to avoid coasting through zero.
    if (
      prevTarget !== 0 &&
      targetSpeed !== 0 &&
      Math.sign(prevTarget) !== Math.sign(targetSpeed)
    ) {
      velocity = 0;
    }

    if (raf !== null) return; // loop already running
    if (targetSpeed === 0 && velocity === 0) return;

    lastTs = null;
    const step = (ts: number) => {
      const scrollEl = getEl();
      if (!scrollEl) { raf = null; velocity = 0; return; }

      const dt = lastTs !== null ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
      lastTs = ts;

      velocity += (targetSpeed - velocity) * SMOOTH;

      if (Math.abs(velocity) > 0.5) {
        scrollEl.scrollTop += velocity * dt;
        raf = requestAnimationFrame(step);
      } else {
        velocity = 0;
        raf = null;
      }
    };
    raf = requestAnimationFrame(step);
  }

  function stop() {
    targetSpeed = 0;
    if (raf === null) velocity = 0;
    // The RAF loop will coast velocity to zero and self-terminate.
  }

  function _onDragOver(ev: DragEvent) {
    ev.preventDefault();
    update(ev.clientY);
  }

  function attach(el: HTMLElement) {
    el.addEventListener("dragover", _onDragOver);
  }

  function detach(el: HTMLElement) {
    el.removeEventListener("dragover", _onDragOver);
  }

  return { update, attach, detach, stop };
}
