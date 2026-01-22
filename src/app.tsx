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
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [snapshotsPaired, setSnapshotsPaired] = useState<([Snapshot, Snapshot] | [Snapshot])[]>([]);
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
        cockpit.spawn(["snapper", "--json", "--no-dbus", "list", "--disable-used-space"], { err: "message", superuser: "require" }).then((output) => {
            const jsonout = JSON.parse(output);
            setSnapshots(jsonout.root);
        });
    }, [snapperConfigs]);

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
            {cockpitLocation.options.snapshot1 && cockpitLocation.options.snapshot2
                ? (
                    <SnapshotDiffPage
                        snapshot1={parseInt(String(cockpitLocation.options.snapshot1))}
                        snapshot2={parseInt(String(cockpitLocation.options.snapshot2))}
                        snapshots={snapshots}
                    />
                )
                : <DashboardPage hasSndiff={hasSndiff} snapperConfigs={snapperConfigs} snapshots={snapshots} snapshotsPaired={snapshotsPaired} />}
        </Page>
    );
};
