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

    private replaceInterpolatedValue(key: string, check: string, replacement: any): string {
        let toReplace = check;

        if (typeof replacement === 'object') {
            const flat = this.flattenObject(replacement, key);
            Object.keys(flat).forEach((k, _) => {
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

    public findAndReplace(elem: Element, defs: StateDef<any>) {
        Object.keys(defs).forEach((key, _) => {
            elem.childNodes.forEach((node, i) => {
                const replacer = this.replaceInterpolatedValue(key, node.textContent, defs[key]);
                elem.childNodes[i].textContent = replacer;
            });
        });
    }

    public registerActions(elem: Element, methods: StateMethod<any, any>) {
        Object.keys(methods).forEach((key, _) => {
            elem.childNodes.forEach((node, i) => {
                if (node instanceof Element) {
                    const n = (elem.childNodes[i] as Element);
                    n.getAttributeNames().forEach((attr) => {
                        if (attr.startsWith('@')) {
                            const action = attr.substring(1);
                            n.addEventListener(action, methods[n.getAttribute(attr)]);
                        }
                    });
                }
            });
        });
    }

    public registerLogic(elem: Element, defs: StateDef<any>, events: EventSub) {
        Object.keys(defs).forEach((key, i) => {
            elem.childNodes.forEach((node, j) => {
                if (node instanceof Element) {
                    const n = (elem.childNodes[j] as Element);                 
                    n.getAttributeNames().forEach((attr) => {
                        if (attr.startsWith('%')) {
                            const action = attr.substring(1);
                            switch (action) {
                                case 'if':
                                    // TODO: handle ifs
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
        });
    }
}