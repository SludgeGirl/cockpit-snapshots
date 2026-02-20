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
import { Page, PageSidebar } from '@patternfly/react-core';

import cockpit, { Location } from 'cockpit';
import { DashboardPage } from './dashboard';
import { SnapshotDiffPage } from './snapshot_diff';
import { fsinfo } from 'cockpit/fsinfo';
import { Config, Snapshot } from './types';
import { superuser } from "superuser";

superuser.reload_page_on_change();

export const Application = () => {
    const [hasSndiff, setHasSndiff] = useState<boolean>(false);
    const [snapperConfigs, setSnapperConfigs] = useState<Config[]>([]);
    const [snapshots, setSnapshots] = useState<{[key: string]: Snapshot[]}>({});
    const [snapshotsPaired, setSnapshotsPaired] = useState<{[key: string]: ([Snapshot, Snapshot] | [Snapshot])[]}>({});
    const [cockpitLocation, setCockpitLocation] = useState<Location>(cockpit.location);

    const updateConfigs = useCallback(() => {
        cockpit.dbus("org.opensuse.Snapper")
                        .call("/org/opensuse/Snapper", "org.opensuse.Snapper", "ListConfigs")
                        .then((response) => {
                            setSnapperConfigs((response as [[string, string][]])[0]?.map((config: [string, string]): Config => {
                                return {
                                    subvolume: config[1],
                                    config: config[0],
                                };
                            }));
                        });
    }, [setSnapperConfigs]);

    const updateSnapshots = useCallback(() => {
        const newSnapshots: {[key: string]: Snapshot[]} = {};
        snapperConfigs.forEach((config) => {
            console.log(config);
            newSnapshots[config.subvolume] = [];
            cockpit.spawn(["snapper", "-c", config.config, "--json", "--no-dbus", "list", "--disable-used-space"], { err: "message", superuser: "require" }).then((output) => {
                const jsonout: Snapshot[] = JSON.parse(output).root;
                if (jsonout) {
                    newSnapshots[config.subvolume].push(...jsonout);
                }
            });
        });
        console.log("setting snapshots", newSnapshots)
        setSnapshots(newSnapshots);
    }, [snapperConfigs, setSnapshots]);

    useEffect(() => {
        const snapperClient = cockpit.dbus("org.opensuse.Snapper");
        const snapperProxy = snapperClient.proxy();

        updateConfigs();

        const handleSignal = () => {
            updateConfigs();
            updateSnapshots();
        };

        snapperProxy.addEventListener("signal", handleSignal);

        return () => {
            snapperProxy.removeEventListener("signal", handleSignal);
        };
    }, [updateConfigs]);

    useEffect(() => {
        updateSnapshots();
    }, [updateSnapshots, snapperConfigs]);

    useMemo(() => {
        console.log("memo's snapshots", snapshots);
        const paired_snapshots: {[key: string]: ([Snapshot, Snapshot] | [Snapshot])[]} = {};
        snapperConfigs.forEach((config) => {
            console.log("memo's snapshots loop", config.subvolume, snapshots, snapshots[config.subvolume]);
            paired_snapshots[config.subvolume] = [];
            console.log("Pairing for config " + config.subvolume, snapshots[config.subvolume]);
            let snapshot;
            console.log("meowing?", (snapshots[config.subvolume] || []), (snapshots[config.subvolume] || []).length)
            if ((snapshots[config.subvolume] || []).length > 0) {
                console.log("Running for")
                for (snapshot of snapshots[config.subvolume]) {
                    console.log("Attempting to pair for snapshot", snapshot);
                    if (snapshot["pre-number"] && paired_snapshots[config.subvolume][snapshot["pre-number"]]) {
                        paired_snapshots[config.subvolume][snapshot["pre-number"]].push(snapshot);
                    } else {
                        paired_snapshots[config.subvolume][(snapshot["pre-number"] ? snapshot["pre-number"] : snapshot.number)] = [snapshot];
                    }
                    console.log("paired", paired_snapshots);
                }
            }
        });

        console.log("Finished pairing", paired_snapshots)
        setSnapshotsPaired(paired_snapshots);
    }, [snapshots, setSnapshotsPaired, snapperConfigs]);

    useEffect(() => console.log("paired changed", snapshotsPaired), [snapshotsPaired]);

    const onNavigate = useCallback(() => {
        setCockpitLocation(cockpit.location);
    }, [setCockpitLocation]);

    useEffect(() => {
        fsinfo("/usr/bin/sndiff", []).then(() => setHasSndiff(true))
                        .catch(() => setHasSndiff(false));
        cockpit.addEventListener("locationchanged", onNavigate);
    }, []);

    return (
        <Page sidebar={<PageSidebar isSidebarOpen={false} />}>
            {cockpitLocation.options.snapshot1 && cockpitLocation.options.snapshot2 && cockpitLocation.options.subvolume
                ? snapperConfigs.map((config) => {
                    return (
                        <SnapshotDiffPage
                            key={"snapshot-diff-" + config.subvolume}
                            snapshot1={parseInt(String(cockpitLocation.options.snapshot1))}
                            snapshot2={parseInt(String(cockpitLocation.options.snapshot2))}
                            snapshots={snapshots}
                            config={config}
                        />
                    );
                })
                : <DashboardPage hasSndiff={hasSndiff} snapperConfigs={snapperConfigs} snapshots={snapshots} snapshotsPaired={snapshotsPaired} />}
        </Page>
    );
};
