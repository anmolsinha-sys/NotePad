export type WikilinkNote = { id: string; title: string; content?: string; updated_at?: string };

let NOTES: WikilinkNote[] = [];
const listeners = new Set<(notes: WikilinkNote[]) => void>();

export const setWikilinkNotes = (notes: WikilinkNote[]) => {
    NOTES = notes;
    listeners.forEach((cb) => cb(notes));
};

export const getWikilinkNotes = (): WikilinkNote[] => NOTES;

export const subscribeWikilinkNotes = (cb: (notes: WikilinkNote[]) => void) => {
    listeners.add(cb);
    cb(NOTES);
    return () => { listeners.delete(cb); };
};

export const navigateToNote = (noteId: string) => {
    document.dispatchEvent(new CustomEvent('wikilink:open', { detail: { target: noteId } }));
};
