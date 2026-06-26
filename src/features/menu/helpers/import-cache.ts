import { v4 as uuid } from "uuid";
import { ImportMenuRow } from "../types/menu.types";

const cache = new Map<
    string,
    {
        rows: ImportMenuRow[];
        expires: number;
    }
>();

export const saveImportPreview = (
    rows: ImportMenuRow[]
) => {

    const token = uuid();

    cache.set(token, {
        rows,
        expires: Date.now() + 1000 * 60 * 10,
    });

    return token;
};

export const getImportPreview = (
    token: string
) => {

    const preview = cache.get(token);

    if (!preview)
        return null;

    if (preview.expires < Date.now()) {

        cache.delete(token);

        return null;
    }

    return preview.rows;
};

export const removeImportPreview = (
    token: string
) => {

    cache.delete(token);

};