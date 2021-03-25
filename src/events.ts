import { 
    EventStatus, 
    EventSubscriber, 
    StateDef, 
    SubscriptionCallback 
} from "./models";

export class EventSub {
    private subscribers: EventSubscriber[] = [];
    private state!: StateDef<any>;

    public set setState(state: StateDef<any>) {
        this.state = state;
    }

    public emit(eventName: string, data: any) {
       if (this.subscribers.length > 0) {
            this.subscribers.forEach((sub: EventSubscriber, i: number) => {
                if (sub.event_name === eventName) {
                    this.subscribers[i].callbacks?.forEach((cb: SubscriptionCallback) => {
                        cb(EventStatus.Success, data);
                    });
                }
            });
        } else {
            this.subscribers.push({
                event_name: eventName,
                completed: false,
                callbacks: [],
            });
        }
    }

    public subscribe(eventName: string, callback: SubscriptionCallback) {
        const exists = this.subscribers.some((el) => {
            return el.event_name === eventName;
        });
        
        if (exists) {
            for (let i = 0; i < this.subscribers.length; i++) {
                if (this.subscribers[i].event_name === eventName) {
                    this.subscribers[i].callbacks?.push(callback);
                }
            }
        } else {
            this.subscribers.push({
                event_name: eventName,
                completed: false,
                callbacks: [callback],
            });
        }
    }
}