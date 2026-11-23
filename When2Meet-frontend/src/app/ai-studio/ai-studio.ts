import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TimetableService } from '../services/timetable';
import {
  TimetableClass,
  ConfirmTimetable,
  CalendarEvent
} from '../models/event.model';

/** A timetable row in the review table (checkbox + warnings). */
interface ReviewRow extends TimetableClass {
  include: boolean;
}

/** Something the student wants to study for. */
interface PlannerTask {
  id: string;
  title: string;
  due: string | null;      // yyyy-mm-dd
  selected: boolean;
  custom: boolean;         // typed by the user (not coming from the calendar)
}

/** One generated study block. */
interface StudySession {
  taskId: string;
  title: string;           // "Study · Physics midterm"
  date: string;            // yyyy-mm-dd
  startMin: number;        // minutes from midnight
  endMin: number;
  index: number;           // 1-based
  of: number;
  late: boolean;           // lands on/after the due date
}

interface DayChip {
  date: string;
  weekday: string;
  day: number;
  time: string;
  count: number;
}

@Component({
  selector: 'app-ai-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-studio.html',
  styleUrl: './ai-studio.css'
})
export class AiStudioComponent {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private timetableService = inject(TimetableService);

  /* =====================================================
     LEFT SIDE — AI timetable import
  ===================================================== */

  readonly steps = ['Upload', 'Extract', 'Review', 'Import'];

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  dragging = false;

  rows: ReviewRow[] = [];

  startDate = this.toDateStr(new Date());
  endDate = this.toDateStr(this.addDays(new Date(), 7 * 16));

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  weekdays = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
    'FRIDAY', 'SATURDAY', 'SUNDAY'
  ];

  get currentStep(): number {
    if (this.successMessage) return 3;
    if (this.rows.length > 0) return 2;
    if (this.isLoading) return 1;
    return 0;
  }

  get includedCount(): number {
    return this.rows.filter(r => r.include).length;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.rows = [];

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorMessage = 'Please select a JPG, PNG or WEBP image.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'Image must be smaller than 10 MB.';
      return;
    }

    this.selectedFile = file;
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = URL.createObjectURL(file);
  }

  clearFile(e?: Event): void {
    e?.preventDefault();
    e?.stopPropagation();
    this.selectedFile = null;
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  extract(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please upload a timetable first.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.rows = [];

    this.timetableService.extractTimetable(this.selectedFile).subscribe({
      next: (response) => {
        this.rows = response.classes.map(item => ({
          ...item,
          room: item.room ?? '',
          teacher: item.teacher ?? '',
          include: true
        }));
        this.isLoading = false;

        // pre-untick obvious duplicates, like the "Possible duplicate" rows
        this.rows.forEach((r, i) => {
          if (this.isDuplicate(i)) r.include = false;
        });

        if (this.rows.length === 0) {
          this.errorMessage = 'No classes were detected. Try a clearer image.';
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
        this.errorMessage =
          error?.error?.error ??
          'Could not extract the timetable. Check your backend and API key.';
        this.cdr.detectChanges();
      }
    });
  }

  /** Same subject + day + start as an earlier row. */
  isDuplicate(i: number): boolean {
    const r = this.rows[i];
    return this.rows.slice(0, i).some(o =>
      o.subject.trim().toLowerCase() === r.subject.trim().toLowerCase() &&
      o.dayOfWeek === r.dayOfWeek &&
      o.startTime === r.startTime
    );
  }

  /** End before start, or empty name. */
  needsCheck(i: number): boolean {
    const r = this.rows[i];
    return !r.subject.trim() || !r.startTime || !r.endTime || r.endTime <= r.startTime;
  }

  shortDay(day: string): string {
    return day.charAt(0) + day.slice(1, 3).toLowerCase();
  }

  removeRow(index: number): void {
    this.rows.splice(index, 1);
  }

  addRow(): void {
    this.rows.push({
      subject: '',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      room: '',
      teacher: '',
      include: true
    });
  }

  cancelReview(): void {
    this.rows = [];
    this.errorMessage = '';
  }

  confirm(): void {
    const chosen = this.rows.filter(r => r.include);

    if (!this.startDate || !this.endDate) {
      this.errorMessage = 'Choose the schedule start and end dates.';
      return;
    }
    if (this.endDate < this.startDate) {
      this.errorMessage = 'End date must be after start date.';
      return;
    }
    if (chosen.length === 0) {
      this.errorMessage = 'Tick at least one class to import.';
      return;
    }
    const invalid = chosen.some(r =>
      !r.subject.trim() || !r.dayOfWeek || !r.startTime || !r.endTime || r.endTime <= r.startTime
    );
    if (invalid) {
      this.errorMessage = 'Please check every class name, weekday and time.';
      return;
    }

    const data: ConfirmTimetable = {
      startDate: this.startDate,
      endDate: this.endDate,
      classes: chosen.map(({ include, ...cls }) => cls)
    };

    this.isSaving = true;
    this.errorMessage = '';

    this.timetableService.confirmTimetable(data).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage =
          `${response.eventsCreated} calendar events created successfully!`;
        this.rows = [];
        this.clearFile();
        this.router.navigate(['/calendar']);
      },
      error: (error) => {
        console.error(error);
        this.isSaving = false;
        this.errorMessage = 'Could not save the timetable. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  

  /* =====================================================
     Helpers
  ===================================================== */





  private toDateStr(d: Date): string {
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }


  private addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

}
