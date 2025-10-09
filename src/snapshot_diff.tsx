import cockpit from "cockpit";
import React, { useState, useEffect } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { useDialogs } from 'dialogs.jsx';
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core";

const _ = cockpit.gettext;

const DiffDialog = ({ file, diff }: { file: string, diff: string }) => {
    const Dialogs = useDialogs();

    console.log(file, diff);

    return (
        <Modal
            title={file} variant="medium" onClose={() => Dialogs.close()} isOpen
        >
            <ModalHeader>
                <p>{file}</p>
            </ModalHeader>
            <ModalBody>
                <pre style={{maxWidth: "800px"}}>{diff}</pre>
            </ModalBody>
        </Modal>
    );
};

export const SnapshotDiff = ({ pre_snapshot, post_snapshot }: { pre_snapshot: number, post_snapshot: number }) => {
    const Dialogs = useDialogs();
    const [modifiedPackages, setModifiedPackages] = useState<SnDiffModifiedPackages | null>(null);
    const [modifiedFiles, setModifiedFiles] = useState<SndiffModifiedFiles | null>(null);

    useEffect(() => {
        cockpit.spawn(
            ["sndiff", "--json", pre_snapshot.toString(), post_snapshot.toString()], { err: "message", superuser: "require" }
        )
            .then((output: string, error: string) => {
                const jsonout: SndiffDiff = JSON.parse(output);
                setModifiedPackages(jsonout.packages);
                setModifiedFiles(jsonout.files);
                console.log(jsonout.files)
            });
    }, []);

    if (modifiedPackages === null || modifiedFiles === null)
        return <EmptyStatePanel loading />;

    return <>
        <h3>Packages</h3>
        <p>Updated: {modifiedPackages.updated.reduce((combined, item) => combined += item.name + " ", "")}</p>
        <p>Downgraded: {modifiedPackages.downgraded.reduce((combined, item) => combined += item.name + " ", "")}</p>
        <p>Added: {modifiedPackages.added.reduce((combined, item) => combined += item.name + " ", "")}</p>
        <p>Removed: {modifiedPackages.removed.reduce((combined, item) => combined += item.name + " ", "")}</p>

        <h3>Files</h3>
        <p>Modified: {modifiedFiles.modified.map(item => {
            if (!item.file_diff) {
                return item.path + " ";
            }
            return <><a key={item.path} onClick={() => Dialogs.show(<DiffDialog file={item.path} diff={item.file_diff} />)}>{item.path}</a> </>;
        })}</p>
        <p>Added: {modifiedFiles.added.reduce((combined, item) => combined += item.path + " ", "")}</p>
        <p>Removed: {modifiedFiles.removed.reduce((combined, item) => combined += item.path + " ", "")}</p>
    </>;
};

