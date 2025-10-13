import cockpit from "cockpit";
import React, { useState, useEffect } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { useDialogs } from 'dialogs.jsx';
import { Modal, ModalBody, ModalHeader } from "@patternfly/react-core";
import { SndiffDiff, SndiffModifiedFiles, SnDiffModifiedPackages } from "./types";

const _ = cockpit.gettext;

const DiffDialog = ({ file, diff }: { file: string, diff: string }) => {
    const Dialogs = useDialogs();

    return (
        <Modal
            title={file} variant="medium" onClose={() => Dialogs.close()} isOpen
        >
            <ModalHeader>
                <p>{file}</p>
            </ModalHeader>
            <ModalBody>
                <pre style={{ maxWidth: "800px" }}>{diff}</pre>
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
                            console.log(error);
                            const jsonout: SndiffDiff = JSON.parse(output);
                            setModifiedPackages(jsonout.packages);
                            setModifiedFiles(jsonout.files);
                            console.log(jsonout.files);
                        });
    }, [post_snapshot, pre_snapshot]);

    if (modifiedPackages === null || modifiedFiles === null)
        return <EmptyStatePanel loading />;

    return (
        <>
            <h3>{_("Packages")}</h3>
            <p>{_("Updated")}: {modifiedPackages.updated.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}</p>
            <p>{_("Downgraded")}: {modifiedPackages.downgraded.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}</p>
            <p>{_("Added")}: {modifiedPackages.added.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}</p>
            <p>{_("Removed")}: {modifiedPackages.removed.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}</p>

            <h3>{_("Files")}</h3>
            <p>{_("Modified")}: {modifiedFiles.modified.map(item => {
                if (!item.file_diff) {
                    return item.path + " ";
                }
                return <span key={item.path}><a onClick={() => Dialogs.show(<DiffDialog file={item.path} diff={item.file_diff} />)}>{item.path}</a> </span>;
            })}
            </p>
            <p>{_("Added")}: {modifiedFiles.added.reduce((combined, item) => { combined += item.path + " "; return combined }, "")}</p>
            <p>{_("Removed")}: {modifiedFiles.removed.reduce((combined, item) => { combined += item.path + " "; return combined }, "")}</p>
        </>
    );
};
