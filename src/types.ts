type Snapshot = {
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
  userdata: any,
};

type Config = {
  config: string,
  subvolume: string,
};

type SndiffPackage = {
  name: string,
  version_from: string,
  version_to: string,
  changelog_diff: string,
};

type SndiffFile = {
  path: string,
  root_path_from: string,
  root_path_to: string,
  size_from: number,
  size_to: number,
  file_type_from: string,
  file_type_to: string,
  file_diff: string,
};

type SnDiffModifiedPackages = {
  updated: SndiffPackage[],
  downgraded: SndiffPackage[],
  added: SndiffPackage[],
  removed: SndiffPackage[],
};

type SndiffModifiedFiles = {
  modified: SndiffFile[],
  added: SndiffFile[],
  removed: SndiffFile[],
};

type SndiffDiff = {
  packages: SnDiffModifiedPackages,
  files: SndiffModifiedFiles,
};
