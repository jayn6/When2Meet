import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TimetableService } from '../services/timetable';
import { EventService } from '../services/event.service';
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
export class AiStudioComponent implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private timetableService = inject(TimetableService);
  private eventService = inject(EventService);

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
     RIGHT SIDE — Study planner (plain code, no AI)
  ===================================================== */

  readonly sessionOptions = [
    { hours: 1, label: '1h' },
    { hours: 1.5, label: '1h 30' },
    { hours: 2, label: '2h' }
  ];

  events: CalendarEvent[] = [];
  tasks: PlannerTask[] = [];

  newTaskTitle = '';
  newTaskDue = '';

  totalHours = 10;
  sessionHours = 2;
  plannerStart = this.toDateStr(this.addDays(new Date(), 1));
  preferredTime = '19:00';
  skipWeekends = false;

  plan: StudySession[] = [];
  planWarning = '';
  plannerError = '';
  plannerSuccess = '';
  isAdding = false;

  ngOnInit(): void {
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.loadTasksFromCalendar();
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Could not load events:', error)
    });
  }

  /** Upcoming exams + assignments from the calendar become choosable tasks. */
  private loadTasksFromCalendar(): void {
    const today = this.toDateStr(new Date());

    const fromCalendar: PlannerTask[] = this.events
      .filter(e =>
        ['EXAM', 'ASSIGNMENT'].includes((e.category || '').toUpperCase()) &&
        e.startDateTime.substring(0, 10) >= today
      )
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
      .slice(0, 8)
      .map(e => ({
        id: `ev-${e.id}`,
        title: e.title,
        due: e.startDateTime.substring(0, 10),
        selected: false,
        custom: false
      }));

    const custom = this.tasks.filter(t => t.custom);
    this.tasks = [...fromCalendar, ...custom];

    if (fromCalendar.length && !this.tasks.some(t => t.selected)) {
      this.tasks[0].selected = true;
    }
  }

  addCustomTask(): void {
    const title = this.newTaskTitle.trim();
    if (!title) {
      this.plannerError = 'Write what you want to study first.';
      return;
    }
    this.plannerError = '';
    this.tasks.push({
      id: `custom-${Date.now()}`,
      title,
      due: this.newTaskDue || null,
      selected: true,
      custom: true
    });
    this.newTaskTitle = '';
    this.newTaskDue = '';
    this.plan = [];
  }

  removeTask(task: PlannerTask): void {
    this.tasks = this.tasks.filter(t => t !== task);
    this.plan = [];
  }

  daysLeft(due: string | null): number | null {
    if (!due) return null;
    const a = this.parseDate(this.toDateStr(new Date()));
    const b = this.parseDate(due);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  urgency(due: string | null): string {
    const d = this.daysLeft(due);
    if (d === null) return 'none';
    if (d <= 4) return 'hot';
    if (d <= 9) return 'warm';
    return 'cool';
  }

  get selectedTasks(): PlannerTask[] {
    return this.tasks.filter(t => t.selected);
  }

  get sessionCount(): number {
    return Math.ceil(this.totalHours / this.sessionHours - 1e-9);
  }

  get sessionSummary(): string {
    const full = Math.floor(this.totalHours / this.sessionHours + 1e-9);
    const rest = +(this.totalHours - full * this.sessionHours).toFixed(2);
    const len = this.fmtHours(this.sessionHours);
    return rest > 0
      ? `${full} × ${len} + 1 × ${this.fmtHours(rest)}`
      : `${full} × ${len}`;
  }

  /** Builds the plan: one block per day, same time every day, no clashes. */
  buildPlan(): void {
    this.plannerError = '';
    this.plannerSuccess = '';
    this.planWarning = '';
    this.plan = [];

    const chosen = this.selectedTasks;
    if (chosen.length === 0) {
      this.plannerError = 'Choose at least one exam or add your own task.';
      return;
    }
    if (!this.plannerStart) {
      this.plannerError = 'Pick the day you want to start.';
      return;
    }

    const pref = this.toMin(this.preferredTime || '19:00');
    const busy = new Map<string, { s: number; e: number }[]>();
    for (const ev of this.events) {
      const d = ev.startDateTime.substring(0, 10);
      const list = busy.get(d) ?? [];
      list.push({
        s: this.toMin(ev.startDateTime.substring(11, 16)),
        e: this.toMin(ev.endDateTime.substring(11, 16))
      });
      busy.set(d, list);
    }

    // earliest deadline first
    const queue = [...chosen]
      .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
      .map(task => {
        const n = this.sessionCount;
        const durations = Array.from({ length: n }, (_, i) =>
          i < n - 1 ? this.sessionHours : +(this.totalHours - (n - 1) * this.sessionHours).toFixed(2)
        );
        // with a deadline we may need >1 block a day to fit everything in
        const avail = task.due
          ? Math.max(1, this.daysBetween(this.plannerStart, task.due))
          : Infinity;
        return {
          task,
          n,
          durations,
          perDay: Number.isFinite(avail) ? Math.ceil(n / avail) : 1
        };
      });

    const out: StudySession[] = [];
    let day = this.parseDate(this.plannerStart);

    for (let guard = 0; guard < 400 && queue.some(q => q.durations.length); guard++) {
      const dateStr = this.toDateStr(day);
      const weekend = [0, 6].includes(day.getDay());

      if (!(this.skipWeekends && weekend)) {
        for (const q of queue) {
          for (let k = 0; k < q.perDay && q.durations.length; k++) {
            const dur = Math.round(q.durations[0] * 60);
            const start = this.findSlot(busy.get(dateStr) ?? [], pref, dur);
            if (start === null) break;

            q.durations.shift();
            const index = q.n - q.durations.length;

            const list = busy.get(dateStr) ?? [];
            list.push({ s: start, e: start + dur });
            busy.set(dateStr, list);

            out.push({
              taskId: q.task.id,
              title: `Study · ${q.task.title}`,
              date: dateStr,
              startMin: start,
              endMin: start + dur,
              index,
              of: q.n,
              late: !!q.task.due && dateStr >= q.task.due
            });
          }
        }
      }
      day = this.addDays(day, 1);
    }

    out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
    this.plan = out;

    const late = out.filter(s => s.late).length;
    if (late > 0) {
      this.planWarning =
        `${late} session${late > 1 ? 's' : ''} land on or after the due date. ` +
        `Try an earlier start, longer sessions or fewer hours.`;
    }
  }

  /** First free slot (30-min steps) from the preferred time, or null. */
  private findSlot(busy: { s: number; e: number }[], pref: number, dur: number): number | null {
    const buffer = 10;
    for (let s = pref; s + dur <= 23 * 60; s += 30) {
      const clash = busy.some(b => s < b.e + buffer && s + dur + buffer > b.s);
      if (!clash) return s;
    }
    return null;
  }

  /** The chain of days shown with arrows. */
  get dayChips(): DayChip[] {
    const map = new Map<string, StudySession[]>();
    for (const s of this.plan) {
      map.set(s.date, [...(map.get(s.date) ?? []), s]);
    }
    return [...map.entries()].map(([date, list]) => {
      const d = this.parseDate(date);
      return {
        date,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        day: d.getDate(),
        time: this.fmtTime(list[0].startMin),
        count: list.length
      };
    });
  }

  get planHours(): number {
    return +(this.plan.reduce((sum, s) => sum + (s.endMin - s.startMin), 0) / 60).toFixed(2);
  }

  addPlanToCalendar(): void {
    if (this.plan.length === 0 || this.isAdding) return;

    this.isAdding = true;
    this.plannerError = '';

    const requests = this.plan.map(s => {
      const event: CalendarEvent = {
        title: `${s.title} (${s.index}/${s.of})`,
        description: `Study session ${s.index} of ${s.of} · ${this.fmtHours((s.endMin - s.startMin) / 60)}`,
        startDateTime: `${s.date}T${this.fmtTime(s.startMin)}:00`,
        endDateTime: `${s.date}T${this.fmtTime(s.endMin)}:00`,
        location: '',
        type: 'PRIVATE',
        category: 'STUDY'
      };
      return this.eventService.createEvent(event);
    });

    forkJoin(requests).subscribe({
      next: (created) => {
        this.events = [...this.events, ...created];
        this.plannerSuccess = `${created.length} study sessions added to your calendar!`;
        this.plan = [];
        this.isAdding = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.isAdding = false;
        this.plannerError = 'Could not add the sessions. Is the backend running?';
        this.cdr.detectChanges();
      }
    });
  }

  openCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  /* =====================================================
     Helpers
  ===================================================== */

  fmtTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  fmtHours(h: number): string {
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    if (mins === 0) return `${whole}h`;
    return whole === 0 ? `${mins}min` : `${whole}h ${mins}`;
  }

  sessionLabel(s: StudySession): string {
    const d = this.parseDate(s.date);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${day} ${d.getDate()} · ${this.fmtTime(s.startMin)}`;
  }

  private toMin(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private toDateStr(d: Date): string {
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  private parseDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  private daysBetween(a: string, b: string): number {
    return Math.round((this.parseDate(b).getTime() - this.parseDate(a).getTime()) / 86400000);
  }
}
