import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  EMPTY,
  Observable,
  TimeoutError,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  timeout,
  timer
} from 'rxjs';

import { Friend, FriendRequest, FriendshipService } from '../services/friendship.service';

type Notice = { type: 'success' | 'error'; text: string };

const TIMEOUT_MS = 10_000;
const POLL_MS = 15_000;

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsComponent implements OnInit {

  private readonly service = inject(FriendshipService);
  private readonly destroyRef = inject(DestroyRef);

  // ---- search ----
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly query$ = this.searchControl.valueChanges.pipe(
    startWith(''),
    map(value => value.trim())
  );
  readonly query = toSignal(this.query$, { initialValue: '' });

  // ---- data ----
  readonly friends = signal<Friend[]>([]);
  readonly received = signal<FriendRequest[]>([]);
  readonly sent = signal<FriendRequest[]>([]);
  readonly results = signal<Friend[]>([]);

  readonly friendIds = computed(() => new Set(this.friends().map(f => f.id)));
  readonly sentIds = computed(() => new Set(this.sent().map(r => r.userId)));

  // ---- state ----
  readonly friendsLoading = signal(true);
  readonly requestsLoading = signal(true);
  readonly searching = signal(false);
  readonly searchFailed = signal(false);
  readonly requestsError = signal('');
  readonly notice = signal<Notice | null>(null);

  /** key of the action running now, e.g. "accept-7". Used to block double clicks. */
  readonly busyKey = signal<string | null>(null);
  readonly busy = computed(() => this.busyKey() !== null);

  private noticeTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.refresh();
    this.watchSearch();
    this.watchRequests();
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  // ---------------- loading ----------------

  refresh(): void {

    this.service.getFriends().pipe(
      timeout(TIMEOUT_MS),
      finalize(() => this.friendsLoading.set(false))
    ).subscribe({
      next: list => this.friends.set(list),
      error: err => this.notify('error', this.errorText(err, 'Could not load your friends.'))
    });

    this.service.getReceivedRequests().pipe(
      timeout(TIMEOUT_MS),
      finalize(() => this.requestsLoading.set(false))
    ).subscribe({
      next: list => this.setReceived(list),
      error: err => this.requestsError.set(this.errorText(err, 'Could not load friend requests.'))
    });

    this.service.getSentRequests().pipe(timeout(TIMEOUT_MS)).subscribe({
      next: list => this.sent.set(list),
      error: () => { /* the buttons still work, the server answers 409 if already sent */ }
    });
  }

  private watchSearch(): void {
    this.query$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(query => {
        this.searchFailed.set(false);

        if (query.length === 1) {
          return of<Friend[]>([]);
        }

        this.searching.set(true);

        return this.service.searchUsers(query).pipe(
          timeout(TIMEOUT_MS),
          catchError(err => {
            this.searchFailed.set(true);
            this.notify('error', this.errorText(err, 'Could not search students.'));
            return of<Friend[]>([]);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(list => {
      this.results.set(list);
      this.searching.set(false);
    });
  }

  /** Light polling so new requests show up without a reload. */
  private watchRequests(): void {
    timer(POLL_MS, POLL_MS).pipe(
      filter(() => !document.hidden),
      switchMap(() => this.service.getReceivedRequests().pipe(
        timeout(TIMEOUT_MS),
        catchError(() => EMPTY)
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(list => this.setReceived(list));
  }

  /** Only replace the list when it really changed, so the cards are not rebuilt. */
  private setReceived(list: FriendRequest[]): void {
    const current = this.received();
    const same = list.length === current.length
      && list.every((request, i) => request.id === current[i].id);

    if (!same) {
      this.received.set(list);
    }
    this.requestsError.set('');
  }

  // ---------------- actions ----------------

  sendRequest(user: Friend): void {
    this.run(
      `add-${user.id}`,
      this.service.sendRequest(user.id),
      `Friend request sent to ${user.fullName}.`,
      'Could not send friend request.'
    );
  }

  accept(request: FriendRequest): void {
    this.run(
      `accept-${request.id}`,
      this.service.acceptRequest(request.id),
      `You are now friends with ${request.fullName}.`,
      'Could not accept the request.',
      () => this.received.update(list => list.filter(r => r.id !== request.id))
    );
  }

  reject(request: FriendRequest): void {
    this.run(
      `reject-${request.id}`,
      this.service.rejectRequest(request.id),
      `Request from ${request.fullName} rejected.`,
      'Could not reject the request.',
      () => this.received.update(list => list.filter(r => r.id !== request.id))
    );
  }

  unfriend(friend: Friend): void {
    if (!window.confirm(`Remove ${friend.fullName} from your friends?`)) {
      return;
    }

    this.run(
      `unfriend-${friend.id}`,
      this.service.unfriend(friend.id),
      `${friend.fullName} was removed from your friends.`,
      'Could not remove friend.',
      () => this.friends.update(list => list.filter(f => f.id !== friend.id))
    );
  }

  /** One place for: block double clicks, timeout, message, refresh. */
  private run(
    key: string,
    call$: Observable<unknown>,
    okText: string,
    failText: string,
    onSuccess?: () => void
  ): void {

    if (this.busy()) {
      return;
    }

    this.busyKey.set(key);

    call$.pipe(
      timeout(TIMEOUT_MS),
      finalize(() => this.busyKey.set(null))
    ).subscribe({
      next: () => {
        onSuccess?.();
        this.notify('success', okText);
        this.refresh();
      },
      error: err => this.notify('error', this.errorText(err, failText))
    });
  }

  // ---------------- messages ----------------

  dismiss(): void {
    this.notice.set(null);
  }

  private notify(type: Notice['type'], text: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set({ type, text });
    this.noticeTimer = setTimeout(() => this.notice.set(null), 5000);
  }

  private errorText(err: unknown, fallback: string): string {
    if (err instanceof TimeoutError) {
      return 'The server is taking too long to answer. Try again.';
    }

    const e = err as HttpErrorResponse;

    if (e.status === 0) {
      return 'Cannot reach the server. Check that the backend is running and that CORS allows this request.';
    }
    if (e.status === 401 || e.status === 403) {
      return 'Your session has expired. Please log in again.';
    }
    return e.error?.message || e.error?.detail || fallback;
  }
}