import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost' });
// @ts-expect-error setting up test DOM globals
globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage as Storage;
globalThis.location = window.location as Location;
globalThis.navigator = window.navigator as Navigator;
globalThis.HTMLElement = window.HTMLElement as typeof HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement as typeof HTMLInputElement;
globalThis.Node = window.Node as typeof Node;
globalThis.Element = window.Element as typeof Element;

