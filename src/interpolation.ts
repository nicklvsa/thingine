import { StateDef, StateMethod, ThingineState } from './models';

export class Interpolator {
    private interCheck = (check: string) => {
        return `{{([^}]*(\\s*${check}\\s*))}}`;
    }

    private isInterpolatedValue(key: string, check: string): boolean {
        const checker = new RegExp(this.interCheck(key.trim()), 'g');
        return checker.test(check.trim());
    }

    private replaceInterpolatedValue(key: string, check: string, replacement: string): string {
       if (this.isInterpolatedValue(key, check)) {
            const checker = new RegExp(this.interCheck(key.trim()), 'g');
            return check.replace(checker, replacement);
        }

        return check;
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

    public registerLogic(elem: Element, methods: StateMethod<any, any>, defs: StateDef<any>) {
        Object.keys(defs).forEach((key, _) => {
            elem.childNodes.forEach((node, i) => {
                if (node instanceof Element) {
                    const n = (elem.childNodes[i] as Element);
                    n.getAttributeNames().forEach((attr) => {
                        if (attr.startsWith('%')) {
                            const action = attr.substring(1);
                            switch (action) {
                                case 'if':
                                    // TODO: handle ifs
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