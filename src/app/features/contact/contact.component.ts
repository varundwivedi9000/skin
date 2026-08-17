import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportService } from '../../core/viewport.service';
import { gridCols } from '../../shared/grid.util';
import { CLINIC } from '../../core/content';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './contact.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  private readonly viewport = inject(ViewportService);

  protected readonly clinic = CLINIC;
  protected readonly contactPageGrid = computed(() => gridCols(this.viewport.isMobile(), 0.85, 1.15));
}
