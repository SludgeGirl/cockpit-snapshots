import cockpit from "cockpit";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Flex, FlexItem, Modal, ModalBody, ModalHeader, Stack, StackItem } from "@patternfly/react-core";
import { useDialogs } from "dialogs";
import { Snapshot } from "./types";
import { SimpleSelect } from "cockpit-components-simple-select";

const _ = cockpit.gettext;

export const CompareDialog = ({ snapshots }: { snapshots: Snapshot[] }) => {
    const Dialogs = useDialogs();

    const [firstSelect, setFirstSelect] = useState<null | number>(null);
    const [secondSelect, setSecondSelect] = useState<null | number>(null);
    const compareSnapshots = useCallback(() => {
        if (firstSelect === null || secondSelect === null) {
            return;
        }

        cockpit.location.go(cockpit.location.path, { snapshot1: firstSelect.toString(), snapshot2: secondSelect.toString() });
        Dialogs.close();
    }, [Dialogs, firstSelect, secondSelect]);

    useEffect(() => {
        if (cockpit.location.options.snapshot1)
            setFirstSelect(parseInt(String(cockpit.location.options.snapshot1)));
        if (cockpit.location.options.snapshot2)
            setSecondSelect(parseInt(String(cockpit.location.options.snapshot2)));
    }, []);

    return (
        <Modal
            variant="medium"
            position="top"
            onClose={() => Dialogs.close()}
            isOpen
        >
            <ModalHeader title={_("Compare Snapshots")} />
            <ModalBody>
                <Stack hasGutter>
                    <StackItem>
                        <Flex>
                            <FlexItem>
                                <SimpleSelect
                                    key="first-snapshot"
                                    placeholder={_("Please select a value")}
                                    onSelect={(value) => setFirstSelect(Number(value))}
                                    options={snapshots.map((snapshot) => ({ value: snapshot.number, content: snapshot.number }))}
                                    selected={firstSelect ?? undefined}
                                />
                            </FlexItem>
                            <FlexItem>
                                <p>{_("With")}</p>
                            </FlexItem>
                            <FlexItem>
                                <SimpleSelect
                                    key="second-snapshot"
                                    placeholder={_("Please select a value")}
                                    onSelect={(value) => setSecondSelect(Number(value))}
                                    options={snapshots.map((snapshot) => ({ value: snapshot.number, content: snapshot.number }))}
                                    selected={secondSelect ?? undefined}
                                />
                            </FlexItem>
                        </Flex>
                    </StackItem>
                    <StackItem>
                        <Button
                            isDisabled={firstSelect === null || secondSelect === null}
                            onClick={compareSnapshots}
                        >{_("Compare Snapshots")}
                        </Button>
                    </StackItem>
                </Stack>
            </ModalBody>
        </Modal>
    );
};
