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
    private selectorID!: string;
    private state!: ThingineState;

    private interpolator = new Interpolator();
    private events = new EventSub();

    constructor(selector: string = '#main', state: ThingineState) {
        const selected = document.body.querySelector(selector);
        if (!selected || selected.tagName.toLowerCase() !== 'div') {
            this.err(`Unable to render using selector: ${this.selector}`);
            return;
        }

        selected.querySelectorAll('*').forEach((n, i) => {
            if (n instanceof Element) {
                const find = (n as Element);
                
                if (!find.hasAttribute('thingineid')) {
                    n.setAttribute('thingineid', this.interpolator.genID());
                }
            }
        });

        this.doc = selected.innerHTML;
        this.selector = selected;
        this.selectorID = selector;
        this.state = state;

        this.events.setState = this.state;
    }

    private err(err: any) {
        // TODO: handle errors more gracefully
        alert(err);
    }

    private rerender(store: ThingineState, renderer?: string) {
        if (renderer) {
            this.selector.innerHTML = renderer;
        }

        this.interpolator.findAndReplace(this.selector, store.defs);
        this.interpolator.registerActions(this.selector, store.methods);
        this.interpolator.registerLogic(this.selector, store, this.events);
    }

    private rerenderExclusive(store: ThingineState, renderer?: string, ignoreID?: string) {
        if (renderer && ignoreID) {
            const newDom = new DOMParser().parseFromString(renderer, 'text/html').querySelector('body');
            newDom.childNodes.forEach((newNode, n) => {
                this.selector.childNodes.forEach((oldNode, o) => {
                    if (oldNode instanceof Element && newNode instanceof Element) {
                        const oldElem = (oldNode as Element);
                        const newElem = (newNode as Element);
    
                        if (oldElem.hasAttribute('thingineid') && newElem.hasAttribute('thingineid')) {
                            const oldElemID = oldElem.getAttribute('thingineid');
                            const newElemID = newElem.getAttribute('thingineid');
    
                            if (oldElemID === newElemID && newElemID !== ignoreID) {
                                (this.selector.childNodes[o] as Element).innerHTML = (newDom.childNodes[n] as Element).innerHTML;
                            }
                        }
                    }
                });
            });
        } else {
            this.interpolator.registerLogic(this.selector, store, this.events);
        }

        this.interpolator.registerActions(this.selector, store.methods);
        this.interpolator.findAndReplace(this.selector, store.defs);
    }

    private renderFor(store: ThingineState, forID: string, elems: Element[], baseRemoval?: string, renderer?: string) {
        if (renderer) {
            const newDom = new DOMParser().parseFromString(renderer, 'text/html').querySelector('body');
            newDom.querySelectorAll('*').forEach((newNode, n) => {
                this.selector.querySelectorAll('*').forEach((oldNode, o) => {
                    if (oldNode instanceof Element && newNode instanceof Element) {
                        const newElem = (newNode as Element);
                        const oldElem = (oldNode as Element);
    
                        if (newElem.hasAttribute('thingineid') && oldElem.hasAttribute('thingineid')) {
                            const newElemID = newElem.getAttribute('thingineid');
                            const oldElemID = oldElem.getAttribute('thingineid');

                            if (oldElemID === forID) {
                                elems.forEach((el) => {
                                    if (oldElem instanceof Element) {
                                        (oldElem as Element).appendChild(el);
                                    }
                                });
                            }
    
                            if (oldElemID === newElemID) {
                                if (this.selector.querySelectorAll('*')[o] && newDom.querySelectorAll('*')[n]) {
                                    (this.selector.querySelectorAll('*')[o] as Element).innerHTML = (newDom.querySelectorAll('*')[n] as Element).innerHTML;
                                }
                            }

                            if (baseRemoval) {
                                if (newElemID === baseRemoval) {
                                    newElem.remove();
                                }

                                if (oldElemID === baseRemoval) {
                                    oldElem.remove();
                                }
                            }
                        }
                    }
                });
            });
        } else {
            this.interpolator.registerLogic(this.selector, store, this.events);
        }

        this.interpolator.registerActions(this.selector, store.methods);
        this.interpolator.findAndReplace(this.selector, store.defs);
    }

    public get publisher(): EventSub {
        return this.events;
    }

    public render() {
        const oldState = {
            defs: {
                ...this.state.defs,
            },
            methods: {
                ...this.state.methods,
            },
        };

        Object.keys(this.state.defs).forEach((key) => {
            Object.defineProperty(this.state.defs, key, {
                get: () => {
                    return oldState.defs[key];
                },
                set: (val) => {
                    this.events.emit(`@update:${key}`, {
                        old_value: oldState.defs[key],
                        new_value: val, 
                    });

                    oldState.defs[key] = val;
                    this.rerender(oldState, this.doc);
                }
            });

            this.events.subscribe(`@set:${key}`, (_, val) => {
                this.events.emit(`@update:${key}`, {
                    old_value: oldState.defs[key],
                    new_value: val.value,
                });

                oldState.defs[key] = val.value;
                this.rerenderExclusive(oldState, this.doc, val.id);
            });

            if (Array.isArray(oldState.defs[key])) {
                this.events.subscribe(`@set_for:${key}`, (_, val) => {
                    this.renderFor(oldState, val.id, val.value.elements, val.value.base, this.doc);
                    this.interpolator.registerActions(this.selector, oldState.methods);
                });

                const self = this;
                const oldPush = oldState.defs[key].push;
                oldState.defs[key].push = function() {
                    for (let i = 0; i < arguments.length; i++) {
                        oldState.defs[key] = [
                            ...oldState.defs[key],
                            ...arguments,
                        ];
                        oldPush.apply(this, arguments);
                    }

                    self.rerender(oldState, this.doc);
                }  
            }
        });

        this.rerender(oldState);
    }
}