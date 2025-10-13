export type Snapshot = {
  subvolume: string,
  number: number,
  default: boolean,
  active: boolean,
  type: "single" | "pre" | "post",
  "pre-number": null | number,
  date: string,
  user: string,
  cleanup: "number" | "timeline" | "empty-pre-post",
  description: string,
  userdata: Map<string, boolean | string | number>,
};

export type Config = {
  config: string,
  subvolume: string,
};

export type SndiffPackage = {
  name: string,
  version_from: string,
  version_to: string,
  changelog_diff: string,
};

export type SndiffFile = {
  path: string,
  root_path_from: string,
  root_path_to: string,
  size_from: number,
  size_to: number,
  file_type_from: string,
  file_type_to: string,
  file_diff: string,
};

export type SnDiffModifiedPackages = {
  updated: SndiffPackage[],
  downgraded: SndiffPackage[],
  added: SndiffPackage[],
  removed: SndiffPackage[],
};

export type SndiffModifiedFiles = {
  modified: SndiffFile[],
  added: SndiffFile[],
  removed: SndiffFile[],
};

export type SndiffDiff = {
  packages: SnDiffModifiedPackages,
  files: SndiffModifiedFiles,
};
