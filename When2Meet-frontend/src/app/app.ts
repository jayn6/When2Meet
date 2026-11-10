import { Component } from '@angular/core';
import { AiStudioComponent } from './ai-studio/ai-studio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AiStudioComponent],
  template: '<app-ai-studio></app-ai-studio>'
})
export class App {}