import cockpit from "cockpit";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { Button, MenuToggle, MenuToggleElement, Modal, ModalBody, ModalHeader, Select, SelectList, SelectOption } from "@patternfly/react-core";
import { useDialogs } from "dialogs";
import { Snapshot } from "./types";

const _ = cockpit.gettext;

const SimpleSelect = ({ children, defaultValue, key, onselect }: { children: ReactNode, defaultValue?: string | number | readonly string[] | undefined, key?: string, onselect?: (event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<string | number | readonly string[]>('Select a value');

    useEffect(() => {
        if (defaultValue)
            setSelected(defaultValue);
    }, [defaultValue]);

    const onToggleClick = () => {
        setIsOpen(!isOpen);
    };

    const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
            ref={toggleRef}
            onClick={onToggleClick}
            isExpanded={isOpen}
            style={
                {
                    width: '200px'
                } as React.CSSProperties
            }
        >
            {selected}
        </MenuToggle>
    );

    const onSelect = (event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
        // eslint-disable-next-line no-console
        if (onselect) {
            onselect(event, value);
        }

        setSelected(value as string);
        setIsOpen(false);
    };

    console.log("Default Value", defaultValue);

    return (
        <Select
            id={key ?? ""}
            key={key}
            isOpen={isOpen}
            selected={selected}
            onSelect={onSelect}
            onOpenChange={(isOpen) => setIsOpen(isOpen)}
            toggle={toggle}
            defaultValue={defaultValue}
            shouldFocusToggleOnSelect
        >
            <SelectList>
                {children}
            </SelectList>
        </Select>
    );
};

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
            onClose={() => Dialogs.close()}
            isOpen
        >
            <ModalHeader title={_("Compare Snapshots")} />
            <ModalBody>
                <SimpleSelect key="first-snapshot" defaultValue={firstSelect ?? undefined} onselect={(_, value) => setFirstSelect(Number(value))}>
                    {snapshots.map((snapshot) =>
                        <SelectOption key={snapshot.number} value={snapshot.number}>{snapshot.number}</SelectOption>)}
                </SimpleSelect>
                With
                <SimpleSelect key="second-snapshot" defaultValue={secondSelect ?? undefined} onselect={(_, value) => setSecondSelect(Number(value))}>
                    {snapshots.map((snapshot) =>
                        <SelectOption key={snapshot.number} value={snapshot.number}>{snapshot.number}</SelectOption>)}
                </SimpleSelect>
                <Button
                    isDisabled={firstSelect === null || secondSelect === null}
                    onClick={compareSnapshots}
                >{_("Compare Snapshots")}
                </Button>
            </ModalBody>
        </Modal>
    );
};
