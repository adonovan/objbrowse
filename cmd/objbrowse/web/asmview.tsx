/** @license ObjBrowse
 * Copyright 2021 The Go Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import React, { useRef, useEffect } from "react";

import { ViewProps, Entity, Selection } from "./objbrowse";
import { useFetchJSON } from "./hooks";

import "./asmview.css";
import { Ranges } from "./ranges";

type json = { Insts: inst[], Refs: symRef[], LastPC: string }
type inst = { PC: string, Op: string, Args: string, Control?: control }
type symRef = { ID: number, Name: string }
type control = { Type: number, Conditional: boolean, TargetPC: string }

// TODO: Implement selecting an instruction or range of instructions.

function AsmViewer(props: ViewProps) {
    // Scroll selection into view when it changes.
    const tableRef = useRef<HTMLTableElement>(null);
    useEffect(() => {
        if (tableRef.current !== null) {
            const first = tableRef.current.querySelector(".av-selected");
            first?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [props.value]);

    // Fetch data.
    const fetch = useFetchJSON(`/sym/${props.value.entity.id}/asm`)
    if (fetch.pending) {
        return fetch.pending;
    }
    const v: json = fetch.value;

    // Parse PCs and compute lengths of all instructions.
    let pcs: bigint[] = [];
    let lens: number[] = [];
    for (let i = 0; i < v.Insts.length; i++) {
        pcs.push(BigInt("0x" + v.Insts[i].PC));
    }
    pcs.push(BigInt("0x" + v.LastPC));
    for (let i = 0; i < v.Insts.length; i++) {
        lens.push(Number(pcs[i + 1] - pcs[i]));
    }

    // Create the instruction rows.
    const rows: React.ReactElement[] = [];
    for (let i = 0; i < v.Insts.length; i++) {
        const inst = v.Insts[i];
        const pcDelta = Number(pcs[i] - pcs[0]);
        const range = { start: pcDelta, end: pcDelta + lens[i] };

        let className = "";
        if (props.value.ranges.anyIntersection(range)) {
            className = "av-selected";
        }

        rows.push(
            <tr key={i} className={className}>
                <td className="av-addr">0x{inst.PC}</td>
                <td className="av-addr">+0x{pcDelta.toString(16)}</td>
                <td className="av-inst">{inst.Op}</td>
                <td className="av-inst">{formatArgs(inst.Args, v.Refs, props.onSelect)}</td>
            </tr>
        );
    }

    return <table ref={tableRef} className="av-table"><tbody>{rows}</tbody></table>;
}

function formatArgs(args: string, symRefs: symRef[], onSelect: (sel: Selection) => void): React.ReactElement {
    if (!args.includes("\u00ab")) {
        return <>{args}</>;
    }

    let parts: React.ReactElement[] = [];
    let re = /\u00ab(\d+)\+([0-9a-fA-F]+)\u00bb/g;
    let start = 0;
    let m;
    while ((m = re.exec(args)) !== null) {
        if (m.index > 0) {
            parts.push(<>{args.substring(start, m.index)}</>);
        }
        const sym = symRefs[parseInt(m[1], 10)];
        const offset = parseInt(m[2], 16);
        let text = sym.Name;
        if (offset != 0) {
            text += `+0x${offset.toString(16)}`;
        }
        parts.push(<a key={start} href="#" onClick={(ev) => {
            const entity: Entity = { type: "sym", id: sym.ID };
            const ranges = new Ranges([{ start: offset, end: offset + 1 }]);
            onSelect({ entity, ranges });
            ev.preventDefault();
        }}>{text}</a>);
        start = re.lastIndex;
    }
    // Remainder of argument.
    parts.push(<>{args.substring(start)}</>);
    return <>{parts}</>;
}

export const AsmView = { element: AsmViewer, id: "asm", label: "Assembly" };
