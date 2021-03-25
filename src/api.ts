import { EventSub } from './events';
import { Interpolator } from './interpolation';
import {
    StateDef,
    StateMethod,
    ThingineState,
} from './models';

export class Thingine {
    private doc!: string;
    private selector!: Element;
    private state!: ThingineState;

    private interpolator = new Interpolator();
    private events = new EventSub();

    constructor(selector: string = '#main', state: ThingineState) {
        const selected = document.querySelector(selector);
        if (!selected || selected.tagName.toLowerCase() !== 'div') {
            this.err(`Unable to render using selector: ${this.selector}`);
            return;
        }

        selected.childNodes.forEach((n, i) => {
            if (n instanceof Element) {
                const find = (n as Element);
                
                if (!find.hasAttribute('thingineid')) {
                    (selected.childNodes[i] as Element).setAttribute('thingineid', this.genID());
                }
            }
        });

        this.doc = selected.innerHTML;
        this.selector = selected;
        this.state = state;

        this.events.setState = this.state;
    }

    private genID(): string {
        const id = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
        return id;
    }

    private err(err: any) {
        // TODO: handle errors more gracefully
        alert(err);
    }

    private rerender(defs: StateDef<any>, state: StateMethod<any, any>, renderer?: string) {
        if (renderer) {
            this.selector.innerHTML = renderer;
        }

        this.interpolator.findAndReplace(this.selector, defs);
        this.interpolator.registerActions(this.selector, state);
        this.interpolator.registerLogic(this.selector, defs, this.events);
    }

    public get publisher(): EventSub {
        return this.events;
    }

    public render() {
        const oldStore = {
            ...this.state.defs
        };

        this.rerender(oldStore, this.state.methods);

        Object.keys(this.state.defs).forEach((key) => {
            Object.defineProperty(this.state.defs, key, {
                get: () => {
                    return oldStore[key];
                },
                set: (val) => {
                    this.events.emit(`@update:${key}`, {
                        old_value: oldStore[key],
                        new_value: val, 
                    });

                    oldStore[key] = val;
                    this.rerender(oldStore, this.state.methods, this.doc);
                }
            });

            this.events.subscribe(`@set:${key}`, (_, val) => {
                this.events.emit(`@update:${key}`, {
                    old_value: oldStore[key],
                    new_value: val.value, 
                });

                oldStore[key] = val.value;
            });
        });
    }
}