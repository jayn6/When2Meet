import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import {
  FriendshipService,
  Friend,
  FriendRequest
} from '../services/friendship.service';

import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  startWith,
  catchError,
  of,
  Subscription
} from 'rxjs';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.css'
})
export class FriendsComponent implements OnInit, OnDestroy {

  friends: Friend[] = [];

  receivedRequests: FriendRequest[] = [];
  sentRequests: FriendRequest[] = [];

  searchResults: Friend[] = [];

  searchControl = new FormControl('');

  loading = false;
  searchLoading = false;

  errorMessage = '';
  successMessage = '';

  private searchSubscription?: Subscription;

  constructor(
    private friendshipService: FriendshipService
  ) {}

  ngOnInit(): void {

    this.loadAll();

    this.searchSubscription = this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap(query => {

          const value = (query || '').trim();

          if (value.length === 1) {
            this.searchResults = [];
            this.searchLoading = false;
            return of([]);
          }

          this.searchLoading = true;

          return this.friendshipService.searchUsers(value).pipe(
            catchError(error => {
              this.errorMessage = error.status === 0
                ? 'Cannot connect to the server. Check that the backend is running.'
                : error.error?.detail
                  || error.error?.message
                  || 'Could not search students.';
              return of([]);
            })
          );
        })
      )
      .subscribe(results => {

        this.searchResults = results;
        this.searchLoading = false;

      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  // LOAD ALL DATA
  loadAll(): void {

    this.loading = true;
    this.errorMessage = '';

    this.friendshipService.getFriends().subscribe({
      next: data => {
        this.friends = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load your friends.';
        this.loading = false;
      }
    });

    this.friendshipService.getReceivedRequests().subscribe({
      next: data => this.receivedRequests = data,
      error: () => this.errorMessage = 'Could not load friend requests.'
    });

    this.friendshipService.getSentRequests().subscribe({
      next: data => this.sentRequests = data
    });
  }

  // SEND REQUEST
  addFriend(user: Friend): void {

    this.clearMessages();

    this.friendshipService.sendRequest(user.id).subscribe({

      next: () => {

        this.successMessage =
          `Friend request sent to ${user.fullName}.`;

        this.searchResults = this.searchResults.filter(
          result => result.id !== user.id
        );

        this.loadAll();
      },

      error: error => {

        this.errorMessage =
          error.error?.message || 'Could not send friend request.';
      }
    });
  }

  // ACCEPT REQUEST
  acceptRequest(request: FriendRequest): void {

    this.clearMessages();

    this.friendshipService.acceptRequest(request.id).subscribe({

      next: () => {

        this.successMessage =
          `You are now friends with ${request.fullName}.`;

        this.loadAll();
      },

      error: error => {

        this.errorMessage =
          error.error?.message || 'Could not accept request.';
      }
    });
  }

  // REJECT REQUEST
  rejectRequest(request: FriendRequest): void {

    this.clearMessages();

    this.friendshipService.rejectRequest(request.id).subscribe({

      next: () => {

        this.successMessage =
          `Request from ${request.fullName} rejected.`;

        this.loadAll();
      },

      error: error => {

        this.errorMessage =
          error.error?.message || 'Could not reject request.';
      }
    });
  }

  // UNFRIEND
  unfriend(friend: Friend): void {

    const confirmed = window.confirm(
      `Are you sure you want to remove ${friend.fullName} from your friends?`
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();

    this.friendshipService.unfriend(friend.id).subscribe({

      next: () => {

        this.successMessage =
          `${friend.fullName} was removed from your friends.`;

        this.loadAll();
      },

      error: error => {

        this.errorMessage =
          error.error?.message || 'Could not remove friend.';
      }
    });
  }

  // CHECK IF REQUEST IS ALREADY SENT
  isRequestSent(userId: number): boolean {

    return this.sentRequests.some(
      request => request.userId === userId
    );
  }

  // CHECK IF ALREADY FRIENDS
  isFriend(userId: number): boolean {

    return this.friends.some(
      friend => friend.id === userId
    );
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}