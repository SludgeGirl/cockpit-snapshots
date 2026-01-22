import cockpit from "cockpit";
import React, { useState, useEffect, CSSProperties } from "react";
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { useDialogs } from 'dialogs.jsx';
import { Accordion, AccordionContent, AccordionItem, AccordionToggle, Breadcrumb, BreadcrumbItem, Button, Card, CardBody, CardHeader, CardTitle, ClipboardCopyButton, CodeBlock, CodeBlockAction, CodeBlockCode, Modal, ModalBody, ModalHeader, PageBreadcrumb, PageSection } from "@patternfly/react-core";
import { Snapshot, SndiffDiff, SndiffModifiedFiles, SnDiffModifiedPackages } from "./types";
import { CompareDialog } from "./compare_dialog";

const _ = cockpit.gettext;

const DiffDialog = ({ file, diff }: { file: string, diff: string }) => {
    const Dialogs = useDialogs();
    const [copied, setCopied] = useState(false);

    const onClick = (event: React.MouseEvent<Element, MouseEvent>, text: string) => {
        navigator.clipboard.writeText(text.toString());
        setCopied(true);
    };

    const code = diff.split("\n").map((line, index) => {
        const first_char = line.charAt(0);
        const style: CSSProperties = {
            display: "block",
        };

        if (["-", "+"].includes(first_char)) {
            style.color = "#fff";
        }

        const lineParts = line.split(" ");
        if (lineParts.length > 0 && lineParts[0] === "@@" && lineParts[lineParts.length - 1] === "@@") {
            style.color = "#698996";
        }

        if (first_char === "-") {
            style.backgroundColor = "#cf222e";
        } else if (first_char === "+") {
            style.backgroundColor = "#1a7f37";
        }

        return (<span key={"diff-line-" + index} style={style}>{line}</span>);
    });

    return (
        <Modal
            title={file} variant="medium" onClose={() => Dialogs.close()} isOpen
        >
            <ModalHeader title={file} />
            <ModalBody>
                <CodeBlock actions={
                    <CodeBlockAction>
                        <ClipboardCopyButton
                            id="copy-button"
                            aria-label="Copy diff to clipboard"
                            onClick={(e) => onClick(e, diff)}
                            exitDelay={copied ? 1500 : 600}
                            maxWidth="120px"
                            variant="plain"
                            onTooltipHidden={() => setCopied(false)}
                        >
                            {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
                        </ClipboardCopyButton>
                    </CodeBlockAction>
                }
                >
                    <CodeBlockCode id="code-content">{code}</CodeBlockCode>
                </CodeBlock>
            </ModalBody>
        </Modal>
    );
};

const SnapshotDiff = ({ pre_snapshot, post_snapshot, load = false }: { pre_snapshot: number, post_snapshot: number, load: boolean }) => {
    const Dialogs = useDialogs();
    const [modifiedPackages, setModifiedPackages] = useState<SnDiffModifiedPackages | null>(null);
    const [modifiedFiles, setModifiedFiles] = useState<SndiffModifiedFiles | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string[]>([]);

    useEffect(() => {
        if (!load)
            return;

        setModifiedPackages(null);
        setModifiedFiles(null);
        cockpit.spawn(
            ["sndiff", "--json", pre_snapshot.toString(), post_snapshot.toString()], { err: "message", superuser: "require" }
        )
                        .then((output: string) => {
                            let jsonout: SndiffDiff;
                            try {
                                jsonout = JSON.parse(output);
                            } catch (e) {
                                console.error("sndiff returned invalid json", e);
                                jsonout = {
                                    packages: {
                                        updated: [],
                                        downgraded: [],
                                        added: [],
                                        removed: []
                                    },
                                    files: {
                                        modified: [],
                                        added: [],
                                        removed: []
                                    }
                                };
                            }
                            setModifiedPackages(jsonout.packages);
                            setModifiedFiles(jsonout.files);
                        });
    }, [post_snapshot, pre_snapshot, load]);

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

    const hasNoResults = (modifiedPackages: SnDiffModifiedPackages | null, modifiedFiles: SndiffModifiedFiles | null) => {
        let emptyPackages: boolean[] = [];
        let emptyFiles: boolean[] = [];
        if (modifiedPackages !== null) {
            const packageKeys: ["updated", "downgraded", "added", "removed"] = ["updated", "downgraded", "added", "removed"];
            emptyPackages = packageKeys.map((key) => (modifiedPackages[key] ?? []).length === 0);
        }
        if (modifiedFiles !== null) {
            const fileKeys: ["modified", "added", "removed"] = ["modified", "added", "removed"];
            emptyFiles = fileKeys.map((key) => (modifiedFiles[key] ?? []).length === 0);
        }

        return emptyPackages.filter((i) => !i).length === 0 &&
            emptyFiles.filter((i) => !i).length === 0;
    };

    if (modifiedPackages === null || modifiedFiles === null)
        return <EmptyStatePanel loading />;

    return (
        <Accordion asDefinitionList>
            {hasNoResults(modifiedPackages, modifiedFiles) && <p>{_("No changes found")}</p>}
            {modifiedPackages.updated.length > 0 &&
                accordionItem("def-updated-packages", _("Updated Packages"), (
                    <ul className='flow-list'>
                        {modifiedPackages.updated.map((item, n) => <li key={n}>{item.name}</li>)}
                    </ul>
                ))}
            {modifiedPackages.downgraded.length > 0 &&
                accordionItem("def-downgraded-packages", _("Downgraded Packages"), (
                    <ul className='flow-list'>
                        {modifiedPackages.downgraded.map((item, n) => <li key={n}>{item.name}</li>)}
                    </ul>
                ))}
            {modifiedPackages.added.length > 0 &&
                accordionItem("def-added-packages", _("Added Packages"), (
                    <ul className='flow-list'>
                        {modifiedPackages.added.map((item, n) => <li key={n}>{item.name}</li>)}
                    </ul>
                ))}
            {modifiedPackages.removed.length > 0 &&
                accordionItem("def-removed-packages", _("Removed Packages"), (
                    <ul className='flow-list'>
                        {modifiedPackages.removed.map((item, n) => <li key={n}>{item.name}</li>)}
                    </ul>
                ))}

            {modifiedFiles.modified.length > 0 &&
                accordionItem("def-modified-files", _("Modified Files"), (
                    <ul className='flow-list'>
                        {modifiedFiles.modified.map(item => {
                            if (!item.file_diff) {
                                return <li key={item.path}>{item.path} </li>;
                            }
                            return <li key={item.path}><a onClick={() => Dialogs.show(<DiffDialog file={item.path} diff={item.file_diff} />)}>{item.path}</a> </li>;
                        })}
                    </ul>
                ))}
            {modifiedFiles.added.length > 0 &&
                accordionItem("def-added-files", _("Added Files"), (
                    <ul className='flow-list'>
                        {modifiedFiles.added.map((item, n) => <li key={n}>{item.path}</li>)}
                    </ul>
                ))}
            {modifiedFiles.removed.length > 0 &&
                accordionItem("def-removed-files", _("Removed Files"), (
                    <ul className='flow-list'>
                        {modifiedFiles.removed.map((item, n) => <li key={n}>{item.path}</li>)}
                    </ul>
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
                            load
                        />
                    </CardBody>
                </Card>
            </PageSection>
        </>
    );
};

export default SnapshotDiff;

export { SnapshotDiff, SnapshotDiffPage };
