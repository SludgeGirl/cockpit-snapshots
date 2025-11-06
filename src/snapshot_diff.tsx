import cockpit from "cockpit";
import React, { useState, useEffect } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { useDialogs } from 'dialogs.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionToggle, Breadcrumb, BreadcrumbItem, Button, Card, CardBody, CardHeader, CardTitle, Modal, ModalBody, ModalHeader, PageBreadcrumb, PageSection } from "@patternfly/react-core";
import { Snapshot, SndiffDiff, SndiffModifiedFiles, SnDiffModifiedPackages } from "./types";
import { CompareDialog } from "./compare_dialog";

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

const SnapshotDiff = ({ pre_snapshot, post_snapshot }: { pre_snapshot: number, post_snapshot: number }) => {
    const Dialogs = useDialogs();
    const [modifiedPackages, setModifiedPackages] = useState<SnDiffModifiedPackages | null>(null);
    const [modifiedFiles, setModifiedFiles] = useState<SndiffModifiedFiles | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string[]>([]);

    useEffect(() => {
        setModifiedPackages(null);
        setModifiedFiles(null);
        cockpit.spawn(
            ["sndiff", "--json", pre_snapshot.toString(), post_snapshot.toString()], { err: "message", superuser: "require" }
        )
                        .then((output: string) => {
                            console.log(output);
                            const jsonout: SndiffDiff = JSON.parse(output);
                            setModifiedPackages(jsonout.packages);
                            setModifiedFiles(jsonout.files);
                            console.log(jsonout.files);
                        });
    }, [post_snapshot, pre_snapshot]);

    const onAccordionToggle = (id: string) => {
        if (openAccordion.includes(id)) {
            setOpenAccordion(openAccordion.filter((item) => item !== id));
        } else {
            setOpenAccordion([...openAccordion, id]);
        }
    };

    const accordionItem = (key: string, title: string, content: React.ReactNode) => {
        return (
            <AccordionItem isExpanded={openAccordion.includes(key)}>
                <AccordionToggle
                    onClick={() => {
                        onAccordionToggle(key);
                    }}
                    id={key}
                >
                    {title}
                </AccordionToggle>
                <AccordionContent id={key}>
                    {content}
                </AccordionContent>
            </AccordionItem>
        );
    };

    if (modifiedPackages === null || modifiedFiles === null)
        return <EmptyStatePanel loading />;

    return (
        <Accordion asDefinitionList>
            {modifiedPackages.updated.length > 0 &&
                accordionItem("def-updated-packages", _("Updated Packages"), (
                    <p>
                        {modifiedPackages.updated.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}
                    </p>
                ))}
            {modifiedPackages.downgraded.length > 0 &&
                accordionItem("def-downgraded-packages", _("Downgraded Packages"), (
                    <p>
                        {modifiedPackages.downgraded.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}
                    </p>
                ))}
            {modifiedPackages.added.length > 0 &&
                accordionItem("def-added-packages", _("Added Packages"), (
                    <p>
                        {modifiedPackages.added.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}
                    </p>
                ))}
            {modifiedPackages.removed.length > 0 &&
                accordionItem("def-removed-packages", _("Removed Packages"), (
                    <p>
                        {modifiedPackages.removed.reduce((combined, item) => { combined += item.name + " "; return combined }, "")}
                    </p>
                ))}

            {modifiedFiles.modified.length > 0 &&
                accordionItem("def-modified-files", _("Modified Files"), (
                    <p>
                        {modifiedFiles.modified.map(item => {
                            if (!item.file_diff) {
                                return item.path + " ";
                            }
                            return <span key={item.path}><a onClick={() => Dialogs.show(<DiffDialog file={item.path} diff={item.file_diff} />)}>{item.path}</a> </span>;
                        })}
                    </p>
                ))}
            {modifiedFiles.added.length > 0 &&
                accordionItem("def-added-files", _("Added Files"), (
                    <p>
                        {modifiedFiles.added.reduce((combined, item) => { combined += item.path + " "; return combined }, "")}
                    </p>
                ))}
            {modifiedFiles.removed.length > 0 &&
                accordionItem("def-removed-files", _("Removed Files"), (
                    <p>
                        {modifiedFiles.removed.reduce((combined, item) => { combined += item.path + " "; return combined }, "")}
                    </p>
                ))}
        </Accordion>
    );
};

const SnapshotDiffPage = ({ snapshot1, snapshot2, snapshots }: { snapshot1: number, snapshot2: number, snapshots: Snapshot[] }) => {
    const Dialogs = useDialogs();

    return (
        <>
            <PageBreadcrumb hasBodyWrapper={false} stickyOnBreakpoint={{ default: "top" }}>
                <Breadcrumb>
                    <BreadcrumbItem to="#/">{_("Snapshots")}</BreadcrumbItem>
                    <BreadcrumbItem isActive>
                        {snapshot1} - {snapshot2}
                    </BreadcrumbItem>
                </Breadcrumb>
            </PageBreadcrumb>
            <PageSection>
                <Card>
                    <CardHeader actions={{
                        actions: [
                            <Button key="compare-snapshots" onClick={() => Dialogs.show(<CompareDialog snapshots={snapshots} />)}>{_("Compare Snapshots")}</Button>
                        ]
                    }}
                    >
                        <CardTitle>{_("Snapshots")}</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <SnapshotDiff
                            pre_snapshot={snapshot1}
                            post_snapshot={snapshot2}
                        />
                    </CardBody>
                </Card>
            </PageSection>
        </>
    );
};

export default SnapshotDiff;

export { SnapshotDiff, SnapshotDiffPage };
