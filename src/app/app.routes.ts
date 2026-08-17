import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

// The doctor's admin area lives at this obscure, unlinked path instead of a
// discoverable /admin. This is security through obscurity only — the real gate
// is the passcode checked server-side in adminLogin (netlify/functions/adminLogin.mts),
// rate-limited, plus the `doctor` custom-claim check in firestore.rules.
export const ADMIN_PATH = environment.adminPath;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'treatments',
    loadComponent: () =>
      import('./features/treatments/treatments.component').then((m) => m.TreatmentsComponent),
  },
  {
    path: 'treatments/:slug',
    loadComponent: () =>
      import('./features/treatment-detail/treatment-detail.component').then(
        (m) => m.TreatmentDetailComponent,
      ),
  },
  {
    path: 'conditions',
    loadComponent: () =>
      import('./features/conditions/conditions.component').then((m) => m.ConditionsComponent),
  },
  {
    path: 'doctors',
    loadComponent: () =>
      import('./features/doctors/doctors.component').then((m) => m.DoctorsComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'book',
    loadComponent: () => import('./features/book/book.component').then((m) => m.BookComponent),
  },
  {
    path: ADMIN_PATH,
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  { path: '**', redirectTo: '' },
];
