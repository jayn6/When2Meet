import { Routes } from '@angular/router';
import { CalendarComponent } from './calendar/calendar';
import { AiStudioComponent } from './ai-studio/ai-studio';
import { AppLayoutComponent } from './layout/app-layout';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full'
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./calendar/calendar')
            .then(m => m.CalendarComponent)
      },
      {
        path: 'ai-studio',
        loadComponent: () =>
          import('./ai-studio/ai-studio')
            .then(m => m.AiStudioComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'calendar'
  }
];