import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingSubject = new BehaviorSubject<boolean>(false);
    private loadingMessageSubject = new BehaviorSubject<string>('Please wait while we load your data');
    
    public loading$: Observable<boolean> = this.loadingSubject.asObservable();
    public message$: Observable<string> = this.loadingMessageSubject.asObservable();

    setLoading(isLoading: boolean, message: string = 'Please wait...'): void {
        this.loadingMessageSubject.next(message);
        this.loadingSubject.next(isLoading);
    }
}
