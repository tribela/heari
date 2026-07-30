import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost' });
// @ts-expect-error setting up test DOM globals
globalThis.window = window;
// @ts-expect-error setting up test DOM globals
globalThis.document = window.document;
globalThis.localStorage = window.localStorage as unknown as Storage;
globalThis.location = window.location as unknown as Location;
globalThis.navigator = window.navigator as unknown as Navigator;
globalThis.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement as unknown as typeof HTMLInputElement;
globalThis.Node = window.Node as unknown as typeof Node;
globalThis.Element = window.Element as unknown as typeof Element;

