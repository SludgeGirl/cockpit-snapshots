/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DropdownItem, Page, PageSection, PageSidebar } from '@patternfly/react-core';
import { Card, CardBody, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";

import { WithDialogs } from 'dialogs';
import cockpit from 'cockpit';
import { fsinfo } from 'cockpit/fsinfo';
import { KebabDropdown } from "cockpit-components-dropdown";
import { ListingTable, ListingTableRowProps } from "cockpit-components-table.jsx";

import { SnapshotDiff } from './snapshot_diff';
import { Config, Snapshot } from './types';

const _ = cockpit.gettext;

export const Application = () => {
    const [snapperConfigs, setSnapperConfigs] = useState<Config[]>([]);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [snapshotsPaired, setSnapshotsPaired] = useState<([Snapshot, Snapshot] | [Snapshot])[]>([]);
    const [hasSndiff, setHasSndiff] = useState<boolean>(false);

    useEffect(() => {
        cockpit.spawn(["snapper", "--json", "list-configs"], { err: "message" }).then((output: string) => {
            const jsonout = JSON.parse(output);
            setSnapperConfigs(jsonout.configs.map((config: Config) => {
                return {
                    config: config.config,
                    subvolume: config.subvolume,
                };
            }));
        });
        cockpit.spawn(["snapper", "--json", "--no-dbus", "list", "--disable-used-space"], { err: "message", superuser: "require" }).then((output) => {
            const jsonout = JSON.parse(output);
            setSnapshots(jsonout.root);
        });
        fsinfo("/usr/bin/sndiff", []).then(() => setHasSndiff(true))
                        .catch(() => setHasSndiff(false));
    }, [setSnapperConfigs, setSnapshots, setHasSndiff]);

    useMemo(() => {
        const paired_snapshots: ([Snapshot, Snapshot] | [Snapshot])[] = [];
        snapshots.map(snapshot => {
            if (snapshot["pre-number"] && paired_snapshots[snapshot["pre-number"]]) {
                paired_snapshots[snapshot["pre-number"]].push(snapshot);
            } else {
                paired_snapshots[(snapshot["pre-number"] ? snapshot["pre-number"] : snapshot.number)] = [snapshot];
            }
            return snapshot;
        });

        setSnapshotsPaired(paired_snapshots);
    }, [snapshots, setSnapshotsPaired]);

    const rollback = useCallback((snapshot: number) => {
        console.log("rolling back to", snapshot);
        cockpit.spawn(["snapper", "--json", "rollback", snapshot.toString()], { err: "message", superuser: "require" }).then((output: string) => {
            console.log(output);
        })
                        .catch(err => console.log("Rollback errored with", err));
    }, []);

    return (
        <WithDialogs>
            <Page sidebar={<PageSidebar isSidebarOpen={false} />}>
                <PageSection>
                    <Card>
                        <CardTitle>Snapshots</CardTitle>
                        <CardBody>
                            <ListingTable
                                columns={[
                                    { title: "Config" },
                                    { title: "Subvolume" },
                                ]} rows={snapperConfigs.map(config => {
                                    return {
                                        columns: [
                                            {
                                                title: config.config,
                                            },
                                            {
                                                title: config.subvolume,
                                            },
                                        ],
                                        props: { key: config.config }
                                    };
                                })}
                            />

                            <ListingTable
                                columns={[
                                    { title: "ID" },
                                    { title: "Type" },
                                    { title: "Date" },
                                    { title: "Description" },
                                    { title: "User Data" },
                                    { title: "Actions" },
                                ]} rows={snapshotsPaired.reduce((reduced_snapshots: ListingTableRowProps[], pairs: [Snapshot, Snapshot] | [Snapshot]) => {
                                    const actions = (
                                        <KebabDropdown
                                            toggleButtonId="snapshot-actions"
                                            dropdownItems={
                                                pairs[1]
                                                    ? [
                                                        <DropdownItem key={pairs[0].number.toString() + "-rollback-pre"} onClick={() => rollback(pairs[0].number)}>{_("Rollback to pre")}</DropdownItem>,
                                                        <DropdownItem key={pairs[1].number.toString() + "-rollback-post"} onClick={() => rollback(pairs[1].number)}>{_("Rollback to post")}</DropdownItem>
                                                    ]
                                                    : [
                                                        <DropdownItem key={pairs[0].number.toString() + "-rollback-single"} onClick={() => rollback(pairs[0].number)}>{_("Rollback to snapshot")}</DropdownItem>,
                                                    ]
                                            }
                                        />
                                    );

                                    if (pairs[1]) {
                                        const pre = pairs[0];
                                        const post = pairs[1];
                                        const element: ListingTableRowProps = {
                                            columns: [
                                                {
                                                    title: pre.number + " - " + post.number + (post.active && post.default ? " (Active + Default)" : post.active ? " (Active)" : post.default ? " (Default)" : ""),
                                                },
                                                {
                                                    title: pre.type + " - " + post.type,
                                                },
                                                {
                                                    title: pre.date,
                                                },
                                                {
                                                    title: pre.description,
                                                },
                                                {
                                                    title: JSON.stringify(pre.userdata),
                                                },
                                                {
                                                    title: actions,
                                                    props: { className: "pf-v6-c-table__action" }
                                                }
                                            ],
                                            props: { key: pre.number + "-" + post.number },
                                        };
                                        if (hasSndiff) {
                                            element.expandedContent = <SnapshotDiff pre_snapshot={pre.number} post_snapshot={post.number} />;
                                        }
                                        reduced_snapshots.push(element);
                                    } else {
                                        const snapshot = pairs[0];
                                        reduced_snapshots.push({
                                            columns: [
                                                {
                                                    title: snapshot.number + (snapshot.active && snapshot.default ? " (Active + Default)" : snapshot.active ? " (Active)" : snapshot.default ? " (Default)" : ""),
                                                },
                                                {
                                                    title: snapshot.type,
                                                },
                                                {
                                                    title: snapshot.date,
                                                },
                                                {
                                                    title: snapshot.description,
                                                },
                                                {
                                                    title: JSON.stringify(snapshot.userdata),
                                                },
                                                {
                                                    title: actions,
                                                    props: { className: "pf-v6-c-table__action" }
                                                }
                                            ],
                                            props: { key: snapshot.number }
                                        });
                                    }
                                    return reduced_snapshots;
                                }, [])}
                            />
                        </CardBody>
                    </Card>
                </PageSection>
            </Page>
        </WithDialogs>
    );
};
