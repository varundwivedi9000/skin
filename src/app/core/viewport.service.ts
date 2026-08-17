import { Injectable, computed, signal } from '@angular/core';

/** Tracks window width so templates can branch on the same ~780px mobile breakpoint the prototype used. */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  readonly width = signal(window.innerWidth);
  readonly isMobile = computed(() => this.width() < 780);

  constructor() {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => this.width.set(window.innerWidth);
}
