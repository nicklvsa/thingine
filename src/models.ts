export type Nullable<T> = T | null;

export type StateDef<T> = {
    [key: string]: T
}

export type StateMethod<A, T> = {
    [key: string]: (...args: A[]) => T
};

export interface ThingineState {
    defs: StateDef<any>
    methods: StateMethod<any, any>
}

export enum EventStatus {
    Success = 'success',
    Error = 'error'
}

export interface EventSubscriber {
    event_name: string;
    callbacks: Nullable<SubscriptionCallback[]>;
    completed: boolean;
}

export type SubscriptionCallback = (status: EventStatus, data: any) => any;