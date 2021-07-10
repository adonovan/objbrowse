/** @license ObjBrowse
 * Copyright 2021 The Go Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css"; // For loading spinner and errors.

export type UseFetchJSONResult = { pending: React.ReactElement, error?: string } | { pending: false, value: any }

const useFetchJSONPending: UseFetchJSONResult = {
    pending: (
        <div className="d-flex align-items-center">
            <strong>Loading...</strong>
            <div className="spinner-border ms-auto" role="status" aria-hidden="true"></div>
        </div>
    ),
};

/**
 * useFetchJSON is a hook that fetches JSON from url. It returns an object whose
 * `pending` field is set to a React element that shows the fetch status or to
 * `false` once the fetch succeeds. If the fetch succeeds, the result is
 * returned in the `value` field. If the fetch fails, the result also has an
 * `error` field giving the error message. If the URL changes or the component
 * is unmounted, it will cancel any pending fetch.
 */
export function useFetchJSON(url: string): UseFetchJSONResult {
    const [res, setRes] = useState(useFetchJSONPending);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        // Because we abort pending requests upon starting a new one, we don't need
        // sequence numbers because there are no overlapping requests that can get
        // reordered.
        async function doFetch() {
            try {
                const res = await fetch(url, { signal });
                if (!res.ok) {
                    throw `${res.status} ${res.statusText}`
                } else {
                    const val = await res.json();
                    setRes({ pending: false, value: val });
                }
            } catch (e) {
                if (e instanceof DOMException && e.name == "AbortError") {
                    // Request aborted, which probably means we've started a new
                    // one. Go back to "pending" state.
                    setRes(useFetchJSONPending);
                } else {
                    console.log(`fetching ${url}: ${e}`);
                    setRes({ error: String(e), pending: <div className="alert alert-danger" role="alert">Error: {String(e)}</div> });
                }
            }
        }

        doFetch();

        return controller.abort.bind(controller);
    }, [url]);

    return res;
}