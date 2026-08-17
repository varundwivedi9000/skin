import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportService } from '../../core/viewport.service';
import { gridCols } from '../../shared/grid.util';
import { CLINIC, DOCTORS, SECOND_DOCTOR_ENABLED } from '../../core/content';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './doctors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorsComponent {
  private readonly viewport = inject(ViewportService);

  protected readonly clinic = CLINIC;
  protected readonly mainDoctor = DOCTORS[0];
  protected readonly secondDoctorInfo = DOCTORS[1];
  protected readonly secondDoctorEnabled = SECOND_DOCTOR_ENABLED;

  protected readonly doctorsGrid = computed(() => gridCols(this.viewport.isMobile(), 0.8, 1.2));

  protected readonly portraitSticky = computed(() => {
    const mob = this.viewport.isMobile();
    return 'border-radius:var(--radius-lg);overflow:hidden;' + (mob ? 'max-width:340px' : 'position:sticky;top:96px');
  });

  protected readonly doc2CardGrid = computed(() => {
    const mob = this.viewport.isMobile();
    return `display:grid;grid-template-columns:${mob ? 'minmax(0,1fr)' : '140px minmax(0,1fr)'};gap:20px;align-items:start`;
  });
}
