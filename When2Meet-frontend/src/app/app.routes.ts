import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { authGuard } from './guards/auth.guard';
import { FriendsComponent } from './friends/friends.component';
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'signup',
    component: SignupComponent
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'calendar',
        pathMatch: 'full'
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./calendar/calendar').then(m => m.CalendarComponent)
      },
      {
        path: 'ai-studio',
        loadComponent: () =>
          import('./ai-studio/ai-studio').then(m => m.AiStudioComponent)
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./tasks/tasks').then(m => m.TasksComponent)
      },
      {
        path: 'friends',
        component: FriendsComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
