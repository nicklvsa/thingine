import { EventSub } from './events';
import { StateDef, StateMethod, ThingineState } from './models';

export class Interpolator {
    private interCheck (check: string) {
        return `{{([^}]*(\\s*${check}\\s*))}}`;
    }

    private flattenObject(obj: any, prefix: string = '') {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? `${prefix}.` : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && Object.keys(obj[k]).length > 0) {
                Object.assign(acc, this.flattenObject(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }

            return acc;
        }, {});
    }

    private isInterpolatedValue(key: any, check: string): boolean {
        const checker = new RegExp(this.interCheck(key.trim()), 'g');
        return checker.test(check);
    }

    private replaceInterpolatedAttr(elem: Element, key: string, replacement: any) {
        elem.getAttributeNames().forEach((childAttr) => {
            const attr = elem.getAttribute(childAttr);
            if (this.isInterpolatedValue(key, attr)) {
                if (typeof replacement === 'object') {
                    const flat = this.flattenObject(replacement, key);
                    Object.keys(flat).forEach((k) => {
                        const newKey = k.replace('.', '\\.');
                        const checker = new RegExp(this.interCheck(newKey.trim()), 'g');
                        elem.setAttribute(childAttr, attr.replace(checker, flat[k]));
                    });
                } else {
                    const checker = new RegExp(this.interCheck(key.trim()), 'g');
                    elem.setAttribute(childAttr, attr.replace(checker, replacement));
                }
            }
        });

        return elem;
    }

    private replaceInterpolatedValue(key: string, check: string, replacement: any): string {
        let toReplace = check;

        if (typeof replacement === 'object') {
            const flat = this.flattenObject(replacement, key);
            Object.keys(flat).forEach((k) => {
                if (this.isInterpolatedValue(k, check)) {
                    const newKey = k.replace('.', '\\.');
                    const checker = new RegExp(this.interCheck(newKey.trim()), 'g');
                    toReplace = toReplace.replace(checker, flat[k]);
                }
            });
        }

        if (this.isInterpolatedValue(key, check)) {
            const checker = new RegExp(this.interCheck(key.trim()), 'g');
            toReplace = toReplace.replace(checker, replacement);
        }

        return toReplace;
    }

    public genID(): string {
        const id = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
        return id;
    }

    public findAndReplace(elem: Element, defs: StateDef<any>) {
        Object.keys(defs).forEach((key) => {
            elem.childNodes.forEach((node, i) => {
                if (node instanceof Element) {
                    const el = (node as Element);
                    const replacer = this.replaceInterpolatedValue(key, el.innerHTML, defs[key]);
                    (elem.childNodes[i] as Element).innerHTML = replacer;
                } else {
                    const replacer = this.replaceInterpolatedValue(key, node.textContent, defs[key]);
                    elem.childNodes[i].textContent = replacer;
                }
            });
        });
    }

    public registerActions(elem: Element, methods: StateMethod<any, any>) {
        elem.querySelectorAll('*').forEach((node, i) => {
            if (node instanceof Element) {
                const n = (elem.querySelectorAll('*')[i] as Element);
                n.getAttributeNames().forEach((attr) => {
                    let action!: string;

                    if (attr.startsWith('@')) {
                        action = attr.substring(1);
                    } else if(attr.startsWith('thingine-on:')) {
                        action = attr.substring(12);
                    }

                    const func = methods[n.getAttribute(attr)];
                    if (action && func) {
                        if (n.hasAttribute('args')) {
                            const args = n.getAttribute('args');
                            n.addEventListener(action, func.bind(this, args), false);
                        } else {
                            n.addEventListener(action, func.bind(this, null), false);
                        }
                    }
                });
            }
        });
    }

    public registerLogic(elem: Element, store: ThingineState, events: EventSub) {
        elem.querySelectorAll('*').forEach((node, j) => {
            if (node instanceof Element) {
                const n = (node as Element);             
                n.getAttributeNames().forEach((attr) => {
                    if (attr.startsWith('%') || attr.startsWith('thingine-logic:')) {
                        let action!: string;

                        if (attr.startsWith('%')) {
                            action = attr.substring(1);
                        } else if(attr.startsWith('thingine-logic:')) {
                            action = attr.substring(16);
                        }

                        switch (action) {
                            case 'if':
                                // TODO: handle ifs
                                break;
                            case 'for':
                                const iterator = n.getAttribute('%for')
                                const perIteration = n.getAttribute('%as');

                                if (store.defs[iterator] && store.defs[iterator] !== null) {
                                    const iter = store.defs[iterator];
                                    let baseRemovalID = '';

                                    if (Array.isArray(iter)) {
                                        const elems: Element[] = [];

                                        n.childNodes.forEach((child, i) => {
                                            if (child instanceof Element) {
                                                if (this.isInterpolatedValue(perIteration, child.innerHTML)) {
                                                    iter.forEach((val, idx) => {
                                                        let elem = document.createElement(child.tagName);

                                                        child.getAttributeNames().forEach((childAttr) => {
                                                            if (childAttr !== 'thingineid') {
                                                                const setter = childAttr.replace('@', 'thingine-on:').replace('%', 'thingine-logic:');
                                                                elem.setAttribute(setter, child.getAttribute(childAttr));
                                                            }
                                                        });

                                                        elem.setAttribute('thingineid', `${child.getAttribute('thingineid')}-${idx}`);
                                                        elem.innerHTML = this.replaceInterpolatedValue(perIteration, child.innerHTML, val);

                                                        elem = this.replaceInterpolatedAttr(elem, perIteration, val) as HTMLElement;
                                                        
                                                        elems.push(elem);
                                                    });
                                                }
                                            }

                                            if (elem.querySelectorAll('*')[j].childNodes[i] instanceof Element) {
                                                baseRemovalID = (elem.querySelectorAll('*')[j].childNodes[i] as Element).getAttribute('thingineid');
                                            }
                                        });

                                        events.emit(`@set_for:${iterator}`, {
                                            id: n.getAttribute('thingineid'),
                                            value: {
                                                elements: elems,
                                                base: baseRemovalID,
                                            },
                                        });
                                    }
                                }
                                break;
                            case 'bind':
                                const bind = n.getAttribute(attr);
                                const input = (n as HTMLInputElement & {
                                    value: any,
                                });

                                input.addEventListener('keyup', (evt) => {
                                    events.emit(`@set:${bind}`, {
                                        id: input.getAttribute('thingineid'),
                                        value: input.value,
                                    });
                                });
                                break;
                            default:
                                break;
                        }
                    }
                });
            }
        });
    }
}