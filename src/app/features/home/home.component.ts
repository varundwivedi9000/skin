import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportService } from '../../core/viewport.service';
import { gridCols } from '../../shared/grid.util';
import { CLINIC, CONDITIONS, DOCTORS, GROUPS, SECOND_DOCTOR_ENABLED } from '../../core/content';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly viewport = inject(ViewportService);

  protected readonly clinic = CLINIC;
  protected readonly groups = GROUPS;
  protected readonly conditions = CONDITIONS;
  protected readonly mainDoctor = DOCTORS[0];
  protected readonly secondDoctorInfo = DOCTORS[1];
  protected readonly secondDoctorEnabled = SECOND_DOCTOR_ENABLED;

  protected readonly heroGrid = computed(() => {
    const mob = this.viewport.isMobile();
    const padding = mob
      ? 'max-width:1180px;margin:0 auto;padding:28px 20px 40px;'
      : 'max-width:1180px;margin:0 auto;padding:clamp(40px,6vw,104px) clamp(20px,5vw,72px) 56px;';
    return padding + gridCols(mob, 1.15, 0.85, mob ? '28px' : 'clamp(28px,5vw,72px)', 'center');
  });

  protected readonly introGrid = computed(() =>
    gridCols(this.viewport.isMobile(), 1, 1, this.viewport.isMobile() ? '24px' : 'clamp(28px,5vw,80px)'),
  );

  protected readonly attrGrid = computed(() => {
    const mob = this.viewport.isMobile();
    return `display:grid;grid-template-columns:repeat(${mob ? 1 : 2},minmax(0,1fr));gap:${mob ? '10px' : '14px'}`;
  });

  protected readonly doctorGrid = computed(() => gridCols(this.viewport.isMobile(), 0.8, 1.2, undefined, 'center'));
  protected readonly condGrid = computed(() =>
    gridCols(this.viewport.isMobile(), 0.9, 1.1, undefined, 'end'),
  );
  protected readonly contactHomeGrid = computed(() => gridCols(this.viewport.isMobile(), 1, 1));

  protected treatmentImage(key: string): string {
    return `uploads/asc-grp-${key}.jpeg`;
  }
}
