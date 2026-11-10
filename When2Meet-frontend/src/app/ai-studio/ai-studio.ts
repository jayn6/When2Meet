import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TimetableService } from '../services/timetable';

import {
  TimetableClass,
  ConfirmTimetable
} from '../models/event.model';

@Component({
  selector: 'app-ai-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-studio.html',
  styleUrl: './ai-studio.css'
})
export class AiStudioComponent {

  private timetableService = inject(TimetableService);

  selectedFile: File | null = null;
  previewUrl: string | null = null;

  classes: TimetableClass[] = [];

  startDate = '';
  endDate = '';

  isLoading = false;
  isSaving = false;

  errorMessage = '';
  successMessage = '';

  weekdays = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ];

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.classes = [];

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorMessage = 'Please select a JPG, PNG or WEBP image.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'Image must be smaller than 10 MB.';
      return;
    }

    this.selectedFile = file;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = URL.createObjectURL(file);
  }

  extract(): void {

    if (!this.selectedFile) {
      this.errorMessage = 'Please upload a timetable first.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.classes = [];

    this.timetableService
      .extractTimetable(this.selectedFile)
      .subscribe({

        next: (response) => {

          this.classes = response.classes.map(item => ({
            ...item,
            room: item.room ?? '',
            teacher: item.teacher ?? ''
          }));

          this.isLoading = false;

          if (this.classes.length === 0) {
            this.errorMessage =
              'No classes were detected. Try a clearer image.';
          }
        },

        error: (error) => {

          console.error(error);

          this.isLoading = false;

          this.errorMessage =
            'Could not extract the timetable. Check your backend and API key.';
        }

      });
  }

  removeClass(index: number): void {
    this.classes.splice(index, 1);
  }

  addClass(): void {

    this.classes.push({
      subject: '',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      room: '',
      teacher: ''
    });
  }

  confirm(): void {

    if (!this.startDate || !this.endDate) {
      this.errorMessage = 'Choose the schedule start and end dates.';
      return;
    }

    if (this.endDate < this.startDate) {
      this.errorMessage = 'End date must be after start date.';
      return;
    }

    if (this.classes.length === 0) {
      this.errorMessage = 'There are no classes to import.';
      return;
    }

    const invalidClass = this.classes.some(item =>
      !item.subject.trim() ||
      !item.dayOfWeek ||
      !item.startTime ||
      !item.endTime ||
      item.endTime <= item.startTime
    );

    if (invalidClass) {
      this.errorMessage =
        'Please check every class name, weekday and time.';
      return;
    }

    const data: ConfirmTimetable = {
      startDate: this.startDate,
      endDate: this.endDate,
      classes: this.classes
    };

    this.isSaving = true;
    this.errorMessage = '';

    this.timetableService.confirmTimetable(data).subscribe({

      next: (response) => {

        this.isSaving = false;

        this.successMessage =
          `${response.eventsCreated} calendar events created successfully!`;

        this.classes = [];
        this.selectedFile = null;

      },

      error: (error) => {

        console.error(error);

        this.isSaving = false;

        this.errorMessage =
          'Could not save the timetable. Please try again.';
      }

    });
  }
}